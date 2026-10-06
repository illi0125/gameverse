import 'dotenv/config';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync } from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import type { Collection, Db, ObjectId } from 'mongodb';
import {
	GameGenre,
	GameMode,
	GamePlatform,
	GameStatus,
	GameType,
} from '../apps/gameverse-api/src/libs/enums/game.enum';
import { normalizeGameSlug, validateGamePricing } from '../apps/gameverse-api/src/components/game/game.service';

type Mode = 'dry-run' | 'apply' | 'verify' | 'rollback';

interface RequirementManifest {
	platform: GamePlatform;
	minimum: string;
	recommended?: string;
}

export interface GameEnrichment {
	gameStatus: GameStatus;
	gameType: GameType;
	gameDeveloper: string;
	gamePublisher: string;
	gameOverview: string;
	gameReleaseDate: string;
	gamePlatforms: GamePlatform[];
	gameGenres: GameGenre[];
	gameModes: GameMode[];
	gameVideos: string[];
	gameSystemRequirements: RequirementManifest[];
	gamePrice?: number;
	gameDiscountPrice?: number;
	gameDescription?: string;
}

export interface LegacyProperty {
	_id: ObjectId;
	memberId: ObjectId;
	propertyTitle: string;
	propertyDesc?: string;
	propertyPrice: number;
	propertyImages: string[];
	propertyViews?: number;
	propertyLikes?: number;
	propertyComments?: number;
	deletedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

export interface MigratedGame {
	_id: ObjectId;
	memberId: ObjectId;
	gameStatus: GameStatus;
	gameType: GameType;
	gameTitle: string;
	gameSlug: string;
	gameDescription: string;
	gameOverview: string;
	gameReleaseDate: Date;
	gameDeveloper: string;
	gamePublisher: string;
	gamePlatforms: GamePlatform[];
	gameGenres: GameGenre[];
	gameModes: GameMode[];
	gamePrice: number;
	gameDiscountPrice: number;
	gameImages: string[];
	gameVideos: string[];
	gameSystemRequirements: RequirementManifest[];
	gameRatings: number;
	gameReviews: number;
	gameComments: number;
	gameViews: number;
	gameLikes: number;
	gameRank: number;
	isFeatured: boolean;
	deletedAt?: Date;
	createdAt: Date;
	updatedAt: Date;
}

interface MigrationMarker {
	_id: string;
	status: 'in-progress' | 'applied';
	appliedAt: Date;
	backupCollections: Record<string, string>;
	indexes: Record<string, Array<{ key: Record<string, number>; name?: string; unique?: boolean; sparse?: boolean }>>;
	copiedUploadFiles: string[];
}

const MIGRATION_ID = 'property-to-game-v1';
const SOURCE_COLLECTIONS = ['properties', 'members', 'likes', 'views', 'comments', 'notifications'] as const;
const MARKER_COLLECTION = '_gameverseMigrations';

function parseArguments(): { mode: Mode; manifestPath?: string } {
	const args = process.argv.slice(2);
	if (args.includes('--help')) {
		console.log('Usage: npm run migrate:games -- [--dry-run|--apply|--verify|--rollback] --manifest <file>');
		process.exit(0);
	}
	const modes = args.filter((arg) => ['--dry-run', '--apply', '--verify', '--rollback'].includes(arg));
	if (modes.length > 1) throw new Error('Choose exactly one migration mode');
	const mode = (modes[0]?.slice(2) ?? 'dry-run') as Mode;
	const manifestIndex = args.indexOf('--manifest');
	return { mode, manifestPath: manifestIndex >= 0 ? args[manifestIndex + 1] : undefined };
}

function loadManifest(manifestPath?: string): Record<string, GameEnrichment> {
	if (!manifestPath) throw new Error('--manifest is required for dry-run and apply modes');
	const resolved = path.resolve(manifestPath);
	return JSON.parse(readFileSync(resolved, 'utf8')) as Record<string, GameEnrichment>;
}

function requireDatabase(): Db {
	if (!mongoose.connection.db) throw new Error('MongoDB connection was not established');
	return mongoose.connection.db;
}

function assertEnumArray<T extends string>(name: string, values: T[], allowed: object): void {
	if (!Array.isArray(values) || values.length === 0) throw new Error(`${name} must be a non-empty array`);
	const allowedValues = new Set(Object.values(allowed));
	if (values.some((value) => !allowedValues.has(value))) throw new Error(`${name} contains an unsupported value`);
}

export function validateEnrichment(id: string, source: LegacyProperty, enrichment?: GameEnrichment): void {
	if (!enrichment) throw new Error(`Missing enrichment manifest entry for ${id}`);
	if (!Object.values(GameStatus).includes(enrichment.gameStatus)) throw new Error(`Invalid gameStatus for ${id}`);
	if (!Object.values(GameType).includes(enrichment.gameType)) throw new Error(`Invalid gameType for ${id}`);
	for (const field of ['gameDeveloper', 'gamePublisher', 'gameOverview', 'gameReleaseDate'] as const) {
		if (!enrichment[field]) throw new Error(`Missing ${field} for ${id}`);
	}
	assertEnumArray('gamePlatforms', enrichment.gamePlatforms, GamePlatform);
	assertEnumArray('gameGenres', enrichment.gameGenres, GameGenre);
	assertEnumArray('gameModes', enrichment.gameModes, GameMode);
	if (!Array.isArray(enrichment.gameVideos) || !Array.isArray(enrichment.gameSystemRequirements)) {
		throw new Error(`Videos and system requirements must be arrays for ${id}`);
	}
	for (const requirement of enrichment.gameSystemRequirements) {
		if (!enrichment.gamePlatforms.includes(requirement.platform) || !requirement.minimum) {
			throw new Error(`Invalid system requirement for ${id}`);
		}
	}
	const gamePrice = enrichment.gamePrice ?? source.propertyPrice;
	validateGamePricing(enrichment.gameType, gamePrice, enrichment.gameDiscountPrice ?? 0);
	if (!source.propertyTitle || !source.memberId || !source.propertyImages?.length) {
		throw new Error(`Legacy document ${id} is missing title, owner, or images`);
	}
}

async function validateSocialDuplicates(db: Db): Promise<void> {
	for (const [collectionName, groupField, refField] of [
		['likes', 'likeGroup', 'likeRefId'],
		['views', 'viewGroup', 'viewRefId'],
	] as const) {
		const duplicate = await db
			.collection(collectionName)
			.aggregate([
				{
					$group: {
						_id: { memberId: '$memberId', group: `$${groupField}`, refId: `$${refField}` },
						count: { $sum: 1 },
					},
				},
				{ $match: { count: { $gt: 1 } } },
				{ $limit: 1 },
			])
			.next();
		if (duplicate) throw new Error(`Duplicate ${collectionName} records must be resolved before migration`);
	}
}

async function preflight(db: Db, manifest: Record<string, GameEnrichment>): Promise<LegacyProperty[]> {
	const properties = await db.collection<LegacyProperty>('properties').find({}).toArray();
	for (const property of properties) validateEnrichment(String(property._id), property, manifest[String(property._id)]);
	const extraIds = Object.keys(manifest).filter((id) => !properties.some((property) => String(property._id) === id));
	if (extraIds.length) throw new Error(`Manifest contains unknown Property ids: ${extraIds.join(', ')}`);
	await validateSocialDuplicates(db);
	return properties;
}

async function snapshotCollection(db: Db, sourceName: string, backupName: string): Promise<void> {
	const existing = await db.listCollections({ name: backupName }).hasNext();
	if (existing) return;
	const documents = await db.collection(sourceName).find({}).toArray();
	await db.createCollection(backupName);
	if (documents.length) await db.collection(backupName).insertMany(documents);
}

async function snapshotIndexes(db: Db, collectionName: string): Promise<MigrationMarker['indexes'][string]> {
	if (!(await db.listCollections({ name: collectionName }).hasNext())) return [];
	const indexes = await db.collection(collectionName).indexes();
	return indexes
		.filter((index) => index.name !== '_id_')
		.map((index) => ({
			key: index.key as Record<string, number>,
			name: index.name,
			unique: index.unique,
			sparse: index.sparse,
		}));
}

export function rewriteUploadPath(value: string): string {
	return value.replace(/^uploads\/property\//, 'uploads/game/');
}

export function buildGames(properties: LegacyProperty[], manifest: Record<string, GameEnrichment>): MigratedGame[] {
	const slugCounts = new Map<string, number>();
	return properties.map((property) => {
		const enrichment = manifest[String(property._id)];
		const baseSlug = normalizeGameSlug(property.propertyTitle);
		const count = (slugCounts.get(baseSlug) ?? 0) + 1;
		slugCounts.set(baseSlug, count);
		return {
			_id: property._id,
			gameStatus: enrichment.gameStatus,
			gameType: enrichment.gameType,
			gameTitle: property.propertyTitle,
			gameSlug: count === 1 ? baseSlug : `${baseSlug}-${count}`,
			gameDescription: enrichment.gameDescription ?? property.propertyDesc ?? property.propertyTitle,
			gameOverview: enrichment.gameOverview,
			gameReleaseDate: new Date(enrichment.gameReleaseDate),
			gameDeveloper: enrichment.gameDeveloper,
			gamePublisher: enrichment.gamePublisher,
			gameGenres: enrichment.gameGenres,
			gamePlatforms: enrichment.gamePlatforms,
			gameModes: enrichment.gameModes,
			gamePrice: enrichment.gamePrice ?? property.propertyPrice,
			gameDiscountPrice: enrichment.gameDiscountPrice ?? 0,
			gameImages: property.propertyImages.map(rewriteUploadPath),
			gameVideos: enrichment.gameVideos,
			gameSystemRequirements: enrichment.gameSystemRequirements,
			gameRatings: 0,
			gameReviews: 0,
			gameComments: property.propertyComments ?? 0,
			gameViews: property.propertyViews ?? 0,
			gameLikes: property.propertyLikes ?? 0,
			gameRank: 0,
			memberId: property.memberId,
			isFeatured: false,
			deletedAt: enrichment.gameStatus === GameStatus.DELETE ? (property.deletedAt ?? new Date()) : undefined,
			createdAt: property.createdAt,
			updatedAt: property.updatedAt,
		};
	});
}

function copyLegacyUploads(): string[] {
	const source = path.resolve('uploads/property');
	const destination = path.resolve('uploads/game');
	if (!existsSync(source)) return [];
	mkdirSync(destination, { recursive: true });
	const copied: string[] = [];
	for (const entry of readdirSync(source, { withFileTypes: true })) {
		if (!entry.isFile()) continue;
		const target = path.join(destination, entry.name);
		if (!existsSync(target)) {
			cpSync(path.join(source, entry.name), target);
			copied.push(target);
		}
	}
	return copied;
}

async function replaceSocialIndexes(db: Db): Promise<void> {
	for (const [collectionName, expectedKey, newKey] of [
		['likes', { memberId: 1, likeRefId: 1 }, { memberId: 1, likeGroup: 1, likeRefId: 1 }],
		['views', { memberId: 1, viewRefId: 1 }, { memberId: 1, viewGroup: 1, viewRefId: 1 }],
	] as const) {
		const collection = db.collection(collectionName);
		for (const index of await collection.indexes()) {
			if (JSON.stringify(index.key) === JSON.stringify(expectedKey)) await collection.dropIndex(index.name!);
		}
		await collection.createIndex(newKey, { unique: true });
	}
}

async function reconcileCounters(db: Db): Promise<void> {
	await db.collection('games').updateMany({}, { $set: { gameLikes: 0, gameViews: 0, gameComments: 0 } });
	for (const [collectionName, refField, counter] of [
		['likes', 'likeRefId', 'gameLikes'],
		['views', 'viewRefId', 'gameViews'],
		['comments', 'commentRefId', 'gameComments'],
	] as const) {
		const counts = await db
			.collection(collectionName)
			.aggregate<{ _id: ObjectId; total: number }>([
				{ $match: { [`${collectionName.slice(0, -1)}Group`]: 'GAME' } },
				{ $group: { _id: `$${refField}`, total: { $sum: 1 } } },
			])
			.toArray();
		for (const count of counts)
			await db.collection('games').updateOne({ _id: count._id }, { $set: { [counter]: count.total } });
	}
	await db.collection('members').updateMany({}, { $set: { memberGames: 0 } });
	const owners = await db
		.collection('games')
		.aggregate<{ _id: ObjectId; total: number }>([
			{ $match: { gameStatus: { $ne: GameStatus.DELETE } } },
			{ $group: { _id: '$memberId', total: { $sum: 1 } } },
		])
		.toArray();
	for (const owner of owners)
		await db.collection('members').updateOne({ _id: owner._id }, { $set: { memberGames: owner.total } });
}

async function applyMigration(db: Db, manifest: Record<string, GameEnrichment>): Promise<void> {
	const markers = db.collection<MigrationMarker>(MARKER_COLLECTION);
	const existingMarker = await markers.findOne({ _id: MIGRATION_ID });
	if (existingMarker?.status === 'applied') {
		console.log('Migration is already applied; running verification only.');
		await verifyMigration(db);
		return;
	}
	if (existingMarker) throw new Error('A previous apply stopped mid-migration; run --rollback before retrying');
	const properties = await preflight(db, manifest);
	if (await db.collection('games').countDocuments())
		throw new Error('games must be empty before the initial migration');

	const backupCollections: Record<string, string> = {};
	const indexes: MigrationMarker['indexes'] = {};
	for (const collectionName of SOURCE_COLLECTIONS) {
		if (!(await db.listCollections({ name: collectionName }).hasNext())) continue;
		const backupName = `${MIGRATION_ID.replaceAll('-', '_')}_${collectionName}`;
		backupCollections[collectionName] = backupName;
		indexes[collectionName] = await snapshotIndexes(db, collectionName);
		await snapshotCollection(db, collectionName, backupName);
	}

	await markers.insertOne({
		_id: MIGRATION_ID,
		status: 'in-progress',
		appliedAt: new Date(),
		backupCollections,
		indexes,
		copiedUploadFiles: [],
	});

	const games = buildGames(properties, manifest);
	if (games.length) await db.collection('games').insertMany(games);
	await db.collection('likes').updateMany({ likeGroup: 'PROPERTY' }, { $set: { likeGroup: 'GAME' } });
	await db.collection('views').updateMany({ viewGroup: 'PROPERTY' }, { $set: { viewGroup: 'GAME' } });
	await db.collection('comments').updateMany({ commentGroup: 'PROPERTY' }, { $set: { commentGroup: 'GAME' } });
	if (await db.listCollections({ name: 'notifications' }).hasNext()) {
		await db
			.collection('notifications')
			.updateMany({ notificationGroup: 'PROPERTY' }, { $set: { notificationGroup: 'GAME' } });
		await db
			.collection('notifications')
			.updateMany({ propertyId: { $exists: true } }, { $rename: { propertyId: 'gameId' } });
	}
	await db
		.collection('members')
		.updateMany({ memberProperties: { $exists: true } }, { $rename: { memberProperties: 'memberGames' } });
	await replaceSocialIndexes(db);
	const copiedUploadFiles = copyLegacyUploads();
	await markers.updateOne({ _id: MIGRATION_ID }, { $set: { copiedUploadFiles } });
	await reconcileCounters(db);
	await db.collection('games').createIndex({ gameSlug: 1 }, { unique: true });
	await markers.updateOne({ _id: MIGRATION_ID }, { $set: { status: 'applied', appliedAt: new Date() } });
	await verifyMigration(db);
}

async function verifyMigration(db: Db): Promise<void> {
	const sourceCount = await db.collection('properties').countDocuments();
	const gameCount = await db.collection('games').countDocuments();
	if (sourceCount !== gameCount)
		throw new Error(`Verification failed: ${sourceCount} properties but ${gameCount} games`);
	const legacySocial = await Promise.all([
		db.collection('likes').countDocuments({ likeGroup: 'PROPERTY' }),
		db.collection('views').countDocuments({ viewGroup: 'PROPERTY' }),
		db.collection('comments').countDocuments({ commentGroup: 'PROPERTY' }),
	]);
	if (legacySocial.some(Boolean)) throw new Error('Verification failed: legacy social group values remain');
	if (await db.collection('members').countDocuments({ memberProperties: { $exists: true } })) {
		throw new Error('Verification failed: memberProperties remains');
	}
	const invalidGame = await db.collection('games').findOne({
		$or: [
			{ gameSlug: { $exists: false } },
			{ gameGenres: { $size: 0 } },
			{ gamePlatforms: { $size: 0 } },
			{ gameModes: { $size: 0 } },
			{ gameImages: { $size: 0 } },
		],
	});
	if (invalidGame) throw new Error(`Verification failed for Game ${String(invalidGame._id)}`);
	console.log(`Verified ${gameCount} games and all related social/member references.`);
}

async function restoreCollection(db: Db, sourceName: string, backupName: string): Promise<void> {
	const source = db.collection(sourceName);
	await source.deleteMany({});
	const documents = await db.collection(backupName).find({}).toArray();
	if (documents.length) await source.insertMany(documents);
}

async function restoreIndexes(collection: Collection, indexes: MigrationMarker['indexes'][string]): Promise<void> {
	for (const index of await collection.indexes()) if (index.name !== '_id_') await collection.dropIndex(index.name!);
	for (const index of indexes)
		await collection.createIndex(index.key, { name: index.name, unique: index.unique, sparse: index.sparse });
}

async function rollbackMigration(db: Db): Promise<void> {
	const markers = db.collection<MigrationMarker>(MARKER_COLLECTION);
	const marker = await markers.findOne({ _id: MIGRATION_ID });
	if (!marker) throw new Error('No applied migration marker was found');
	for (const [sourceName, backupName] of Object.entries(marker.backupCollections)) {
		await restoreCollection(db, sourceName, backupName);
		await restoreIndexes(db.collection(sourceName), marker.indexes[sourceName] ?? []);
	}
	await db
		.collection('games')
		.drop()
		.catch(() => undefined);
	for (const copiedFile of marker.copiedUploadFiles) if (existsSync(copiedFile)) unlinkSync(copiedFile);
	await markers.deleteOne({ _id: MIGRATION_ID });
	console.log('Property-to-Game migration rolled back from snapshots.');
}

async function main(): Promise<void> {
	const { mode, manifestPath } = parseArguments();
	const uri = process.env.NODE_ENV === 'production' ? process.env.MONGO_PROD : process.env.MONGO_DEV;
	if (!uri) throw new Error('MONGO_DEV or MONGO_PROD must be configured');
	await mongoose.connect(uri);
	const db = requireDatabase();
	try {
		if (mode === 'verify') await verifyMigration(db);
		else if (mode === 'rollback') await rollbackMigration(db);
		else {
			const manifest = loadManifest(manifestPath);
			const properties = await preflight(db, manifest);
			console.log(`Preflight passed for ${properties.length} properties; no writes performed.`);
			if (mode === 'apply') await applyMigration(db, manifest);
		}
	} finally {
		await mongoose.disconnect();
	}
}

if (require.main === module) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	});
}

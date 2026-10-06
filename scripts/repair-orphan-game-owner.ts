import 'dotenv/config';
import mongoose, { type ClientSession, type Connection, Types } from 'mongoose';
import { GameStatus } from '../apps/gameverse-api/src/libs/enums/game.enum';
import { MemberStatus, MemberType } from '../apps/gameverse-api/src/libs/enums/member.enum';

export type RepairMode = 'dry-run' | 'apply' | 'verify';

export interface GameOwnerRepairOptions {
	mode: RepairMode;
	gameId: Types.ObjectId;
	memberId: Types.ObjectId;
}

interface GameOwnerDocument {
	_id: Types.ObjectId;
	gameTitle?: string;
	gameStatus?: GameStatus;
	memberId: Types.ObjectId;
}

interface RepairMemberDocument {
	_id: Types.ObjectId;
	memberNick?: string;
	memberType?: MemberType;
	memberStatus?: MemberStatus;
	memberGames?: number | null;
}

interface RepairInspection {
	game: GameOwnerDocument;
	replacementMember: RepairMemberDocument;
	currentOwner: RepairMemberDocument | null;
	ownedGames: number;
	alreadyAssigned: boolean;
}

function sameId(left: Types.ObjectId, right: Types.ObjectId): boolean {
	return left.toString() === right.toString();
}

async function inspectRepair(
	connection: Connection,
	options: GameOwnerRepairOptions,
	session?: ClientSession,
): Promise<RepairInspection> {
	const games = connection.collection<GameOwnerDocument>('games');
	const members = connection.collection<RepairMemberDocument>('members');
	const queryOptions = session ? { session } : undefined;
	const game = await games.findOne({ _id: options.gameId }, queryOptions);
	if (!game) throw new Error(`Game ${options.gameId.toString()} was not found`);
	if (game.gameStatus === GameStatus.DELETE) throw new Error('Deleted games cannot be reassigned by this repair');

	const replacementMember = await members.findOne({ _id: options.memberId }, queryOptions);
	if (!replacementMember) throw new Error(`Replacement member ${options.memberId.toString()} was not found`);
	if (replacementMember.memberType !== MemberType.AGENT || replacementMember.memberStatus !== MemberStatus.ACTIVE) {
		throw new Error('Replacement member must be an active AGENT');
	}

	const alreadyAssigned = sameId(game.memberId, options.memberId);
	const currentOwner = alreadyAssigned
		? replacementMember
		: await members.findOne({ _id: game.memberId }, queryOptions);
	if (!alreadyAssigned && currentOwner) throw new Error('Game is not orphaned; its current owner still exists');

	const ownedGames = await games.countDocuments(
		{ memberId: options.memberId, gameStatus: { $ne: GameStatus.DELETE } },
		queryOptions,
	);
	return { game, replacementMember, currentOwner, ownedGames, alreadyAssigned };
}

function assertCounterConsistency(inspection: RepairInspection): void {
	const memberGames = inspection.replacementMember.memberGames ?? 0;
	if (memberGames !== inspection.ownedGames) {
		throw new Error(
			`Verification failed: replacement member has memberGames=${memberGames}, but owns ${inspection.ownedGames} active/upcoming games`,
		);
	}
}

function reportInspection(inspection: RepairInspection, mode: RepairMode): void {
	console.log(
		JSON.stringify(
			{
				mode,
				gameId: inspection.game._id,
				gameTitle: inspection.game.gameTitle,
				currentOwnerId: inspection.game.memberId,
				replacementMemberId: inspection.replacementMember._id,
				replacementMemberNick: inspection.replacementMember.memberNick,
				replacementMemberGames: inspection.replacementMember.memberGames ?? 0,
				replacementOwnedGames: inspection.ownedGames,
				alreadyAssigned: inspection.alreadyAssigned,
			},
			null,
			2,
		),
	);
}

export async function runOrphanGameOwnerRepair(connection: Connection, options: GameOwnerRepairOptions): Promise<void> {
	const inspection = await inspectRepair(connection, options);
	reportInspection(inspection, options.mode);

	if (options.mode === 'dry-run') {
		if (!inspection.alreadyAssigned && (inspection.replacementMember.memberGames ?? 0) !== inspection.ownedGames) {
			throw new Error('Replacement memberGames is already inconsistent; reconcile counters before reassignment');
		}
		console.log(
			inspection.alreadyAssigned
				? 'Dry run complete; the game is already assigned and no documents would change.'
				: 'Dry run complete; the orphan game would be reassigned and memberGames incremented once.',
		);
		return;
	}

	if (options.mode === 'apply' && !inspection.alreadyAssigned) {
		if ((inspection.replacementMember.memberGames ?? 0) !== inspection.ownedGames) {
			throw new Error('Replacement memberGames is already inconsistent; reconcile counters before reassignment');
		}

		const session = await mongoose.startSession();
		try {
			await session.withTransaction(async () => {
				const current = await inspectRepair(connection, options, session);
				if (current.alreadyAssigned) return;
				if ((current.replacementMember.memberGames ?? 0) !== current.ownedGames) {
					throw new Error('Replacement memberGames changed during repair; retry after reconciling counters');
				}

				const gameUpdate = await connection
					.collection<GameOwnerDocument>('games')
					.updateOne(
						{ _id: options.gameId, memberId: current.game.memberId },
						{ $set: { memberId: options.memberId } },
						{ session },
					);
				if (gameUpdate.modifiedCount !== 1) throw new Error('Game owner changed concurrently; repair was aborted');

				const memberUpdate = await connection.collection<RepairMemberDocument>('members').updateOne(
					{
						_id: options.memberId,
						memberType: MemberType.AGENT,
						memberStatus: MemberStatus.ACTIVE,
					},
					{ $inc: { memberGames: 1 } },
					{ session },
				);
				if (memberUpdate.modifiedCount !== 1)
					throw new Error('Replacement member changed concurrently; repair was aborted');
			});
		} finally {
			await session.endSession();
		}
	}

	const verified = await inspectRepair(connection, options);
	if (!verified.alreadyAssigned) throw new Error('Verification failed: game owner was not updated');
	assertCounterConsistency(verified);
	console.log('Verified: game owner exists, is an active AGENT, and memberGames is consistent.');
}

function readArgument(args: string[], name: string): string | undefined {
	const index = args.indexOf(name);
	return index === -1 ? undefined : args[index + 1];
}

export function parseRepairArguments(args: string[]): GameOwnerRepairOptions | 'help' {
	if (args.includes('--help')) return 'help';
	const selected = args.filter((arg) => ['--dry-run', '--apply', '--verify'].includes(arg));
	if (selected.length > 1) throw new Error('Choose only one of --dry-run, --apply, or --verify');

	const gameId = readArgument(args, '--game-id');
	const memberId = readArgument(args, '--member-id');
	if (!gameId || !memberId) throw new Error('--game-id and --member-id are required');
	if (!Types.ObjectId.isValid(gameId) || !Types.ObjectId.isValid(memberId)) {
		throw new Error('--game-id and --member-id must be valid MongoDB ObjectIds');
	}

	return {
		mode: (selected[0]?.slice(2) ?? 'dry-run') as RepairMode,
		gameId: new Types.ObjectId(gameId),
		memberId: new Types.ObjectId(memberId),
	};
}

async function main(): Promise<void> {
	const options = parseRepairArguments(process.argv.slice(2));
	if (options === 'help') {
		console.log('Usage: npm run repair:game-owner -- [--dry-run|--apply|--verify] --game-id <id> --member-id <id>');
		return;
	}

	const uri = process.env.NODE_ENV === 'production' ? process.env.MONGO_PROD : process.env.MONGO_DEV;
	if (!uri) throw new Error('MONGO_DEV or MONGO_PROD must be configured');
	await mongoose.connect(uri);
	try {
		await runOrphanGameOwnerRepair(mongoose.connection, options);
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

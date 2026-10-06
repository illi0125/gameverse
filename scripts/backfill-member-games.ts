import 'dotenv/config';
import mongoose, { type Model } from 'mongoose';

type Mode = 'dry-run' | 'apply' | 'verify';

export interface LegacyMemberCounters {
	memberGames?: number | null;
	memberProperties?: number | null;
}

export const missingMemberGamesFilter = {
	$or: [{ memberGames: { $exists: false } }, { memberGames: null }],
};

export const memberGamesBackfillPipeline = [
	{
		$set: {
			memberGames: { $ifNull: ['$memberGames', { $ifNull: ['$memberProperties', 0] }] },
		},
	},
];

export function resolveMemberGames(input: LegacyMemberCounters): number {
	return input.memberGames ?? input.memberProperties ?? 0;
}

function parseMode(args: string[]): Mode | 'help' {
	if (args.includes('--help')) return 'help';
	const selected = args.filter((arg) => ['--dry-run', '--apply', '--verify'].includes(arg));
	if (selected.length > 1) throw new Error('Choose only one of --dry-run, --apply, or --verify');
	return (selected[0]?.slice(2) ?? 'dry-run') as Mode;
}

async function report(memberModel: Model<LegacyMemberCounters>): Promise<number> {
	const [total, affected, fromLegacy] = await Promise.all([
		memberModel.countDocuments({}),
		memberModel.countDocuments(missingMemberGamesFilter),
		memberModel.countDocuments({
			$and: [missingMemberGamesFilter, { memberProperties: { $type: 'number' } }],
		}),
	]);
	console.log(
		JSON.stringify(
			{
				totalMembers: total,
				affectedMembers: affected,
				copyFromMemberProperties: fromLegacy,
				defaultToZero: affected - fromLegacy,
			},
			null,
			2,
		),
	);
	return affected;
}

export async function runMemberGamesBackfill(memberModel: Model<LegacyMemberCounters>, mode: Mode): Promise<void> {
	const affectedBefore = await report(memberModel);
	if (mode === 'dry-run') {
		console.log('Dry run complete; no member documents were changed.');
		return;
	}
	if (mode === 'apply' && affectedBefore > 0) {
		const result = await memberModel.updateMany(missingMemberGamesFilter, memberGamesBackfillPipeline);
		console.log(`Backfilled memberGames for ${result.modifiedCount} member documents.`);
	}
	const remaining = await memberModel.countDocuments(missingMemberGamesFilter);
	if (remaining > 0) throw new Error(`Verification failed: ${remaining} members still have no memberGames value`);
	console.log('Verified: every member has a non-null memberGames value.');
}

async function main(): Promise<void> {
	const mode = parseMode(process.argv.slice(2));
	if (mode === 'help') {
		console.log('Usage: npm run migrate:member-games -- [--dry-run|--apply|--verify]');
		return;
	}
	const uri = process.env.NODE_ENV === 'production' ? process.env.MONGO_PROD : process.env.MONGO_DEV;
	if (!uri) throw new Error('MONGO_DEV or MONGO_PROD must be configured');
	await mongoose.connect(uri);
	try {
		const memberModel = mongoose.connection.model<LegacyMemberCounters>(
			'MemberGamesBackfill',
			new mongoose.Schema({}, { strict: false, collection: 'members' }),
		);
		await runMemberGamesBackfill(memberModel, mode);
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

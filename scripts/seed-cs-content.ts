import 'dotenv/config';
import mongoose, { type Model, Types } from 'mongoose';
import { seedFaqs, seedNotices } from './data/cs-content';

type Mode = 'dry-run' | 'apply' | 'verify';

interface NoticeDoc {
	noticeCategory: string;
	noticeStatus: string;
	noticeTopic?: string;
	noticeTitle: string;
	noticeContent: string;
	noticeEvent?: boolean;
	memberId: Types.ObjectId;
	createdAt?: Date;
	updatedAt?: Date;
}

/** One record per seed entry, identified by category + title so re-running never duplicates **/
export function buildSeedDocs(authorId: Types.ObjectId, now = new Date()): NoticeDoc[] {
	const notices: NoticeDoc[] = seedNotices.map((item) => ({
		noticeCategory: 'NOTICE',
		noticeStatus: 'ACTIVE',
		noticeTitle: item.title,
		noticeContent: item.content,
		noticeEvent: Boolean(item.event),
		memberId: authorId,
		createdAt: new Date(`${item.date}T00:00:00.000Z`),
		updatedAt: new Date(`${item.date}T00:00:00.000Z`),
	}));
	// FAQ order inside each topic follows the original list (oldest first = first question)
	const faqs: NoticeDoc[] = seedFaqs.map((item, index) => ({
		noticeCategory: 'FAQ',
		noticeStatus: 'ACTIVE',
		noticeTopic: item.topic,
		noticeTitle: item.title,
		noticeContent: item.content,
		memberId: authorId,
		createdAt: new Date(now.getTime() + index * 1000),
		updatedAt: new Date(now.getTime() + index * 1000),
	}));
	return [...notices, ...faqs];
}

function parseMode(args: string[]): Mode | 'help' {
	if (args.includes('--help')) return 'help';
	const selected = args.filter((arg) => ['--dry-run', '--apply', '--verify'].includes(arg));
	if (selected.length > 1) throw new Error('Choose only one of --dry-run, --apply, or --verify');
	return (selected[0]?.slice(2) ?? 'dry-run') as Mode;
}

async function missingDocs(noticeModel: Model<NoticeDoc>, docs: NoticeDoc[]): Promise<NoticeDoc[]> {
	const existing = await noticeModel
		.find({ $or: docs.map((doc) => ({ noticeCategory: doc.noticeCategory, noticeTitle: doc.noticeTitle })) })
		.select({ noticeCategory: 1, noticeTitle: 1 })
		.lean()
		.exec();
	const seen = new Set(existing.map((doc) => `${doc.noticeCategory}::${doc.noticeTitle}`));
	return docs.filter((doc) => !seen.has(`${doc.noticeCategory}::${doc.noticeTitle}`));
}

export async function runCsSeed(
	noticeModel: Model<NoticeDoc>,
	memberModel: Model<{ memberType: string; memberStatus: string; memberNick: string }>,
	mode: Mode,
): Promise<void> {
	const admin = await memberModel
		.findOne({ memberType: 'ADMIN', memberStatus: 'ACTIVE' })
		.sort({ createdAt: 1 })
		.lean()
		.exec();
	if (!admin) throw new Error('No ACTIVE ADMIN member found to author the seeded content');

	const docs = buildSeedDocs(admin._id as Types.ObjectId);
	const missing = await missingDocs(noticeModel, docs);
	// Notices seeded before the event flag existed only get the flag if they have none yet (admin edits win)
	const eventTitles = seedNotices.filter((item) => item.event).map((item) => item.title);
	const eventFilter = { noticeCategory: 'NOTICE', noticeTitle: { $in: eventTitles }, noticeEvent: { $exists: false } };
	const eventBackfill = eventTitles.length ? await noticeModel.countDocuments(eventFilter) : 0;
	console.log(
		JSON.stringify(
			{
				author: admin.memberNick,
				notices: seedNotices.length,
				faqs: seedFaqs.length,
				alreadyPresent: docs.length - missing.length,
				toInsert: missing.length,
				eventFlagBackfill: eventBackfill,
			},
			null,
			2,
		),
	);

	if (mode === 'dry-run') {
		console.log('Dry run complete; no notices were written.');
		return;
	}
	if (mode === 'apply' && missing.length > 0) {
		// Raw collection insert so the original notice dates are kept as createdAt
		await noticeModel.collection.insertMany(missing);
		console.log(`Inserted ${missing.length} notices/FAQ entries.`);
	}
	if (mode === 'apply' && eventBackfill > 0) {
		const result = await noticeModel.updateMany(eventFilter, { $set: { noticeEvent: true } });
		console.log(`Flagged ${result.modifiedCount} seeded notice(s) as events.`);
	}
	const remaining = await missingDocs(noticeModel, docs);
	if (remaining.length > 0) throw new Error(`Verification failed: ${remaining.length} seed entries are missing`);
	console.log('Verified: every seed entry exists (existing records were left untouched).');
}

async function main(): Promise<void> {
	const mode = parseMode(process.argv.slice(2));
	if (mode === 'help') {
		console.log('Usage: npm run seed:cs -- [--dry-run|--apply|--verify]');
		return;
	}
	const uri = process.env.NODE_ENV === 'production' ? process.env.MONGO_PROD : process.env.MONGO_DEV;
	if (!uri) throw new Error('MONGO_DEV or MONGO_PROD must be configured');
	await mongoose.connect(uri);
	try {
		const noticeModel = mongoose.connection.model<NoticeDoc>(
			'CsSeedNotice',
			new mongoose.Schema({}, { strict: false, collection: 'notices' }),
		);
		const memberModel = mongoose.connection.model<{ memberType: string; memberStatus: string; memberNick: string }>(
			'CsSeedMember',
			new mongoose.Schema({}, { strict: false, collection: 'members' }),
		);
		await runCsSeed(noticeModel, memberModel, mode);
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

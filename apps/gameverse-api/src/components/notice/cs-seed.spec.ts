import { Types } from 'mongoose';
import { buildSeedDocs } from '../../../../../scripts/seed-cs-content';
import { seedFaqs, seedNotices } from '../../../../../scripts/data/cs-content';

describe('CS content seed', () => {
	it('turns the former hardcoded content into ACTIVE notices and topic-tagged FAQ entries', () => {
		const author = new Types.ObjectId();
		const docs = buildSeedDocs(author, new Date('2026-10-09T00:00:00.000Z'));

		expect(docs).toHaveLength(seedNotices.length + seedFaqs.length);
		expect(docs.every((doc) => doc.noticeStatus === 'ACTIVE' && doc.memberId === author)).toBe(true);
		expect(docs.filter((doc) => doc.noticeCategory === 'NOTICE')).toHaveLength(2);
		expect(docs.filter((doc) => doc.noticeCategory === 'FAQ').every((doc) => Boolean(doc.noticeTopic))).toBe(true);
		// original notice dates are kept
		expect(docs[0].createdAt?.toISOString()).toBe('2024-03-01T00:00:00.000Z');
		// the former 'event' highlight survives as noticeEvent
		expect(docs[0].noticeEvent).toBe(true);
		expect(docs[1].noticeEvent).toBe(false);
		// FAQ keeps its original question order
		const faqs = docs.filter((doc) => doc.noticeCategory === 'FAQ');
		expect(faqs[1].createdAt!.getTime()).toBeGreaterThan(faqs[0].createdAt!.getTime());
	});

	it('has unique titles per category so re-running cannot duplicate', () => {
		const docs = buildSeedDocs(new Types.ObjectId());
		const keys = docs.map((doc) => `${doc.noticeCategory}::${doc.noticeTitle}`);
		expect(new Set(keys).size).toBe(keys.length);
	});
});

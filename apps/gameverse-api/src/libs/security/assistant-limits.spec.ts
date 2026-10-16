import { ASSISTANT_PER_MEMBER, AssistantLimitService } from './assistant-limits';

describe('AssistantLimitService', () => {
	const day = Date.UTC(2026, 9, 17, 10);

	it('allows each member a fixed number of questions per hour', () => {
		const limits = new AssistantLimitService();
		for (let i = 0; i < ASSISTANT_PER_MEMBER; i++) expect(limits.allow('m1', 1000, day)).toBe(true);
		expect(limits.allow('m1', 1000, day)).toBe(false);
		expect(limits.allow('m2', 1000, day)).toBe(true);
		expect(limits.allow('m1', 1000, day + 60 * 60 * 1000)).toBe(true);
	});

	it('stops everyone at the daily cap and starts again the next UTC day', () => {
		const limits = new AssistantLimitService();
		expect(limits.allow('m1', 2, day)).toBe(true);
		expect(limits.allow('m2', 2, day)).toBe(true);
		expect(limits.allow('m3', 2, day)).toBe(false);
		expect(limits.allow('m3', 2, day + 24 * 60 * 60 * 1000)).toBe(true);
	});

	it('does not count a question refused by the per-member limit against the daily cap', () => {
		const limits = new AssistantLimitService();
		for (let i = 0; i < ASSISTANT_PER_MEMBER + 5; i++) limits.allow('m1', ASSISTANT_PER_MEMBER + 1, day);
		expect(limits.allow('m2', ASSISTANT_PER_MEMBER + 1, day)).toBe(true);
	});
});

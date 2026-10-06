import {
	memberGamesBackfillPipeline,
	missingMemberGamesFilter,
	resolveMemberGames,
	runMemberGamesBackfill,
} from '../../../../../scripts/backfill-member-games';

describe('memberGames backfill', () => {
	it('copies the legacy counter, defaults to zero, and preserves existing values', () => {
		expect(resolveMemberGames({ memberProperties: 5 })).toBe(5);
		expect(resolveMemberGames({})).toBe(0);
		expect(resolveMemberGames({ memberGames: 0, memberProperties: 9 })).toBe(0);
		expect(resolveMemberGames({ memberGames: 3, memberProperties: 9 })).toBe(3);
	});

	it('dry-run reports without writing', async () => {
		const memberModel = {
			countDocuments: jest.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(2).mockResolvedValueOnce(1),
			updateMany: jest.fn(),
		};
		const log = jest.spyOn(console, 'log').mockImplementation();

		await runMemberGamesBackfill(memberModel as any, 'dry-run');

		expect(memberModel.updateMany).not.toHaveBeenCalled();
		expect(log).toHaveBeenCalledWith('Dry run complete; no member documents were changed.');
		log.mockRestore();
	});

	it('applies only to missing values and repeated execution is idempotent', async () => {
		const memberModel = {
			countDocuments: jest
				.fn()
				.mockResolvedValueOnce(10)
				.mockResolvedValueOnce(2)
				.mockResolvedValueOnce(1)
				.mockResolvedValueOnce(0)
				.mockResolvedValueOnce(10)
				.mockResolvedValueOnce(0)
				.mockResolvedValueOnce(0)
				.mockResolvedValueOnce(0),
			updateMany: jest.fn().mockResolvedValue({ modifiedCount: 2 }),
		};
		const log = jest.spyOn(console, 'log').mockImplementation();

		await runMemberGamesBackfill(memberModel as any, 'apply');
		await runMemberGamesBackfill(memberModel as any, 'apply');

		expect(memberModel.updateMany).toHaveBeenCalledTimes(1);
		expect(memberModel.updateMany).toHaveBeenCalledWith(missingMemberGamesFilter, memberGamesBackfillPipeline);
		log.mockRestore();
	});
});

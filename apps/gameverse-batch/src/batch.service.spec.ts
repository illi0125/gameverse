import { GameStatus } from '../../gameverse-api/src/libs/enums/game.enum';
import { BatchService } from './batch.service';

describe('BatchService game ranking', () => {
	it('persists the agreed game popularity formula', async () => {
		const game = { _id: 'game-id', gameViews: 10, gameLikes: 4, gameReviews: 3 };
		const gameModel = {
			find: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([game]) }),
			findByIdAndUpdate: jest.fn().mockResolvedValue(game),
		};
		const memberModel = {};
		const service = new BatchService(gameModel as any, memberModel as any);

		await service.batchTopGames();

		expect(gameModel.find).toHaveBeenCalledWith({
			gameStatus: { $in: [GameStatus.ACTIVE, GameStatus.UPCOMING] },
			gameRank: 0,
		});
		expect(gameModel.findByIdAndUpdate).toHaveBeenCalledWith('game-id', { gameRank: 27 });
	});
});

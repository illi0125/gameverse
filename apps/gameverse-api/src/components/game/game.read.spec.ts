/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { GameStatus } from '../../libs/enums/game.enum';
import { GameService } from './game.service';

function gameQuery(result: unknown) {
	return {
		lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(result) }),
	};
}

describe('Game owner reads', () => {
	it('returns an existing public game with null memberData when its owner is missing', async () => {
		const gameId = new Types.ObjectId();
		const ownerId = new Types.ObjectId();
		const game = { _id: gameId, memberId: ownerId, gameStatus: GameStatus.ACTIVE };
		const gameModel = { findOne: jest.fn().mockReturnValue(gameQuery(game)) };
		const memberService = { getMemberOrNull: jest.fn().mockResolvedValue(null) };
		const service = new GameService(gameModel as any, memberService as any, {} as any, {} as any);

		const result = await service.getGame(null as any, gameId as any);

		expect(result.memberData).toBeNull();
		expect(memberService.getMemberOrNull).toHaveBeenCalledWith(ownerId);
	});

	it('uses a not-found response when the game is absent or not publicly visible', async () => {
		const gameModel = { findOne: jest.fn().mockReturnValue(gameQuery(null)) };
		const service = new GameService(gameModel as any, {} as any, {} as any, {} as any);

		await expect(service.getGame(null as any, new Types.ObjectId() as any)).rejects.toBeInstanceOf(NotFoundException);
	});

	it('preserves games with missing owners in catalog aggregation', async () => {
		const aggregate = jest.fn().mockResolvedValue([{ list: [], metaCounter: [] }]);
		const service = new GameService({ aggregate } as any, {} as any, {} as any, {} as any);

		await service.getGames(null as any, { page: 1, limit: 10, search: {} });

		const pipeline = aggregate.mock.calls[0][0];
		const facet = pipeline.find((stage: any) => stage.$facet).$facet;
		expect(facet.list).toContainEqual({
			$unwind: { path: '$memberData', preserveNullAndEmptyArrays: true },
		});
	});
});

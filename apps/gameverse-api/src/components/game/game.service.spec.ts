import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { GameInput } from '../../libs/dto/game/game.input';
import { GameGenre, GameMode, GamePlatform, GameStatus, GameType } from '../../libs/enums/game.enum';
import { GameService, normalizeGameSlug, validateGamePricing } from './game.service';

const memberId = new Types.ObjectId();
const gameId = new Types.ObjectId();

const catalog = {
	_id: gameId,
	memberId,
	gameStatus: GameStatus.ACTIVE,
	gameType: GameType.PAID,
	gameTitle: 'Elden Ring',
	gameDescription: 'A fantasy action role-playing game.',
	gameOverview: 'Explore a large fantasy world and defeat its powerful enemies.',
	gameReleaseDate: new Date('2022-02-25'),
	gameDeveloper: 'FromSoftware',
	gamePublisher: 'Bandai Namco',
	gameGenres: [GameGenre.RPG],
	gamePlatforms: [GamePlatform.PC],
	gameModes: [GameMode.SINGLE_PLAYER],
	gamePrice: 59.99,
	gameDiscountPrice: 0,
	gameImages: ['uploads/game/elden-ring.jpg'],
	gameVideos: [],
	gameSystemRequirements: [{ platform: GamePlatform.PC, minimum: 'Windows 10' }],
};

describe('Game catalog rules', () => {
	it('normalizes slugs', () => {
		expect(normalizeGameSlug('  Pokémon: Legends Arceus!  ')).toBe('pokemon-legends-arceus');
	});

	it('enforces pricing by game type', () => {
		expect(() => validateGamePricing(GameType.FREE, 0, 0)).not.toThrow();
		expect(() => validateGamePricing(GameType.PAID, 50, 10)).not.toThrow();
		expect(() => validateGamePricing(GameType.FREE, 10, 0)).toThrow(BadRequestException);
		expect(() => validateGamePricing(GameType.PREMIUM, 50, 50)).toThrow(BadRequestException);
	});

	it('rejects empty catalog arrays through DTO validation', async () => {
		const input = plainToInstance(GameInput, { ...catalog, gameGenres: [], memberId: undefined, _id: undefined });
		const errors = await validate(input);
		expect(errors.some((error) => error.property === 'gameGenres')).toBe(true);
	});
});

describe('GameService lifecycle', () => {
	const memberService = { memberStatsEditor: jest.fn() };
	const viewService = { recordView: jest.fn() };
	const likeService = { checkLikeExistence: jest.fn(), toggleLike: jest.fn() };

	beforeEach(() => jest.clearAllMocks());

	it('retries a duplicate generated slug and increments memberGames once', async () => {
		const duplicate = Object.assign(new Error('duplicate'), { code: 11000 });
		const model = {
			create: jest
				.fn()
				.mockRejectedValueOnce(duplicate)
				.mockResolvedValueOnce({ ...catalog, gameSlug: 'elden-ring-2' }),
		};
		const service = new GameService(model as any, memberService as any, viewService as any, likeService as any);
		const result = await service.createGame({ ...catalog, _id: undefined } as any);

		expect(result.gameSlug).toBe('elden-ring-2');
		expect(model.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ gameSlug: 'elden-ring-2' }));
		expect(memberService.memberStatsEditor).toHaveBeenCalledTimes(1);
		expect(memberService.memberStatsEditor).toHaveBeenCalledWith({
			_id: memberId,
			targetKey: 'memberGames',
			modifier: 1,
		});
	});

	it('soft-deletes an active owned game and decrements memberGames once', async () => {
		const updated = { ...catalog, gameStatus: GameStatus.DELETE, deletedAt: new Date() };
		const model = {
			findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(catalog) }),
			findByIdAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(updated) }),
		};
		const service = new GameService(model as any, memberService as any, viewService as any, likeService as any);
		await service.updateGame(memberId, { _id: gameId, gameStatus: GameStatus.DELETE });

		expect(memberService.memberStatsEditor).toHaveBeenCalledTimes(1);
		expect(memberService.memberStatsEditor).toHaveBeenCalledWith({
			_id: memberId,
			targetKey: 'memberGames',
			modifier: -1,
		});
	});

	it('restores a deleted game through admin and increments memberGames once', async () => {
		const deleted = { ...catalog, gameStatus: GameStatus.DELETE, deletedAt: new Date() };
		const restored = { ...catalog, gameStatus: GameStatus.ACTIVE };
		const model = {
			findById: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(deleted) }),
			findByIdAndUpdate: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(restored) }),
		};
		const service = new GameService(model as any, memberService as any, viewService as any, likeService as any);
		await service.updateGameByAdmin({ _id: gameId, gameStatus: GameStatus.ACTIVE });

		expect(model.findByIdAndUpdate).toHaveBeenCalledWith(gameId, expect.objectContaining({ deletedAt: null }), {
			new: true,
		});
		expect(memberService.memberStatsEditor).toHaveBeenCalledWith({
			_id: memberId,
			targetKey: 'memberGames',
			modifier: 1,
		});
	});
});

import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import {
	AgentGamesInquiry,
	AllGamesInquiry,
	GameSearch,
	GamesInquiry,
	GameInput,
	OrdinaryInquiry,
} from '../../libs/dto/game/game.input';
import { Game, Games } from '../../libs/dto/game/game';
import { AdminGameUpdate, GameUpdate } from '../../libs/dto/game/game.update';
import { Direction, Message } from '../../libs/enums/common.enum';
import { GameStatus, GameType } from '../../libs/enums/game.enum';
import { StatisticModifier, T } from '../../libs/types/common';
import { lookupAuthMemberLiked, lookupMember, shapeIntoMongoObjectId } from '../../libs/config';
import { MemberService } from '../member/member.service';
import { ViewService } from '../view/view.service';
import { LikeService } from '../like/like.service';
import { ViewGroup } from '../../libs/enums/view.enum';
import { LikeGroup } from '../../libs/enums/like.enum';
import { LikeInput } from '../../libs/dto/like/like.input';

export function normalizeGameSlug(title: string): string {
	const slug = title
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 120);
	return slug || 'game';
}

export function validateGamePricing(gameType: GameType, gamePrice: number, gameDiscountPrice = 0): void {
	const validFree = gameType === GameType.FREE && gamePrice === 0 && gameDiscountPrice === 0;
	const validPaid =
		gameType !== GameType.FREE &&
		gamePrice > 0 &&
		(gameDiscountPrice === 0 || (gameDiscountPrice > 0 && gameDiscountPrice < gamePrice));
	if (!validFree && !validPaid) throw new BadRequestException('Invalid game pricing for the selected game type');
}

@Injectable()
export class GameService {
	constructor(
		@InjectModel('Game') private readonly gameModel: Model<Game>,
		private readonly memberService: MemberService,
		private readonly viewService: ViewService,
		private readonly likeService: LikeService,
	) {}

	public async createGame(input: GameInput): Promise<Game> {
		if (input.gameStatus === GameStatus.DELETE) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
		this.validateCatalog(input);
		const baseSlug = normalizeGameSlug(input.gameTitle);

		for (let suffix = 1; suffix <= 100; suffix++) {
			const gameSlug = suffix === 1 ? baseSlug : `${baseSlug}-${suffix}`;
			try {
				const result = await this.gameModel.create({
					...input,
					gameDiscountPrice: input.gameDiscountPrice ?? 0,
					gameVideos: input.gameVideos ?? [],
					gameSystemRequirements: input.gameSystemRequirements ?? [],
					gameSlug,
				});
				await this.memberService.memberStatsEditor({ _id: result.memberId, targetKey: 'memberGames', modifier: 1 });
				return result;
			} catch (err) {
				if ((err as { code?: number }).code === 11000) continue;
				throw new BadRequestException((err as Error).message || Message.CREATE_FAILED);
			}
		}
		throw new BadRequestException('Unable to generate a unique game slug');
	}

	public async getGame(memberId: ObjectId, gameId: ObjectId): Promise<Game> {
		const targetGame = (await this.gameModel
			.findOne({ _id: gameId, gameStatus: { $in: [GameStatus.ACTIVE, GameStatus.UPCOMING] } })
			.lean()
			.exec()) as Game | null;
		if (!targetGame) throw new NotFoundException(Message.NO_DATA_FOUND);

		if (memberId) {
			const viewInput = { memberId, viewRefId: gameId, viewGroup: ViewGroup.GAME };
			if (await this.viewService.recordView(viewInput)) {
				await this.gameStatsEditor({ _id: gameId, targetKey: 'gameViews', modifier: 1 });
				targetGame.gameViews++;
			}
			const likeInput = { memberId, likeRefId: gameId, likeGroup: LikeGroup.GAME };
			targetGame.meLiked = await this.likeService.checkLikeExistence(likeInput);
		}

		targetGame.memberData = await this.memberService.getMemberOrNull(targetGame.memberId);
		return targetGame;
	}

	public async updateGame(memberId: ObjectId, input: GameUpdate): Promise<Game> {
		const current = await this.gameModel
			.findOne({ _id: input._id, memberId, gameStatus: { $ne: GameStatus.DELETE } })
			.lean();
		if (!current) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		this.validateCatalog({ ...current, ...input });

		const { _id, ...changes } = input;
		const update: Omit<GameUpdate, '_id'> = { ...changes };
		if (input.gameStatus === GameStatus.DELETE) update.deletedAt = new Date();
		const result = await this.gameModel.findByIdAndUpdate(_id, update, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		if (input.gameStatus === GameStatus.DELETE) {
			await this.memberService.memberStatsEditor({ _id: memberId, targetKey: 'memberGames', modifier: -1 });
		}
		return result;
	}

	public async getGames(memberId: ObjectId, input: GamesInquiry): Promise<Games> {
		const match: T = { gameStatus: { $in: [GameStatus.ACTIVE, GameStatus.UPCOMING] } };
		this.shapeMatchQuery(match, input.search);
		return this.aggregateGames(match, input, memberId);
	}

	private shapeMatchQuery(match: T, search: GameSearch): void {
		const { memberId, typeList, platformList, genreList, modeList, pricesRange, releaseDateRange, isFeatured, text } =
			search;
		if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
		if (typeList?.length) match.gameType = { $in: typeList };
		if (platformList?.length) match.gamePlatforms = { $in: platformList };
		if (genreList?.length) match.gameGenres = { $in: genreList };
		if (modeList?.length) match.gameModes = { $in: modeList };
		if (pricesRange) match.gamePrice = { $gte: pricesRange.start, $lte: pricesRange.end };
		if (releaseDateRange) match.gameReleaseDate = { $gte: releaseDateRange.start, $lte: releaseDateRange.end };
		if (isFeatured !== undefined) match.isFeatured = isFeatured;
		if (text) {
			const escaped = text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const regex = new RegExp(escaped, 'i');
			match.$or = [{ gameTitle: regex }, { gameDeveloper: regex }, { gamePublisher: regex }];
		}
	}

	public async getFavorites(memberId: ObjectId, input: OrdinaryInquiry): Promise<Games> {
		return this.likeService.getFavoriteGames(memberId, input);
	}

	public async getVisited(memberId: ObjectId, input: OrdinaryInquiry): Promise<Games> {
		return this.viewService.getVisitedGames(memberId, input);
	}

	public async getAgentGames(memberId: ObjectId, input: AgentGamesInquiry): Promise<Games> {
		if (input.search.gameStatus === GameStatus.DELETE) throw new BadRequestException(Message.NOT_ALLOWED_REQUEST);
		const match: T = {
			memberId,
			gameStatus: input.search.gameStatus ?? { $ne: GameStatus.DELETE },
		};
		return this.aggregateGames(match, input, memberId);
	}

	public async likeTargetGame(memberId: ObjectId, likeRefId: ObjectId): Promise<Game> {
		const target = await this.gameModel.findOne({
			_id: likeRefId,
			gameStatus: { $in: [GameStatus.ACTIVE, GameStatus.UPCOMING] },
		});
		if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

		const input: LikeInput = { memberId, likeRefId, likeGroup: LikeGroup.GAME };
		const modifier = await this.likeService.toggleLike(input);
		const result = await this.gameStatsEditor({ _id: likeRefId, targetKey: 'gameLikes', modifier });
		if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
		return result;
	}

	public async getAllGamesByAdmin(input: AllGamesInquiry): Promise<Games> {
		const { gameStatus } = input.search;
		const match: T = {};
		if (gameStatus) match.gameStatus = gameStatus;
		this.shapeMatchQuery(match, input.search);
		return this.aggregateGames(match, input);
	}

	public async updateGameByAdmin(input: AdminGameUpdate): Promise<Game> {
		const current = await this.gameModel.findById(input._id).lean();
		if (!current) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		this.validateCatalog({ ...current, ...input });

		const wasDeleted = current.gameStatus === GameStatus.DELETE;
		const willBeDeleted = input.gameStatus === GameStatus.DELETE;
		const willBeRestored = wasDeleted && input.gameStatus !== undefined && input.gameStatus !== GameStatus.DELETE;
		const { _id, ...changes } = input;
		const update: Omit<AdminGameUpdate, '_id'> = { ...changes };
		if (!wasDeleted && willBeDeleted) update.deletedAt = new Date();
		if (willBeRestored) update.deletedAt = null;

		const result = await this.gameModel.findByIdAndUpdate(_id, update, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		if (!wasDeleted && willBeDeleted) {
			await this.memberService.memberStatsEditor({ _id: result.memberId, targetKey: 'memberGames', modifier: -1 });
		} else if (willBeRestored) {
			await this.memberService.memberStatsEditor({ _id: result.memberId, targetKey: 'memberGames', modifier: 1 });
		}
		return result;
	}

	public async removeGameByAdmin(gameId: ObjectId): Promise<Game> {
		const result = await this.gameModel.findOneAndDelete({ _id: gameId, gameStatus: GameStatus.DELETE }).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		return result;
	}

	public async gameStatsEditor(input: StatisticModifier): Promise<Game | null> {
		const { _id, targetKey, modifier } = input;
		return this.gameModel.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true }).exec();
	}

	private async aggregateGames(
		match: T,
		input: { page: number; limit: number; sort?: string; direction?: Direction },
		memberId?: ObjectId,
	): Promise<Games> {
		const sort: T = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };
		const result = await this.gameModel.aggregate<Games>([
			{ $match: match },
			{ $sort: sort },
			{
				$facet: {
					list: [
						{ $skip: (input.page - 1) * input.limit },
						{ $limit: input.limit },
						lookupAuthMemberLiked(memberId ?? null, '$_id', LikeGroup.GAME),
						lookupMember,
						{ $unwind: { path: '$memberData', preserveNullAndEmptyArrays: true } },
					],
					metaCounter: [{ $count: 'total' }],
				},
			},
		]);
		return result[0] ?? { list: [], metaCounter: [] };
	}

	private validateCatalog(input: Partial<GameInput>): void {
		if (!input.gameType || input.gamePrice === undefined) throw new BadRequestException(Message.BAD_REQUEST);
		validateGamePricing(input.gameType, input.gamePrice, input.gameDiscountPrice ?? 0);
		if (
			!input.gameGenres?.length ||
			!input.gamePlatforms?.length ||
			!input.gameModes?.length ||
			!input.gameImages?.length
		) {
			throw new BadRequestException('Game genres, platforms, modes and images cannot be empty');
		}
		const invalidRequirement = input.gameSystemRequirements?.some(
			(requirement) => !input.gamePlatforms?.includes(requirement.platform),
		);
		if (invalidRequirement) throw new BadRequestException('System requirement platform must exist in gamePlatforms');
	}
}

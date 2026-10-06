import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Like, MeLiked } from '../../libs/dto/like/like';
import { LikeInput } from '../../libs/dto/like/like.input';
import { T } from '../../libs/types/common';
import { Message } from '../../libs/enums/common.enum';
import { OrdinaryInquiry } from '../../libs/dto/game/game.input';
import { Game, Games } from '../../libs/dto/game/game';
import { LikeGroup } from '../../libs/enums/like.enum';
import { lookupFavoriteGame } from '../../libs/config';
import { GameStatus } from '../../libs/enums/game.enum';

@Injectable()
export class LikeService {
	constructor(@InjectModel('Like') private readonly likeModel: Model<Like>) {}

	public async toggleLike(input: LikeInput): Promise<number> {
		const search: T = { memberId: input.memberId, likeRefId: input.likeRefId, likeGroup: input.likeGroup },
			exist = await this.likeModel.findOne(search).exec();
		let modifier = 1;

		if (exist) {
			await this.likeModel.findOneAndDelete(search).exec();
			modifier = -1;
		} else {
			try {
				await this.likeModel.create(input);
			} catch (err) {
				console.log('Error, Service.model:', (err as Error).message);
				throw new BadRequestException(Message.CREATE_FAILED);
			}
		}
		console.log(`-Like modifier ${modifier} -`);
		return modifier;
	}

	public async checkLikeExistence(input: LikeInput): Promise<MeLiked[]> {
		const { memberId, likeRefId, likeGroup } = input;
		const result = await this.likeModel.findOne({ memberId, likeRefId, likeGroup }).exec();
		return result ? [{ memberId: memberId, likeRefId: likeRefId, myFavorite: true }] : [];
	}

	public async getFavoriteGames(memberId: ObjectId, input: OrdinaryInquiry): Promise<Games> {
		const { page, limit } = input;
		const match: T = { likeGroup: LikeGroup.GAME, memberId: memberId };

		const data = await this.likeModel
			.aggregate<{ list: Array<{ favoriteGame: Game }>; metaCounter: Games['metaCounter'] }>([
				{ $match: match },
				{ $sort: { updatedAt: -1 } },
				{
					$lookup: {
						from: 'games',
						localField: 'likeRefId',
						foreignField: '_id',
						as: 'favoriteGame',
					},
				},
				{ $unwind: '$favoriteGame' },
				{ $match: { 'favoriteGame.gameStatus': { $in: [GameStatus.ACTIVE, GameStatus.UPCOMING] } } },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookupFavoriteGame,
							{ $unwind: '$favoriteGame.memberData' },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		// console.log('data:', data[0].list[0]);
		const result: Games = { list: [], metaCounter: data[0]?.metaCounter ?? [] };
		result.list = (data[0]?.list ?? []).map((ele) => ele.favoriteGame);
		// console.log('result:', result);
		return result;
	}
}

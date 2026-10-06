import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { View } from '../../libs/dto/view/view';
import { ViewInput } from '../../libs/dto/view/view.input';
import { T } from '../../libs/types/common';
import { OrdinaryInquiry } from '../../libs/dto/game/game.input';
import { Game, Games } from '../../libs/dto/game/game';
import { ViewGroup } from '../../libs/enums/view.enum';
import { lookupVisitedGame } from '../../libs/config';
import { GameStatus } from '../../libs/enums/game.enum';

@Injectable()
export class ViewService {
	constructor(@InjectModel('View') private readonly viewModel: Model<View>) {}
	public async recordView(input: ViewInput): Promise<View | null> {
		const viewExist = await this.checkViewExistence(input);
		if (!viewExist) {
			console.log('-New View Insert - ');
			return await this.viewModel.create(input);
		} else return null;
	}

	private async checkViewExistence(input: ViewInput): Promise<View | null> {
		const { memberId, viewRefId, viewGroup } = input;
		const search: T = { memberId, viewRefId, viewGroup };
		return await this.viewModel.findOne(search).exec();
	}

	public async getVisitedGames(memberId: ObjectId, input: OrdinaryInquiry): Promise<Games> {
		const { page, limit } = input;
		const match: T = { viewGroup: ViewGroup.GAME, memberId: memberId };

		const data = await this.viewModel
			.aggregate<{ list: Array<{ visitedGame: Game }>; metaCounter: Games['metaCounter'] }>([
				{ $match: match },
				{ $sort: { updatedAt: -1 } },
				{
					$lookup: {
						from: 'games',
						localField: 'viewRefId',
						foreignField: '_id',
						as: 'visitedGame',
					},
				},
				{ $unwind: '$visitedGame' },
				{ $match: { 'visitedGame.gameStatus': { $in: [GameStatus.ACTIVE, GameStatus.UPCOMING] } } },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							lookupVisitedGame,
							{ $unwind: { path: '$visitedGame.memberData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		// console.log('data:', data[0].list[0]);
		const result: Games = { list: [], metaCounter: data[0]?.metaCounter ?? [] };
		result.list = (data[0]?.list ?? []).map((ele) => ele.visitedGame);
		// console.log('result:', result);
		return result;
	}
}

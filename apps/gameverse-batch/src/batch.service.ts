import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Game } from '../../gameverse-api/src/libs/dto/game/game';
import { Member } from '../../gameverse-api/src/libs/dto/member/member';
import { GameStatus } from '../../gameverse-api/src/libs/enums/game.enum';
import { MemberStatus, MemberType } from '../../gameverse-api/src/libs/enums/member.enum';

@Injectable()
export class BatchService {
	constructor(
		@InjectModel('Game') private readonly gameModel: Model<Game>,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
	) {}

	public async batchRolBack(): Promise<void> {
		await this.gameModel
			.updateMany(
				{
					gameStatus: { $in: [GameStatus.ACTIVE, GameStatus.UPCOMING] },
				},
				{ gameRank: 0 },
			)
			.exec();

		await this.memberModel
			.updateMany(
				{
					memberStatus: MemberStatus.ACTIVE,
					memberType: MemberType.AGENT,
				},
				{ memberRank: 0 },
			)
			.exec();
		console.log('batchRolBack');
	}

	public async batchTopGames(): Promise<void> {
		const games: Game[] = await this.gameModel
			.find({
				gameStatus: { $in: [GameStatus.ACTIVE, GameStatus.UPCOMING] },
				gameRank: 0,
			})
			.exec();

		const promisedList = games.map(async (game: Game) => {
			const { _id, gameLikes, gameViews, gameReviews } = game;
			const rank = gameViews + gameLikes * 2 + gameReviews * 3;
			return this.gameModel.findByIdAndUpdate(_id, { gameRank: rank });
		});
		await Promise.all(promisedList);
		console.log('batchTopGames');
	}

	public async batchTopAgents(): Promise<void> {
		const agents: Member[] = await this.memberModel
			.find({
				memberType: MemberType.AGENT,
				memberStatus: MemberStatus.ACTIVE,
				memberRank: 0,
			})
			.exec();

		const promisedList = agents.map(async (ele: Member) => {
			const { _id, memberGames, memberLikes, memberArticles, memberViews } = ele;
			const rank = memberGames * 5 + memberArticles * 3 + memberLikes * 2 + memberViews * 1;
			return await this.memberModel.findByIdAndUpdate(_id, { memberRank: rank });
		});
		await Promise.all(promisedList);
		console.log('batchTopAgents');
	}

	getHello(): string {
		return 'Welcome to Gameverse Batch Server!';
	}
}

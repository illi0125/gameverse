import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { type ObjectId } from 'mongoose';
import { GameGenre, GameMode, GamePlatform, GameStatus, GameType } from '../../enums/game.enum';
import { Member, TotalCounter } from '../member/member';
import { MeLiked } from '../like/like';

@ObjectType()
export class GameSystemRequirement {
	@Field(() => GamePlatform)
	platform: GamePlatform;

	@Field(() => String)
	minimum: string;

	@Field(() => String, { nullable: true })
	recommended?: string;
}

@ObjectType()
export class Game {
	@Field(() => String)
	_id: ObjectId;

	@Field(() => GameStatus)
	gameStatus: GameStatus;

	@Field(() => GameType)
	gameType: GameType;

	@Field(() => String)
	gameTitle: string;

	@Field(() => String)
	gameSlug: string;

	@Field(() => String)
	gameDescription: string;

	@Field(() => String)
	gameOverview: string;

	@Field(() => Date)
	gameReleaseDate: Date;

	@Field(() => String)
	gameDeveloper: string;

	@Field(() => String)
	gamePublisher: string;

	@Field(() => [GameGenre])
	gameGenres: GameGenre[];

	@Field(() => [GamePlatform])
	gamePlatforms: GamePlatform[];

	@Field(() => [GameMode])
	gameModes: GameMode[];

	@Field(() => Float)
	gamePrice: number;

	@Field(() => Float)
	gameDiscountPrice: number;

	@Field(() => [String])
	gameImages: string[];

	@Field(() => [String])
	gameVideos: string[];

	@Field(() => [GameSystemRequirement])
	gameSystemRequirements: GameSystemRequirement[];

	@Field(() => Float)
	gameRatings: number;

	@Field(() => Int)
	gameReviews: number;

	@Field(() => Int)
	gameComments: number;

	@Field(() => Int)
	gameViews: number;

	@Field(() => Int)
	gameLikes: number;

	@Field(() => Int)
	gameRank: number;

	@Field(() => String)
	memberId: ObjectId;

	@Field(() => Boolean)
	isFeatured: boolean;

	@Field(() => Boolean)
	get isUpcoming(): boolean {
		return this.gameStatus === GameStatus.UPCOMING;
	}

	@Field(() => Date, { nullable: true })
	deletedAt?: Date;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	@Field(() => Member, { nullable: true })
	memberData?: Member;

	@Field(() => [MeLiked], { nullable: true })
	meLiked?: MeLiked[];
}

@ObjectType()
export class Games {
	@Field(() => [Game])
	list: Game[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}

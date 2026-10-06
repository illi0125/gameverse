import { Type } from 'class-transformer';
import {
	ArrayNotEmpty,
	IsArray,
	IsBoolean,
	IsIn,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	Length,
	Min,
	ValidateNested,
} from 'class-validator';
import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { type ObjectId } from 'mongoose';
import { Direction } from '../../enums/common.enum';
import { GameGenre, GameMode, GamePlatform, GameStatus, GameType } from '../../enums/game.enum';
import { availableGameSorts } from '../../config';

@InputType()
export class GameSystemRequirementInput {
	@IsNotEmpty()
	@Field(() => GamePlatform)
	platform: GamePlatform;

	@IsNotEmpty()
	@Length(1, 2000)
	@Field(() => String)
	minimum: string;

	@IsOptional()
	@Length(1, 2000)
	@Field(() => String, { nullable: true })
	recommended?: string;
}

@InputType()
export class GameInput {
	@IsNotEmpty()
	@Field(() => GameType)
	gameType: GameType;

	@IsOptional()
	@Field(() => GameStatus, { nullable: true })
	gameStatus?: GameStatus;

	@IsNotEmpty()
	@Length(1, 150)
	@Field(() => String)
	gameTitle: string;

	@IsNotEmpty()
	@Length(5, 500)
	@Field(() => String)
	gameDescription: string;

	@IsNotEmpty()
	@Length(5, 5000)
	@Field(() => String)
	gameOverview: string;

	@IsNotEmpty()
	@Field(() => Date)
	gameReleaseDate: Date;

	@IsNotEmpty()
	@Length(1, 150)
	@Field(() => String)
	gameDeveloper: string;

	@IsNotEmpty()
	@Length(1, 150)
	@Field(() => String)
	gamePublisher: string;

	@IsArray()
	@ArrayNotEmpty()
	@Field(() => [GameGenre])
	gameGenres: GameGenre[];

	@IsArray()
	@ArrayNotEmpty()
	@Field(() => [GamePlatform])
	gamePlatforms: GamePlatform[];

	@IsArray()
	@ArrayNotEmpty()
	@Field(() => [GameMode])
	gameModes: GameMode[];

	@IsNumber()
	@Min(0)
	@Field(() => Float)
	gamePrice: number;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Field(() => Float, { nullable: true })
	gameDiscountPrice?: number;

	@IsArray()
	@ArrayNotEmpty()
	@Field(() => [String])
	gameImages: string[];

	@IsOptional()
	@IsArray()
	@Field(() => [String], { nullable: true })
	gameVideos?: string[];

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => GameSystemRequirementInput)
	@Field(() => [GameSystemRequirementInput], { nullable: true })
	gameSystemRequirements?: GameSystemRequirementInput[];

	memberId?: ObjectId;
}

@InputType()
export class PriceRange {
	@IsNumber()
	@Min(0)
	@Field(() => Float)
	start: number;

	@IsNumber()
	@Min(0)
	@Field(() => Float)
	end: number;
}

@InputType()
export class DateRange {
	@Field(() => Date)
	start: Date;

	@Field(() => Date)
	end: Date;
}

@InputType()
export class GameSearch {
	@IsOptional()
	@Field(() => String, { nullable: true })
	memberId?: ObjectId;

	@IsOptional()
	@Field(() => [GameType], { nullable: true })
	typeList?: GameType[];

	@IsOptional()
	@Field(() => [GamePlatform], { nullable: true })
	platformList?: GamePlatform[];

	@IsOptional()
	@Field(() => [GameGenre], { nullable: true })
	genreList?: GameGenre[];

	@IsOptional()
	@Field(() => [GameMode], { nullable: true })
	modeList?: GameMode[];

	@IsOptional()
	@Field(() => PriceRange, { nullable: true })
	pricesRange?: PriceRange;

	@IsOptional()
	@Field(() => DateRange, { nullable: true })
	releaseDateRange?: DateRange;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true })
	isFeatured?: boolean;

	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;
}

@InputType()
export class GamesInquiry {
	@Min(1)
	@Field(() => Int)
	page: number;

	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableGameSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@Field(() => GameSearch)
	search: GameSearch;
}

@InputType()
export class AgentGameSearch {
	@IsOptional()
	@Field(() => GameStatus, { nullable: true })
	gameStatus?: GameStatus;
}

@InputType()
export class AgentGamesInquiry {
	@Min(1)
	@Field(() => Int)
	page: number;

	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableGameSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@Field(() => AgentGameSearch)
	search: AgentGameSearch;
}

@InputType()
export class AdminGameSearch extends GameSearch {
	@IsOptional()
	@Field(() => GameStatus, { nullable: true })
	gameStatus?: GameStatus;
}

@InputType()
export class AllGamesInquiry {
	@Min(1)
	@Field(() => Int)
	page: number;

	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableGameSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@Field(() => AdminGameSearch)
	search: AdminGameSearch;
}

@InputType()
export class OrdinaryInquiry {
	@Min(1)
	@Field(() => Int)
	page: number;

	@Min(1)
	@Field(() => Int)
	limit: number;
}

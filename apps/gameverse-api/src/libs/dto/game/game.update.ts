import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsBoolean, IsNumber, IsOptional, Length, Min, ValidateNested } from 'class-validator';
import { Field, Float, InputType } from '@nestjs/graphql';
import { type ObjectId } from 'mongoose';
import { GameGenre, GameMode, GamePlatform, GameStatus, GameType } from '../../enums/game.enum';
import { GameSystemRequirementInput } from './game.input';

@InputType()
export class GameUpdate {
	@Field(() => String)
	_id: ObjectId;

	@IsOptional()
	@Field(() => GameStatus, { nullable: true })
	gameStatus?: GameStatus;

	@IsOptional()
	@Field(() => GameType, { nullable: true })
	gameType?: GameType;

	@IsOptional()
	@Length(1, 150)
	@Field(() => String, { nullable: true })
	gameTitle?: string;

	@IsOptional()
	@Length(5, 500)
	@Field(() => String, { nullable: true })
	gameDescription?: string;

	@IsOptional()
	@Length(5, 5000)
	@Field(() => String, { nullable: true })
	gameOverview?: string;

	@IsOptional()
	@Field(() => Date, { nullable: true })
	gameReleaseDate?: Date;

	@IsOptional()
	@Length(1, 150)
	@Field(() => String, { nullable: true })
	gameDeveloper?: string;

	@IsOptional()
	@Length(1, 150)
	@Field(() => String, { nullable: true })
	gamePublisher?: string;

	@IsOptional()
	@IsArray()
	@ArrayNotEmpty()
	@Field(() => [GameGenre], { nullable: true })
	gameGenres?: GameGenre[];

	@IsOptional()
	@IsArray()
	@ArrayNotEmpty()
	@Field(() => [GamePlatform], { nullable: true })
	gamePlatforms?: GamePlatform[];

	@IsOptional()
	@IsArray()
	@ArrayNotEmpty()
	@Field(() => [GameMode], { nullable: true })
	gameModes?: GameMode[];

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Field(() => Float, { nullable: true })
	gamePrice?: number;

	@IsOptional()
	@IsNumber()
	@Min(0)
	@Field(() => Float, { nullable: true })
	gameDiscountPrice?: number;

	@IsOptional()
	@IsArray()
	@ArrayNotEmpty()
	@Field(() => [String], { nullable: true })
	gameImages?: string[];

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

	deletedAt?: Date | null;
}

@InputType()
export class AdminGameUpdate extends GameUpdate {
	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true })
	isFeatured?: boolean;
}

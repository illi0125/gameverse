import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { type ObjectId } from 'mongoose';
import { Game, Games } from '../../libs/dto/game/game';
import {
	AgentGamesInquiry,
	AllGamesInquiry,
	GamesInquiry,
	GameInput,
	OrdinaryInquiry,
} from '../../libs/dto/game/game.input';
import { AdminGameUpdate, GameUpdate } from '../../libs/dto/game/game.update';
import { GameStatus } from '../../libs/enums/game.enum';
import { MemberType } from '../../libs/enums/member.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { GameService } from './game.service';

@Resolver(() => Game)
export class GameResolver {
	constructor(private readonly gameService: GameService) {}

	@ResolveField(() => Boolean)
	public isUpcoming(@Parent() game: Game): boolean {
		return game.gameStatus === GameStatus.UPCOMING;
	}

	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Mutation(() => Game)
	public async createGame(@Args('input') input: GameInput, @AuthMember('_id') memberId: ObjectId): Promise<Game> {
		input.memberId = memberId;
		return this.gameService.createGame(input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Game)
	public async getGame(@Args('gameId') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Game> {
		return this.gameService.getGame(memberId, shapeIntoMongoObjectId(input));
	}

	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Mutation(() => Game)
	public async updateGame(@Args('input') input: GameUpdate, @AuthMember('_id') memberId: ObjectId): Promise<Game> {
		input._id = shapeIntoMongoObjectId(input._id);
		return this.gameService.updateGame(memberId, input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Games)
	public async getGames(@Args('input') input: GamesInquiry, @AuthMember('_id') memberId: ObjectId): Promise<Games> {
		return this.gameService.getGames(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Games)
	public async getFavorites(
		@Args('input') input: OrdinaryInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Games> {
		return this.gameService.getFavorites(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Games)
	public async getVisited(
		@Args('input') input: OrdinaryInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Games> {
		return this.gameService.getVisited(memberId, input);
	}

	@Roles(MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Query(() => Games)
	public async getAgentGames(
		@Args('input') input: AgentGamesInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Games> {
		return this.gameService.getAgentGames(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Game)
	public async likeTargetGame(@Args('gameId') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Game> {
		return this.gameService.likeTargetGame(memberId, shapeIntoMongoObjectId(input));
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Games)
	public async getAllGamesByAdmin(@Args('input') input: AllGamesInquiry): Promise<Games> {
		return this.gameService.getAllGamesByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Game)
	public async updateGameByAdmin(@Args('input') input: AdminGameUpdate): Promise<Game> {
		input._id = shapeIntoMongoObjectId(input._id);
		return this.gameService.updateGameByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Game)
	public async removeGameByAdmin(@Args('gameId') input: string): Promise<Game> {
		return this.gameService.removeGameByAdmin(shapeIntoMongoObjectId(input));
	}
}

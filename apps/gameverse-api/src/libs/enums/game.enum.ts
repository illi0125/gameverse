import { registerEnumType } from '@nestjs/graphql';

export enum GameStatus {
	ACTIVE = 'ACTIVE',
	UPCOMING = 'UPCOMING',
	DELETE = 'DELETE',
}
registerEnumType(GameStatus, { name: 'GameStatus' });

export enum GameType {
	FREE = 'FREE',
	PAID = 'PAID',
	PREMIUM = 'PREMIUM',
}
registerEnumType(GameType, { name: 'GameType' });

export enum GamePlatform {
	PC = 'PC',
	PLAYSTATION = 'PLAYSTATION',
	XBOX = 'XBOX',
	NINTENDO = 'NINTENDO',
	MOBILE = 'MOBILE',
}
registerEnumType(GamePlatform, { name: 'GamePlatform' });

export enum GameGenre {
	ACTION = 'ACTION',
	ADVENTURE = 'ADVENTURE',
	RPG = 'RPG',
	STRATEGY = 'STRATEGY',
	SPORTS = 'SPORTS',
	RACING = 'RACING',
	SHOOTER = 'SHOOTER',
	SIMULATION = 'SIMULATION',
	PUZZLE = 'PUZZLE',
	HORROR = 'HORROR',
}
registerEnumType(GameGenre, { name: 'GameGenre' });

export enum GameMode {
	SINGLE_PLAYER = 'SINGLE_PLAYER',
	MULTIPLAYER = 'MULTIPLAYER',
	CO_OP = 'CO_OP',
}
registerEnumType(GameMode, { name: 'GameMode' });

import { Schema } from 'mongoose';
import { GameGenre, GameMode, GamePlatform, GameStatus, GameType } from '../libs/enums/game.enum';

const GameSystemRequirementSchema = new Schema(
	{
		platform: { type: String, enum: GamePlatform, required: true },
		minimum: { type: String, required: true },
		recommended: { type: String },
	},
	{ _id: false },
);

const GameSchema = new Schema(
	{
		gameStatus: { type: String, enum: GameStatus, default: GameStatus.ACTIVE },
		gameType: { type: String, enum: GameType, required: true },
		gameTitle: { type: String, required: true, trim: true },
		gameSlug: { type: String, required: true, unique: true, immutable: true },
		gameDescription: { type: String, required: true },
		gameOverview: { type: String, required: true },
		gameReleaseDate: { type: Date, required: true },
		gameDeveloper: { type: String, required: true, trim: true },
		gamePublisher: { type: String, required: true, trim: true },
		gameGenres: { type: [String], enum: GameGenre, required: true },
		gamePlatforms: { type: [String], enum: GamePlatform, required: true },
		gameModes: { type: [String], enum: GameMode, required: true },
		gamePrice: { type: Number, required: true, min: 0 },
		gameDiscountPrice: { type: Number, default: 0, min: 0 },
		gameImages: { type: [String], required: true },
		gameVideos: { type: [String], default: [] },
		gameSystemRequirements: { type: [GameSystemRequirementSchema], default: [] },
		gameRatings: { type: Number, default: 0, min: 0, max: 5 },
		gameReviews: { type: Number, default: 0, min: 0 },
		gameComments: { type: Number, default: 0, min: 0 },
		gameViews: { type: Number, default: 0, min: 0 },
		gameLikes: { type: Number, default: 0, min: 0 },
		gameRank: { type: Number, default: 0, min: 0 },
		memberId: { type: Schema.Types.ObjectId, required: true, ref: 'Member' },
		isFeatured: { type: Boolean, default: false },
		deletedAt: { type: Date },
	},
	{ timestamps: true, collection: 'games' },
);

GameSchema.index({ gameStatus: 1, gameRank: -1 });
GameSchema.index({ memberId: 1, gameStatus: 1, createdAt: -1 });
GameSchema.index({ gameType: 1, gamePlatforms: 1, gameGenres: 1 });
GameSchema.index({ isFeatured: 1, gameReleaseDate: -1 });
GameSchema.index({ gamePrice: 1 });

export default GameSchema;

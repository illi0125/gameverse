import { Types } from 'mongoose';
import { buildGames, rewriteUploadPath, validateEnrichment } from '../../../../../scripts/migrate-property-to-game';
import { GameGenre, GameMode, GamePlatform, GameStatus, GameType } from '../../libs/enums/game.enum';

const propertyId = new Types.ObjectId();
const memberId = new Types.ObjectId();
const source = {
	_id: propertyId,
	memberId,
	propertyTitle: 'Legacy Catalog Item',
	propertyDesc: 'Legacy description',
	propertyPrice: 40,
	propertyImages: ['uploads/property/cover.jpg'],
	propertyViews: 8,
	propertyLikes: 3,
	propertyComments: 2,
	createdAt: new Date('2025-01-01'),
	updatedAt: new Date('2025-01-02'),
};
const enrichment = {
	gameStatus: GameStatus.ACTIVE,
	gameType: GameType.PAID,
	gameDeveloper: 'Developer',
	gamePublisher: 'Publisher',
	gameOverview: 'Reviewed overview',
	gameReleaseDate: '2025-01-01T00:00:00.000Z',
	gamePlatforms: [GamePlatform.PC],
	gameGenres: [GameGenre.ACTION],
	gameModes: [GameMode.SINGLE_PLAYER],
	gameVideos: [],
	gameSystemRequirements: [{ platform: GamePlatform.PC, minimum: 'Windows 10' }],
	gameDiscountPrice: 10,
};

describe('Property-to-Game migration contract', () => {
	it('rejects incomplete enrichment records', () => {
		expect(() => validateEnrichment(String(propertyId), source)).toThrow('Missing enrichment');
	});

	it('preserves IDs and counters while rewriting Game fields and uploads', () => {
		validateEnrichment(String(propertyId), source, enrichment);
		const [game] = buildGames([source], { [String(propertyId)]: enrichment });

		expect(game).toEqual(
			expect.objectContaining({
				_id: propertyId,
				memberId,
				gameSlug: 'legacy-catalog-item',
				gameImages: ['uploads/game/cover.jpg'],
				gameViews: 8,
				gameLikes: 3,
				gameComments: 2,
				gameRatings: 0,
				gameReviews: 0,
			}),
		);
	});

	it('rewrites only legacy Property upload prefixes', () => {
		expect(rewriteUploadPath('uploads/property/image.jpg')).toBe('uploads/game/image.jpg');
		expect(rewriteUploadPath('https://cdn.example/game.jpg')).toBe('https://cdn.example/game.jpg');
	});
});

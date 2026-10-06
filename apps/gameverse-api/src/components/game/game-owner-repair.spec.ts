/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import mongoose, { Types } from 'mongoose';
import { GameStatus } from '../../libs/enums/game.enum';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { parseRepairArguments, runOrphanGameOwnerRepair } from '../../../../../scripts/repair-orphan-game-owner';

function createRepairDatabase() {
	const gameId = new Types.ObjectId();
	const orphanId = new Types.ObjectId();
	const memberId = new Types.ObjectId();
	const state = {
		game: {
			_id: gameId,
			gameTitle: 'Clash of Clans',
			gameStatus: GameStatus.ACTIVE,
			memberId: orphanId,
		},
		member: {
			_id: memberId,
			memberNick: 'Leo',
			memberType: MemberType.AGENT,
			memberStatus: MemberStatus.ACTIVE,
			memberGames: 0,
		},
	};
	const games = {
		findOne: jest.fn(({ _id }: any) =>
			Promise.resolve(_id.toString() === gameId.toString() ? { ...state.game } : null),
		),
		countDocuments: jest.fn(({ memberId: ownerId }: any) =>
			Promise.resolve(
				state.game.memberId.toString() === ownerId.toString() && state.game.gameStatus !== GameStatus.DELETE ? 1 : 0,
			),
		),
		updateOne: jest.fn((_filter: any, update: any) => {
			state.game.memberId = update.$set.memberId;
			return Promise.resolve({ modifiedCount: 1 });
		}),
	};
	const members = {
		findOne: jest.fn(({ _id }: any) =>
			Promise.resolve(_id.toString() === memberId.toString() ? { ...state.member } : null),
		),
		updateOne: jest.fn((_filter: any, update: any) => {
			state.member.memberGames += update.$inc.memberGames;
			return Promise.resolve({ modifiedCount: 1 });
		}),
	};
	const connection = {
		collection: jest.fn((name: string) => (name === 'games' ? games : members)),
	};
	return { connection, games, members, state, gameId, memberId };
}

describe('orphan Game owner repair', () => {
	afterEach(() => jest.restoreAllMocks());

	it('defaults to dry-run and validates required ObjectIds', () => {
		const gameId = new Types.ObjectId();
		const memberId = new Types.ObjectId();
		const parsed = parseRepairArguments(['--game-id', gameId.toString(), '--member-id', memberId.toString()]);

		expect(parsed).not.toBe('help');
		if (parsed !== 'help') expect(parsed.mode).toBe('dry-run');
		expect(() => parseRepairArguments([])).toThrow('--game-id and --member-id are required');
	});

	it('reports a dry run without changing the game or counter', async () => {
		const fixture = createRepairDatabase();
		jest.spyOn(console, 'log').mockImplementation();

		await runOrphanGameOwnerRepair(fixture.connection as any, {
			mode: 'dry-run',
			gameId: fixture.gameId,
			memberId: fixture.memberId,
		});

		expect(fixture.games.updateOne).not.toHaveBeenCalled();
		expect(fixture.members.updateOne).not.toHaveBeenCalled();
	});

	it('atomically reassigns once, verifies counters, and is idempotent', async () => {
		const fixture = createRepairDatabase();
		const session = {
			withTransaction: jest.fn(async (callback: () => Promise<void>) => callback()),
			endSession: jest.fn(),
		};
		jest.spyOn(mongoose, 'startSession').mockResolvedValue(session as any);
		jest.spyOn(console, 'log').mockImplementation();

		const options = { mode: 'apply' as const, gameId: fixture.gameId, memberId: fixture.memberId };
		await runOrphanGameOwnerRepair(fixture.connection as any, options);
		await runOrphanGameOwnerRepair(fixture.connection as any, options);

		expect(fixture.games.updateOne).toHaveBeenCalledTimes(1);
		expect(fixture.members.updateOne).toHaveBeenCalledTimes(1);
		expect(fixture.state.game.memberId).toEqual(fixture.memberId);
		expect(fixture.state.member.memberGames).toBe(1);
	});

	it('rejects a replacement member that is not an active AGENT', async () => {
		const fixture = createRepairDatabase();
		fixture.state.member.memberType = MemberType.USER;
		jest.spyOn(console, 'log').mockImplementation();

		await expect(
			runOrphanGameOwnerRepair(fixture.connection as any, {
				mode: 'dry-run',
				gameId: fixture.gameId,
				memberId: fixture.memberId,
			}),
		).rejects.toThrow('Replacement member must be an active AGENT');
	});
});

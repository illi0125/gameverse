/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Types } from 'mongoose';
import { NotificationService, idText } from './notification.service';
import { NotificationGroup, NotificationStatus, NotificationType } from '../../libs/enums/notification.enum';
import { LikeGroup } from '../../libs/enums/like.enum';
import { MemberStatus } from '../../libs/enums/member.enum';
import { NotificationEvent } from '../../libs/types/notification';

const id = () => new Types.ObjectId() as any;

/** bulkWrite that "inserts" every operation unless its dedupe key was already stored **/
const fakeBulkWrite = (existing = new Set<string>()) =>
	jest.fn().mockImplementation((ops: any[]) => {
		const upsertedIds: Record<number, unknown> = {};
		ops.forEach((op, index) => {
			const key = op.updateOne.filter.dedupeKey;
			if (!existing.has(key)) {
				existing.add(key);
				upsertedIds[index] = new Types.ObjectId();
			}
		});
		return Promise.resolve({ upsertedIds });
	});

const offlineGateway = () => ({
	onlineMembers: jest.fn().mockReturnValue([]),
	isMemberOnline: () => false,
	notifyMember: jest.fn(),
});

const makeService = (overrides: { notification?: any; follow?: any; like?: any; member?: any; gateway?: any } = {}) =>
	new NotificationService(
		overrides.notification ?? { bulkWrite: fakeBulkWrite() },
		overrides.follow ?? {},
		overrides.like ?? {},
		overrides.member ?? {},
		overrides.gateway ?? offlineGateway(),
	);

const gameLike = (authorId = id(), gameId = id()): NotificationEvent => ({
	notificationType: NotificationType.LIKE,
	notificationGroup: NotificationGroup.GAME,
	notificationTitle: 'Elden Ring',
	authorId,
	gameId,
});

const findOf = (value: unknown) =>
	jest.fn().mockReturnValue({ lean: () => ({ exec: jest.fn().mockResolvedValue(value) }) });

describe('NotificationService', () => {
	it('stores one unread notification for the receiver, keyed by its dedupe key', async () => {
		const bulkWrite = fakeBulkWrite();
		const service = makeService({ notification: { bulkWrite } });
		const event = gameLike();
		const receiverId = id();

		const stored = await service.notify(event, receiverId);

		expect(stored?.receiverId).toBe(receiverId);
		const op = bulkWrite.mock.calls[0][0][0].updateOne;
		expect(op.upsert).toBe(true);
		expect(op.filter).toEqual({ dedupeKey: NotificationService.dedupeKey(event, receiverId) });
		expect(op.update.$setOnInsert).toMatchObject({
			receiverId,
			authorId: event.authorId,
			gameId: event.gameId,
			notificationStatus: NotificationStatus.WAIT,
		});
		expect(op.update.$setOnInsert.dedupeExtra).toBeUndefined();
	});

	it('never notifies the actor about their own action', async () => {
		const bulkWrite = fakeBulkWrite();
		const service = makeService({ notification: { bulkWrite } });
		const event = gameLike();

		expect(await service.notify(event, event.authorId)).toBeNull();
		expect(bulkWrite).not.toHaveBeenCalled();
	});

	it('does not store a second notification when the same event repeats (unlike, then like again)', async () => {
		const service = makeService();
		const event = gameLike();
		const receiverId = id();

		expect(await service.notify(event, receiverId)).not.toBeNull();
		expect(await service.notify({ ...event }, receiverId)).toBeNull();
	});

	it('lets a deliberate repeat through with an extra dedupe part (re-answered inquiry)', async () => {
		const service = makeService();
		const event: NotificationEvent = {
			notificationType: NotificationType.INQUIRY_ANSWER,
			notificationGroup: NotificationGroup.INQUIRY,
			notificationTitle: 'Refund',
			authorId: id(),
			inquiryId: id(),
		};
		const receiverId = id();

		expect(await service.notify({ ...event, dedupeExtra: '1' }, receiverId)).not.toBeNull();
		expect(await service.notify({ ...event, dedupeExtra: '2' }, receiverId)).not.toBeNull();
	});

	it('rejects type/group pairs that do not exist and events without their target', async () => {
		const bulkWrite = fakeBulkWrite();
		const service = makeService({ notification: { bulkWrite } });

		expect(await service.notify({ ...gameLike(), notificationGroup: NotificationGroup.NOTICE }, id())).toBeNull();
		expect(await service.notify({ ...gameLike(), gameId: undefined }, id())).toBeNull();
		expect(await service.notify({ ...gameLike(), notificationTitle: '  ' }, id())).toBeNull();
		expect(await service.notify({ ...gameLike(), notificationType: 'HACK' as NotificationType }, id())).toBeNull();
		expect(bulkWrite).not.toHaveBeenCalled();
	});

	it('removes duplicate receivers and the author from a fan-out', async () => {
		const bulkWrite = fakeBulkWrite();
		const service = makeService({ notification: { bulkWrite } });
		const event = gameLike();
		const a = id();
		const b = id();

		const stored = await service.notifyMany(event, [a, new Types.ObjectId(String(a)) as any, event.authorId, b]);

		expect(stored.map((entry) => idText(entry.receiverId))).toEqual([a.toString(), b.toString()]);
	});

	it('writes large fan-outs in batches of 500', async () => {
		const bulkWrite = fakeBulkWrite();
		const service = makeService({ notification: { bulkWrite } });
		const receivers = Array.from({ length: 1201 }, () => id());

		const stored = await service.notifyMany(gameLike(), receivers);

		expect(bulkWrite.mock.calls.map((call) => call[0].length)).toEqual([500, 500, 201]);
		expect(stored).toHaveLength(1201);
	});

	it('never throws when the database fails, and keeps what a concurrent duplicate allowed', async () => {
		const failing = makeService({ notification: { bulkWrite: jest.fn().mockRejectedValue(new Error('down')) } });
		await expect(failing.notify(gameLike(), id())).resolves.toBeNull();

		const receivers = [id(), id()];
		const raced = Object.assign(new Error('E11000'), {
			code: 11000,
			result: { upsertedIds: { 1: new Types.ObjectId() } },
		});
		const partial = makeService({ notification: { bulkWrite: jest.fn().mockRejectedValue(raced) } });
		const stored = await partial.notifyMany(gameLike(), receivers);
		expect(stored.map((entry) => entry.receiverId)).toEqual([receivers[1]]);
	});

	it('clips long titles and descriptions', async () => {
		const bulkWrite = fakeBulkWrite();
		const service = makeService({ notification: { bulkWrite } });

		await service.notify(
			{ ...gameLike(), notificationTitle: 'x'.repeat(300), notificationDesc: 'y'.repeat(300) },
			id(),
		);

		const doc = bulkWrite.mock.calls[0][0][0].updateOne.update.$setOnInsert;
		expect(doc.notificationTitle).toHaveLength(120);
		expect(doc.notificationDesc).toHaveLength(200);
	});

	it('finds followers of the author for a new game', async () => {
		const followerId = id();
		const find = findOf([{ followerId }]);
		const service = makeService({ follow: { find } });
		const event: NotificationEvent = {
			notificationType: NotificationType.NEW_GAME,
			notificationGroup: NotificationGroup.GAME,
			notificationTitle: 'Hades',
			authorId: id(),
			gameId: id(),
		};

		const stored = await service.notifyFollowers(event);

		expect(find.mock.calls[0][0]).toEqual({ followingId: event.authorId });
		expect(stored[0].receiverId).toBe(followerId);
	});

	it('finds the members who liked a game for its release', async () => {
		const memberId = id();
		const gameId = id();
		const find = findOf([{ memberId }]);
		const service = makeService({ like: { find } });
		const event: NotificationEvent = {
			notificationType: NotificationType.GAME_RELEASE,
			notificationGroup: NotificationGroup.GAME,
			notificationTitle: 'Hades II',
			authorId: id(),
			gameId,
		};

		const stored = await service.notifyGameLikers(event, gameId);

		expect(find.mock.calls[0][0]).toEqual({ likeGroup: LikeGroup.GAME, likeRefId: gameId });
		expect(stored[0].receiverId).toBe(memberId);
	});

	it('announces to active members only, in batches, skipping the admin who published', async () => {
		const adminId = id();
		const members = [{ _id: adminId }, ...Array.from({ length: 600 }, () => ({ _id: id() }))];
		const find = jest.fn().mockReturnValue({
			lean: () => ({
				cursor: () => ({
					async *[Symbol.asyncIterator]() {
						for (const member of members) yield await Promise.resolve(member);
					},
				}),
			}),
		});
		const bulkWrite = fakeBulkWrite();
		const service = makeService({ notification: { bulkWrite }, member: { find } });

		const stored = await service.notifyActiveMembers({
			notificationType: NotificationType.ANNOUNCEMENT,
			notificationGroup: NotificationGroup.NOTICE,
			notificationTitle: 'Maintenance',
			authorId: adminId,
			noticeId: id(),
		});

		expect(find.mock.calls[0][0]).toEqual({ memberStatus: MemberStatus.ACTIVE });
		expect(stored).toHaveLength(600);
		expect(stored.some((entry) => idText(entry.receiverId) === adminId.toString())).toBe(false);
	});
});

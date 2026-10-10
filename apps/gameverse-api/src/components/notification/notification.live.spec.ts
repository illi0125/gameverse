/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Types } from 'mongoose';
import { NotificationService, idText } from './notification.service';
import { NotificationGroup, NotificationStatus, NotificationType } from '../../libs/enums/notification.enum';
import { NotificationEvent } from '../../libs/types/notification';

const id = () => new Types.ObjectId() as any;
const execOf = (value: unknown) => jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) });
const leanExecOf = (value: unknown) =>
	jest.fn().mockReturnValue({ lean: () => ({ exec: jest.fn().mockResolvedValue(value) }) });

/** A gateway where the given members have an open connection **/
const gatewayWith = (online: string[]) => ({
	onlineMembers: jest.fn((ids: string[]) => ids.filter((key) => online.includes(key))),
	isMemberOnline: jest.fn((key: string) => online.includes(key)),
	notifyMember: jest.fn().mockReturnValue(1),
});

const insertAll = jest
	.fn()
	.mockImplementation((ops: any[]) =>
		Promise.resolve({ upsertedIds: Object.fromEntries(ops.map((_, index) => [index, new Types.ObjectId()])) }),
	);

const like = (authorId = id()): NotificationEvent => ({
	notificationType: NotificationType.LIKE,
	notificationGroup: NotificationGroup.GAME,
	notificationTitle: 'Elden Ring',
	authorId,
	gameId: id(),
});

describe('Notification real-time delivery', () => {
	it('pushes a stored notification with its author and unread count to an online receiver', async () => {
		const receiver = id();
		const gateway = gatewayWith([idText(receiver)]);
		const author = { _id: id(), memberNick: 'Leo', memberImage: 'uploads/member/leo.jpg' };
		const aggregate = execOf([{ _id: receiver, total: 3 }]);
		const findById = leanExecOf(author);
		const service = new NotificationService(
			{ bulkWrite: insertAll, aggregate } as any,
			{} as any,
			{} as any,
			{ findById } as any,
			gateway as any,
		);
		const event = like(author._id);

		const stored = await service.notify(event, receiver);

		expect(gateway.notifyMember).toHaveBeenCalledTimes(1);
		const [target, payload] = gateway.notifyMember.mock.calls[0];
		expect(target).toBe(idText(receiver));
		expect(payload.event).toBe('notification');
		expect(payload.unread).toBe(3);
		expect(payload.notification).toMatchObject({
			_id: stored?._id,
			notificationType: NotificationType.LIKE,
			notificationStatus: NotificationStatus.WAIT,
			gameId: event.gameId,
			authorData: author,
		});
		expect(payload.notification.dedupeKey).toBeUndefined();
		expect(payload.notification.dedupeExtra).toBeUndefined();
		expect(findById.mock.calls[0][1]).toEqual({ memberNick: 1, memberImage: 1, memberType: 1 });
	});

	it('does no extra queries and sends nothing when no receiver is online', async () => {
		const gateway = gatewayWith([]);
		const aggregate = jest.fn();
		const findById = jest.fn();
		const service = new NotificationService(
			{ bulkWrite: insertAll, aggregate } as any,
			{} as any,
			{} as any,
			{ findById } as any,
			gateway as any,
		);

		expect(await service.notify(like(), id())).not.toBeNull();
		expect(aggregate).not.toHaveBeenCalled();
		expect(findById).not.toHaveBeenCalled();
		expect(gateway.notifyMember).not.toHaveBeenCalled();
	});

	it('sends nothing for a duplicate event (nothing new was stored)', async () => {
		const receiver = id();
		const gateway = gatewayWith([idText(receiver)]);
		const service = new NotificationService(
			{ bulkWrite: jest.fn().mockResolvedValue({ upsertedIds: {} }) } as any,
			{} as any,
			{} as any,
			{} as any,
			gateway as any,
		);

		expect(await service.notify(like(), receiver)).toBeNull();
		expect(gateway.notifyMember).not.toHaveBeenCalled();
	});

	it('counts unread for all online receivers of a fan-out in one query and skips offline ones', async () => {
		const online = [id(), id()];
		const offline = id();
		const gateway = gatewayWith(online.map(idText));
		const aggregate = execOf(online.map((receiverId, index) => ({ _id: receiverId, total: index + 1 })));
		const service = new NotificationService(
			{ bulkWrite: insertAll, aggregate } as any,
			{} as any,
			{} as any,
			{ findById: leanExecOf(null) } as any,
			gateway as any,
		);

		await service.notifyMany(like(), [...online, offline]);

		expect(aggregate).toHaveBeenCalledTimes(1);
		const match = aggregate.mock.calls[0][0][0].$match;
		expect(match.receiverId.$in.map(String)).toEqual(online.map(idText));
		expect(gateway.notifyMember.mock.calls.map((call) => [call[0], call[1].unread])).toEqual([
			[idText(online[0]), 1],
			[idText(online[1]), 2],
		]);
		expect(gateway.notifyMember.mock.calls[0][1].notification.authorData).toBeNull();
	});

	it('still returns what was stored when live delivery fails', async () => {
		const receiver = id();
		const service = new NotificationService(
			{
				bulkWrite: insertAll,
				aggregate: jest.fn().mockReturnValue({ exec: () => Promise.reject(new Error('x')) }),
			} as any,
			{} as any,
			{} as any,
			{ findById: leanExecOf(null) } as any,
			gatewayWith([idText(receiver)]) as any,
		);

		expect(await service.notify(like(), receiver)).not.toBeNull();
	});

	it('pushes the new unread count to the member’s other tabs after reading', async () => {
		const memberId = id();
		const gateway = gatewayWith([idText(memberId)]);
		const service = new NotificationService(
			{
				findOneAndUpdate: leanExecOf({ _id: 'n' }),
				updateMany: execOf({ modifiedCount: 2 }),
				countDocuments: execOf(0),
			} as any,
			{} as any,
			{} as any,
			{} as any,
			gateway as any,
		);

		await service.markNotificationRead(memberId, id());
		await service.markAllNotificationsRead(memberId);

		expect(gateway.notifyMember.mock.calls).toEqual([
			[idText(memberId), { event: 'notificationCount', unread: 0 }],
			[idText(memberId), { event: 'notificationCount', unread: 0 }],
		]);
	});

	it('does not push or count when nothing changed or the member is offline', async () => {
		const memberId = id();
		const countDocuments = jest.fn();
		const offline = gatewayWith([]);
		const service = new NotificationService(
			{ updateMany: execOf({ modifiedCount: 3 }), countDocuments } as any,
			{} as any,
			{} as any,
			{} as any,
			offline as any,
		);
		await service.markAllNotificationsRead(memberId);
		expect(countDocuments).not.toHaveBeenCalled();

		const online = gatewayWith([idText(memberId)]);
		const unchanged = new NotificationService(
			{ updateMany: execOf({ modifiedCount: 0 }), countDocuments } as any,
			{} as any,
			{} as any,
			{} as any,
			online as any,
		);
		await unchanged.markAllNotificationsRead(memberId);
		expect(online.notifyMember).not.toHaveBeenCalled();
	});
});

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Types } from 'mongoose';
import { NotificationService } from './notification.service';
import { NotificationResolver } from './notification.resolver';
import { NotificationsInquiry } from '../../libs/dto/notification/notification.input';
import { NotificationStatus, NotificationType } from '../../libs/enums/notification.enum';
import { AuthGuard } from '../auth/guards/auth.guard';

const id = () => new Types.ObjectId() as any;
const execOf = (value: unknown) => jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) });
const leanExecOf = (value: unknown) =>
	jest.fn().mockReturnValue({ lean: () => ({ exec: jest.fn().mockResolvedValue(value) }) });
const offlineGateway = { onlineMembers: () => [], isMemberOnline: () => false, notifyMember: jest.fn() };
const serviceWith = (model: any, gateway: any = offlineGateway) =>
	new NotificationService(model, {} as any, {} as any, {} as any, gateway);

describe('Notification reads and read states', () => {
	it('lists only the caller’s notifications, newest first, without the internal dedupe key', async () => {
		const aggregate = execOf([{ list: [], metaCounter: [] }]);
		const memberId = id();

		await serviceWith({ aggregate }).getMyNotifications(memberId, { page: 2, limit: 10 });

		const [match, sort, facet] = aggregate.mock.calls[0][0];
		expect(match.$match).toEqual({ receiverId: memberId });
		expect(sort.$sort).toEqual({ createdAt: -1, _id: -1 });
		expect(facet.$facet.list.slice(0, 3)).toEqual([{ $skip: 10 }, { $limit: 10 }, { $project: { dedupeKey: 0 } }]);
		expect(facet.$facet.list[3].$lookup).toMatchObject({ from: 'members', localField: 'authorId', as: 'authorData' });
		expect(facet.$facet.list[4].$unwind.preserveNullAndEmptyArrays).toBe(true);
	});

	it('filters by unread and by type list, still inside the caller’s own notifications', async () => {
		const aggregate = execOf([]);
		const memberId = id();
		const typeList = [NotificationType.LIKE, NotificationType.COMMENT];

		const result = await serviceWith({ aggregate }).getMyNotifications(memberId, {
			page: 1,
			limit: 5,
			search: { unreadOnly: true, typeList },
		});

		expect(aggregate.mock.calls[0][0][0].$match).toEqual({
			receiverId: memberId,
			notificationStatus: NotificationStatus.WAIT,
			notificationType: { $in: typeList },
		});
		expect(result).toEqual({ list: [], metaCounter: [] });
	});

	it('counts unread notifications from stored state for the caller only', async () => {
		const countDocuments = execOf(3);
		const memberId = id();

		expect(await serviceWith({ countDocuments }).getUnreadNotificationCount(memberId)).toBe(3);
		expect(countDocuments).toHaveBeenCalledWith({ receiverId: memberId, notificationStatus: NotificationStatus.WAIT });
	});

	it('marks one of the caller’s notifications read and stamps readAt', async () => {
		const findOneAndUpdate = leanExecOf({ _id: 'n', notificationStatus: NotificationStatus.READ });
		const memberId = id();
		const notificationId = id();

		await serviceWith({ findOneAndUpdate }).markNotificationRead(memberId, notificationId);

		const [filter, update, options] = findOneAndUpdate.mock.calls[0];
		expect(filter).toEqual({ _id: notificationId, receiverId: memberId, notificationStatus: NotificationStatus.WAIT });
		expect(update.$set.notificationStatus).toBe(NotificationStatus.READ);
		expect(update.$set.readAt).toBeInstanceOf(Date);
		expect(options.projection).toEqual({ dedupeKey: 0 });
	});

	it('is idempotent: marking an already-read notification returns it unchanged', async () => {
		const existing = { _id: 'n', notificationStatus: NotificationStatus.READ, readAt: new Date(0) };
		const findOneAndUpdate = leanExecOf(null);
		const findOne = leanExecOf(existing);
		const memberId = id();
		const notificationId = id();

		const result = await serviceWith({ findOneAndUpdate, findOne }).markNotificationRead(memberId, notificationId);

		expect(result).toBe(existing);
		expect(findOne.mock.calls[0][0]).toEqual({ _id: notificationId, receiverId: memberId });
	});

	it('treats another member’s notification as not found and changes nothing', async () => {
		const findOneAndUpdate = leanExecOf(null);
		const findOne = leanExecOf(null);

		await expect(serviceWith({ findOneAndUpdate, findOne }).markNotificationRead(id(), id())).rejects.toBeInstanceOf(
			InternalServerErrorException,
		);
	});

	it('marks all of the caller’s unread notifications read and returns how many', async () => {
		const updateMany = execOf({ modifiedCount: 4 });
		const memberId = id();

		expect(await serviceWith({ updateMany }).markAllNotificationsRead(memberId)).toBe(4);
		expect(updateMany.mock.calls[0][0]).toEqual({ receiverId: memberId, notificationStatus: NotificationStatus.WAIT });
	});

	it('requires a signed-in member on every operation', () => {
		for (const name of [
			'getMyNotifications',
			'getUnreadNotificationCount',
			'markNotificationRead',
			'markAllNotificationsRead',
		] as const) {
			expect(Reflect.getMetadata(GUARDS_METADATA, NotificationResolver.prototype[name])).toEqual([AuthGuard]);
		}
	});

	it('takes the receiver from the token and rejects malformed notification IDs', async () => {
		const markNotificationRead = jest.fn().mockResolvedValue({});
		const resolver = new NotificationResolver({ markNotificationRead } as any);
		const memberId = id();
		const notificationId = new Types.ObjectId();

		await expect(resolver.markNotificationRead('not-an-id', memberId)).rejects.toBeInstanceOf(BadRequestException);
		await resolver.markNotificationRead(notificationId.toHexString(), memberId);
		expect(markNotificationRead.mock.calls[0][0]).toBe(memberId);
		expect(String(markNotificationRead.mock.calls[0][1])).toBe(notificationId.toHexString());
	});

	it('caps page size at 50 and requires a positive page', async () => {
		const errors = async (input: object) =>
			(await validate(plainToInstance(NotificationsInquiry, input))).map((error) => error.property);

		expect(await errors({ page: 1, limit: 50 })).toEqual([]);
		expect(await errors({ page: 1, limit: 51 })).toEqual(['limit']);
		expect(await errors({ page: 0, limit: 10 })).toEqual(['page']);
	});
});

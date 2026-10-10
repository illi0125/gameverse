/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Types } from 'mongoose';
import { NoticeService } from './notice.service';
import { notificationStub } from '../notification/notification.testing';
import { NoticeResolver } from './notice.resolver';
import { NoticeCategory, NoticeStatus, SupportTopic } from '../../libs/enums/notice.enum';
import { MemberType } from '../../libs/enums/member.enum';

const aggregateModel = (rows: unknown[] = [{ list: [], metaCounter: [] }]) => {
	const aggregate = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(rows) });
	return { aggregate };
};

describe('NoticeService', () => {
	it('public reads only return ACTIVE items of the requested category and treat search text literally', async () => {
		const model = aggregateModel();
		const service = new NoticeService(model as any, notificationStub() as any);

		await service.getNotices({
			page: 1,
			limit: 10,
			search: { noticeCategory: NoticeCategory.FAQ, noticeTopic: SupportTopic.GAMES, text: 'a+b?' },
		});

		const [match] = model.aggregate.mock.calls[0][0];
		expect(match.$match.noticeStatus).toBe(NoticeStatus.ACTIVE);
		expect(match.$match.noticeCategory).toBe(NoticeCategory.FAQ);
		expect(match.$match.noticeTopic).toBe(SupportTopic.GAMES);
		expect(match.$match.noticeTitle.$regex.source).toBe('a\\+b\\?');
		// public lists do not join author profiles
		const facet = model.aggregate.mock.calls[0][0][2].$facet.list;
		expect(facet.some((stage: any) => stage.$lookup)).toBe(false);
	});

	it('admin lists keep items whose author no longer exists', async () => {
		const model = aggregateModel();
		const service = new NoticeService(model as any, notificationStub() as any);

		await service.getAllNoticesByAdmin({ page: 1, limit: 10, search: { noticeStatus: NoticeStatus.HOLD } });

		const stages = model.aggregate.mock.calls[0][0];
		expect(stages[0].$match).toEqual({ noticeStatus: NoticeStatus.HOLD });
		expect(stages[2].$facet.list).toContainEqual({
			$unwind: { path: '$memberData', preserveNullAndEmptyArrays: true },
		});
	});

	it('returns an empty page instead of failing when nothing matches', async () => {
		const service = new NoticeService(aggregateModel([]) as any, notificationStub() as any);
		await expect(
			service.getNotices({ page: 1, limit: 5, search: { noticeCategory: NoticeCategory.NOTICE } }),
		).resolves.toEqual({ list: [], metaCounter: [] });
	});

	it('refuses to create an item directly in DELETE status and stamps the author on create', async () => {
		const create = jest.fn().mockImplementation(async (doc) => doc);
		const service = new NoticeService({ create } as any, notificationStub() as any);
		const adminId = new Types.ObjectId();

		await expect(
			service.createNotice(adminId as any, {
				noticeCategory: NoticeCategory.NOTICE,
				noticeTitle: 'Hello',
				noticeContent: 'World',
				noticeStatus: NoticeStatus.DELETE,
			}),
		).rejects.toBeInstanceOf(BadRequestException);

		const created = await service.createNotice(adminId as any, {
			noticeCategory: NoticeCategory.NOTICE,
			noticeTitle: 'Hello',
			noticeContent: 'World',
		});
		expect(created.memberId).toBe(adminId);
	});

	it('only permanently removes items that were moved to DELETE first', async () => {
		const findOneAndDelete = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
		const service = new NoticeService({ findOneAndDelete } as any, notificationStub() as any);
		const id = new Types.ObjectId();

		await expect(service.removeNotice(id as any)).rejects.toBeInstanceOf(InternalServerErrorException);
		expect(findOneAndDelete).toHaveBeenCalledWith({ _id: id, noticeStatus: NoticeStatus.DELETE });
	});

	it('restricts every management operation to admins and leaves the public list open', () => {
		const roles = (name: keyof NoticeResolver) => Reflect.getMetadata('roles', NoticeResolver.prototype[name]);
		for (const name of ['getAllNoticesByAdmin', 'createNotice', 'updateNotice', 'removeNotice'] as const) {
			expect(roles(name)).toEqual([MemberType.ADMIN]);
		}
		expect(roles('getNotices')).toBeUndefined();
	});
});

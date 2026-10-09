/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { InternalServerErrorException } from '@nestjs/common';
import { Types } from 'mongoose';
import { InquiryService } from './inquiry.service';
import { InquiryResolver } from './inquiry.resolver';
import { InquiryStatus } from '../../libs/enums/inquiry.enum';
import { SupportTopic } from '../../libs/enums/notice.enum';
import { MemberType } from '../../libs/enums/member.enum';

const execOf = (value: unknown) => jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(value) });

describe('InquiryService', () => {
	it('creates inquiries as PENDING for the signed-in member, whatever the client sends', async () => {
		const create = jest.fn().mockImplementation(async (doc) => doc);
		const service = new InquiryService({ create } as any);
		const memberId = new Types.ObjectId();

		const created = await service.createInquiry(memberId as any, {
			inquiryTopic: SupportTopic.OTHER,
			inquiryTitle: 'Help',
			inquiryContent: 'Please help me',
			inquiryStatus: InquiryStatus.ANSWERED,
		} as any);

		expect(created.memberId).toBe(memberId);
		expect(created.inquiryStatus).toBe(InquiryStatus.PENDING);
	});

	it('lists only the caller’s own inquiries', async () => {
		const aggregate = execOf([{ list: [], metaCounter: [] }]);
		const service = new InquiryService({ aggregate } as any);
		const memberId = new Types.ObjectId();

		await service.getMyInquiries(memberId as any, { page: 1, limit: 5 });

		expect(aggregate.mock.calls[0][0][0].$match).toEqual({ memberId });
	});

	it('answers open inquiries, records who answered, and never answers a closed one', async () => {
		const findOneAndUpdate = execOf({ _id: 'x' });
		const service = new InquiryService({ findOneAndUpdate } as any);
		const adminId = new Types.ObjectId();
		const id = new Types.ObjectId();

		await service.answerInquiry(adminId as any, { _id: id as any, answerContent: 'Done' });

		const [filter, update] = findOneAndUpdate.mock.calls[0];
		expect(filter).toEqual({ _id: id, inquiryStatus: { $ne: InquiryStatus.CLOSED } });
		expect(update.inquiryStatus).toBe(InquiryStatus.ANSWERED);
		expect(update.answeredBy).toBe(adminId);
		expect(update.answeredAt).toBeInstanceOf(Date);
	});

	it('only marks an inquiry ANSWERED again when it has a reply', async () => {
		const findOneAndUpdate = execOf(null);
		const service = new InquiryService({ findOneAndUpdate } as any);
		const id = new Types.ObjectId();

		await expect(
			service.updateInquiryByAdmin({ _id: id as any, inquiryStatus: InquiryStatus.ANSWERED }),
		).rejects.toBeInstanceOf(InternalServerErrorException);
		expect(findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: id, answerContent: { $exists: true, $ne: '' } });
	});

	it('only permanently removes CLOSED inquiries', async () => {
		const findOneAndDelete = execOf(null);
		const service = new InquiryService({ findOneAndDelete } as any);
		const id = new Types.ObjectId();

		await expect(service.removeInquiry(id as any)).rejects.toBeInstanceOf(InternalServerErrorException);
		expect(findOneAndDelete).toHaveBeenCalledWith({ _id: id, inquiryStatus: InquiryStatus.CLOSED });
	});

	it('restricts the queue and answers to admins', () => {
		const roles = (name: keyof InquiryResolver) => Reflect.getMetadata('roles', InquiryResolver.prototype[name]);
		for (const name of ['getAllInquiriesByAdmin', 'answerInquiry', 'updateInquiryByAdmin', 'removeInquiry'] as const) {
			expect(roles(name)).toEqual([MemberType.ADMIN]);
		}
		expect(roles('createInquiry')).toBeUndefined();
		expect(roles('getMyInquiries')).toBeUndefined();
	});
});

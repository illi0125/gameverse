import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, PipelineStage } from 'mongoose';
import { Inquiries, Inquiry } from '../../libs/dto/inquiry/inquiry';
import { AllInquiriesInquiry, InquiryInput, MyInquiriesInquiry } from '../../libs/dto/inquiry/inquiry.input';
import { InquiryAnswer, InquiryStatusUpdate } from '../../libs/dto/inquiry/inquiry.update';
import { InquiryStatus } from '../../libs/enums/inquiry.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { escapeRegex, lookupMember } from '../../libs/config';
import { NotificationService } from '../notification/notification.service';
import { NotificationGroup, NotificationType } from '../../libs/enums/notification.enum';

@Injectable()
export class InquiryService {
	constructor(
		@InjectModel('Inquiry') private readonly inquiryModel: Model<Inquiry>,
		private readonly notificationService: NotificationService,
	) {}

	/** MEMBER **/

	public async createInquiry(memberId: ObjectId, input: InquiryInput): Promise<Inquiry> {
		try {
			return await this.inquiryModel.create({ ...input, memberId, inquiryStatus: InquiryStatus.PENDING });
		} catch (err) {
			console.log('Error, InquiryService.createInquiry:', (err as Error).message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
	}

	/** Only the caller's own inquiries, with answers **/
	public async getMyInquiries(memberId: ObjectId, input: MyInquiriesInquiry): Promise<Inquiries> {
		return this.aggregateInquiries({ memberId }, { createdAt: Direction.DESC }, input.page, input.limit, false);
	}

	/** ADMIN **/

	public async getAllInquiriesByAdmin(input: AllInquiriesInquiry): Promise<Inquiries> {
		const { inquiryStatus, inquiryTopic, text } = input.search;
		const match: T = {};
		if (inquiryStatus) match.inquiryStatus = inquiryStatus;
		if (inquiryTopic) match.inquiryTopic = inquiryTopic;
		if (text) match.inquiryTitle = { $regex: new RegExp(escapeRegex(text), 'i') };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		return this.aggregateInquiries(match, sort, input.page, input.limit, true);
	}

	/** Stores (or replaces) the reply and marks the inquiry ANSWERED; closed inquiries must be reopened first **/
	public async answerInquiry(adminId: ObjectId, input: InquiryAnswer): Promise<Inquiry> {
		const result = await this.inquiryModel
			.findOneAndUpdate(
				{ _id: input._id, inquiryStatus: { $ne: InquiryStatus.CLOSED } },
				{
					answerContent: input.answerContent,
					inquiryStatus: InquiryStatus.ANSWERED,
					answeredBy: adminId,
					answeredAt: new Date(),
				},
				{ new: true },
			)
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		await this.notificationService.notify(
			{
				notificationType: NotificationType.INQUIRY_ANSWER,
				notificationGroup: NotificationGroup.INQUIRY,
				notificationTitle: result.inquiryTitle,
				notificationDesc: result.answerContent,
				authorId: adminId,
				inquiryId: result._id,
				// Each (re)answer is its own notice
				dedupeExtra: String(result.answeredAt?.getTime?.() ?? Date.now()),
			},
			result.memberId,
		);
		return result;
	}

	/** Close, reopen (PENDING) or mark ANSWERED again; ANSWERED requires an existing reply **/
	public async updateInquiryByAdmin(input: InquiryStatusUpdate): Promise<Inquiry> {
		const filter: T = { _id: input._id };
		if (input.inquiryStatus === InquiryStatus.ANSWERED) filter.answerContent = { $exists: true, $ne: '' };
		const result = await this.inquiryModel
			.findOneAndUpdate(filter, { inquiryStatus: input.inquiryStatus }, { new: true })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		return result;
	}

	/** Permanent removal only for CLOSED inquiries **/
	public async removeInquiry(inquiryId: ObjectId): Promise<Inquiry> {
		const result = await this.inquiryModel
			.findOneAndDelete({ _id: inquiryId, inquiryStatus: InquiryStatus.CLOSED })
			.exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		return result;
	}

	private async aggregateInquiries(
		match: T,
		sort: T,
		page: number,
		limit: number,
		withAuthor: boolean,
	): Promise<Inquiries> {
		const list: PipelineStage.FacetPipelineStage[] = [{ $skip: (page - 1) * limit }, { $limit: limit }];
		if (withAuthor) {
			list.push(lookupMember, {
				$unwind: { path: '$memberData', preserveNullAndEmptyArrays: true },
			});
		}

		const result = await this.inquiryModel
			.aggregate([{ $match: match }, { $sort: sort }, { $facet: { list, metaCounter: [{ $count: 'total' }] } }])
			.exec();
		return result[0] ?? { list: [], metaCounter: [] };
	}
}

import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId, PipelineStage } from 'mongoose';
import { Notice, Notices } from '../../libs/dto/notice/notice';
import { AllNoticesInquiry, NoticeInput, NoticesInquiry } from '../../libs/dto/notice/notice.input';
import { NoticeUpdate } from '../../libs/dto/notice/notice.update';
import { NoticeCategory, NoticeStatus } from '../../libs/enums/notice.enum';
import { Direction, Message } from '../../libs/enums/common.enum';
import { T } from '../../libs/types/common';
import { escapeRegex, lookupMember } from '../../libs/config';
import { NotificationService } from '../notification/notification.service';
import { NotificationGroup, NotificationType } from '../../libs/enums/notification.enum';

@Injectable()
export class NoticeService {
	constructor(
		@InjectModel('Notice') private readonly noticeModel: Model<Notice>,
		private readonly notificationService: NotificationService,
	) {}

	/** PUBLIC: active items of one category (notices, FAQ, terms) **/
	public async getNotices(input: NoticesInquiry): Promise<Notices> {
		const { noticeCategory, noticeTopic, text } = input.search;
		const match: T = { noticeCategory, noticeStatus: NoticeStatus.ACTIVE };
		if (noticeTopic) match.noticeTopic = noticeTopic;
		if (text) match.noticeTitle = { $regex: new RegExp(escapeRegex(text), 'i') };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		return this.aggregateNotices(match, sort, input.page, input.limit, false);
	}

	/** ADMIN **/

	public async getAllNoticesByAdmin(input: AllNoticesInquiry): Promise<Notices> {
		const { noticeCategory, noticeStatus, noticeTopic, text } = input.search;
		const match: T = {};
		if (noticeCategory) match.noticeCategory = noticeCategory;
		if (noticeStatus) match.noticeStatus = noticeStatus;
		if (noticeTopic) match.noticeTopic = noticeTopic;
		if (text) match.noticeTitle = { $regex: new RegExp(escapeRegex(text), 'i') };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		return this.aggregateNotices(match, sort, input.page, input.limit, true);
	}

	public async createNotice(memberId: ObjectId, input: NoticeInput): Promise<Notice> {
		if (input.noticeStatus === NoticeStatus.DELETE) throw new BadRequestException(Message.BAD_REQUEST);
		let result: Notice;
		try {
			result = await this.noticeModel.create({ ...input, memberId });
		} catch (err) {
			console.log('Error, NoticeService.createNotice:', (err as Error).message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}
		this.announce(result);
		return result;
	}

	public async updateNotice(input: NoticeUpdate): Promise<Notice> {
		const { _id, ...changes } = input;
		const previous = await this.noticeModel
			.findById(_id, { noticeStatus: 1, noticeCategory: 1 })
			.lean<Pick<Notice, 'noticeStatus' | 'noticeCategory'>>()
			.exec();
		const result = await this.noticeModel.findOneAndUpdate({ _id }, changes, { new: true }).exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		// Only when it becomes a public announcement (draft published, or moved into NOTICE), not on every edit
		const wasPublicNotice =
			previous?.noticeStatus === NoticeStatus.ACTIVE && previous?.noticeCategory === NoticeCategory.NOTICE;
		if (!wasPublicNotice) this.announce(result);
		return result;
	}

	/** A public NOTICE reaches every active member once (dedupe per notice); background, never blocks the save **/
	private announce(notice: Notice): void {
		if (notice.noticeStatus !== NoticeStatus.ACTIVE || notice.noticeCategory !== NoticeCategory.NOTICE) return;
		void this.notificationService.notifyActiveMembers({
			notificationType: NotificationType.ANNOUNCEMENT,
			notificationGroup: NotificationGroup.NOTICE,
			notificationTitle: notice.noticeTitle,
			authorId: notice.memberId,
			noticeId: notice._id,
		});
	}

	/** Permanent removal only after the item was moved to DELETE (same rule as games) **/
	public async removeNotice(noticeId: ObjectId): Promise<Notice> {
		const result = await this.noticeModel.findOneAndDelete({ _id: noticeId, noticeStatus: NoticeStatus.DELETE }).exec();
		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		return result;
	}

	private async aggregateNotices(
		match: T,
		sort: T,
		page: number,
		limit: number,
		withAuthor: boolean,
	): Promise<Notices> {
		const list: PipelineStage.FacetPipelineStage[] = [{ $skip: (page - 1) * limit }, { $limit: limit }];
		if (withAuthor) {
			list.push(lookupMember, {
				$unwind: { path: '$memberData', preserveNullAndEmptyArrays: true },
			});
		}

		const result = await this.noticeModel
			.aggregate([{ $match: match }, { $sort: sort }, { $facet: { list, metaCounter: [{ $count: 'total' }] } }])
			.exec();
		return result[0] ?? { list: [], metaCounter: [] };
	}
}

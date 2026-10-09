import { Schema } from 'mongoose';
import { NoticeCategory, NoticeStatus, SupportTopic } from '../libs/enums/notice.enum';

const NoticeSchema = new Schema(
	{
		noticeCategory: {
			type: String,
			enum: NoticeCategory,
			required: true,
		},

		noticeStatus: {
			type: String,
			enum: NoticeStatus,
			default: NoticeStatus.ACTIVE,
		},

		/** FAQ grouping; empty for notices and terms **/
		noticeTopic: {
			type: String,
			enum: SupportTopic,
		},

		noticeTitle: {
			type: String,
			required: true,
		},

		noticeContent: {
			type: String,
			required: true,
		},

		/** Highlighted on the public notice list (promotions, events) **/
		noticeEvent: {
			type: Boolean,
			default: false,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},
	},
	{ timestamps: true, collection: 'notices' },
);

NoticeSchema.index({ noticeCategory: 1, noticeStatus: 1, noticeTopic: 1, createdAt: -1 });

export default NoticeSchema;

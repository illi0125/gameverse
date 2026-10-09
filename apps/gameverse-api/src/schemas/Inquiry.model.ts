import { Schema } from 'mongoose';
import { InquiryStatus } from '../libs/enums/inquiry.enum';
import { SupportTopic } from '../libs/enums/notice.enum';

const InquirySchema = new Schema(
	{
		inquiryTopic: {
			type: String,
			enum: SupportTopic,
			required: true,
		},

		inquiryStatus: {
			type: String,
			enum: InquiryStatus,
			default: InquiryStatus.PENDING,
		},

		inquiryTitle: {
			type: String,
			required: true,
		},

		inquiryContent: {
			type: String,
			required: true,
		},

		answerContent: {
			type: String,
		},

		answeredBy: {
			type: Schema.Types.ObjectId,
			ref: 'Member',
		},

		answeredAt: {
			type: Date,
		},

		memberId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},
	},
	{ timestamps: true, collection: 'inquiries' },
);

InquirySchema.index({ memberId: 1, createdAt: -1 });
InquirySchema.index({ inquiryStatus: 1, createdAt: -1 });

export default InquirySchema;

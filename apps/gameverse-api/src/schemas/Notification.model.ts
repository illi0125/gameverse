import { Schema } from 'mongoose';
import { NotificationGroup, NotificationStatus, NotificationType } from '../libs/enums/notification.enum';

const NotificationSchema = new Schema(
	{
		notificationType: {
			type: String,
			enum: NotificationType,
			required: true,
		},

		notificationStatus: {
			type: String,
			enum: NotificationStatus,
			default: NotificationStatus.WAIT,
		},

		notificationGroup: {
			type: String,
			enum: NotificationGroup,
			required: true,
		},

		notificationTitle: {
			type: String,
			required: true,
		},

		notificationDesc: {
			type: String,
		},

		/** The member who caused it (the admin for moderation, support replies and announcements) **/
		authorId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		receiverId: {
			type: Schema.Types.ObjectId,
			required: true,
			ref: 'Member',
		},

		gameId: {
			type: Schema.Types.ObjectId,
			ref: 'Game',
		},

		articleId: {
			type: Schema.Types.ObjectId,
			ref: 'BoardArticle',
		},

		inquiryId: {
			type: Schema.Types.ObjectId,
			ref: 'Inquiry',
		},

		noticeId: {
			type: Schema.Types.ObjectId,
			ref: 'Notice',
		},

		commentId: {
			type: Schema.Types.ObjectId,
			ref: 'Comment',
		},

		readAt: {
			type: Date,
		},

		/** One notification per real event: repeated likes, follows or publishes never create a second one **/
		dedupeKey: {
			type: String,
			required: true,
		},
	},
	{ timestamps: true, collection: 'notifications' },
);

/** Matches the list sort (newest first, _id as tie-break) so paging never sorts in memory **/
NotificationSchema.index({ receiverId: 1, createdAt: -1, _id: -1 });
NotificationSchema.index({ receiverId: 1, notificationStatus: 1 });
NotificationSchema.index({ dedupeKey: 1 }, { unique: true });

export default NotificationSchema;

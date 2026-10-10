import { ObjectId } from 'mongoose';
import { NotificationGroup, NotificationType } from '../enums/notification.enum';

/** What an event hands to NotificationService; the recipient always comes from server data, never the client **/
export interface NotificationEvent {
	notificationType: NotificationType;
	notificationGroup: NotificationGroup;
	notificationTitle: string;
	notificationDesc?: string;
	authorId: ObjectId;
	gameId?: ObjectId;
	articleId?: ObjectId;
	inquiryId?: ObjectId;
	noticeId?: ObjectId;
	commentId?: ObjectId;
	/** Extra dedupe part for events that may legitimately repeat (e.g. a re-answered inquiry) **/
	dedupeExtra?: string;
}

/** A notification that was actually stored (not a duplicate or self-notification) **/
export interface StoredNotification {
	_id: ObjectId;
	receiverId: ObjectId;
}

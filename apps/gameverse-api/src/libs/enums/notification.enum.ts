import { registerEnumType } from '@nestjs/graphql';

export enum NotificationType {
	LIKE = 'LIKE',
	COMMENT = 'COMMENT',
	FOLLOW = 'FOLLOW',
	NEW_GAME = 'NEW_GAME',
	GAME_RELEASE = 'GAME_RELEASE',
	INQUIRY_ANSWER = 'INQUIRY_ANSWER',
	MODERATION = 'MODERATION',
	ANNOUNCEMENT = 'ANNOUNCEMENT',
}
registerEnumType(NotificationType, {
	name: 'NotificationType',
});

export enum NotificationStatus {
	WAIT = 'WAIT',
	READ = 'READ',
}
registerEnumType(NotificationStatus, {
	name: 'NotificationStatus',
});

export enum NotificationGroup {
	MEMBER = 'MEMBER',
	ARTICLE = 'ARTICLE',
	GAME = 'GAME',
	INQUIRY = 'INQUIRY',
	NOTICE = 'NOTICE',
}
registerEnumType(NotificationGroup, {
	name: 'NotificationGroup',
});

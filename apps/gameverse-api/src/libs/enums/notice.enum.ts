import { registerEnumType } from '@nestjs/graphql';

export enum NoticeCategory {
	NOTICE = 'NOTICE',
	FAQ = 'FAQ',
	TERMS = 'TERMS',
	/** Legacy value kept for compatibility; 1:1 inquiries live in their own collection **/
	INQUIRY = 'INQUIRY',
}
registerEnumType(NoticeCategory, {
	name: 'NoticeCategory',
});

export enum NoticeStatus {
	HOLD = 'HOLD',
	ACTIVE = 'ACTIVE',
	DELETE = 'DELETE',
}
registerEnumType(NoticeStatus, {
	name: 'NoticeStatus',
});

/** Shared by FAQ entries (noticeTopic) and 1:1 inquiries (inquiryTopic); mirrors the public FAQ tabs **/
export enum SupportTopic {
	GAMES = 'GAMES',
	PAYMENT = 'PAYMENT',
	PLAYERS = 'PLAYERS',
	DEVELOPERS = 'DEVELOPERS',
	MEMBERSHIP = 'MEMBERSHIP',
	COMMUNITY = 'COMMUNITY',
	OTHER = 'OTHER',
}
registerEnumType(SupportTopic, {
	name: 'SupportTopic',
});

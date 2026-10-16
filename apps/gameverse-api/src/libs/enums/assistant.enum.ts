import { registerEnumType } from '@nestjs/graphql';

/** Expected outcomes are returned, not thrown, so the frontend shows them inline instead of as a global alert **/
export enum AssistantReplyStatus {
	OK = 'OK',
	LIMITED = 'LIMITED',
	UNAVAILABLE = 'UNAVAILABLE',
}
registerEnumType(AssistantReplyStatus, {
	name: 'AssistantReplyStatus',
});

export enum AssistantRole {
	USER = 'USER',
	ASSISTANT = 'ASSISTANT',
}
registerEnumType(AssistantRole, {
	name: 'AssistantRole',
});

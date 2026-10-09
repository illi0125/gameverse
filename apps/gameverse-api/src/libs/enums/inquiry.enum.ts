import { registerEnumType } from '@nestjs/graphql';

export enum InquiryStatus {
	PENDING = 'PENDING',
	ANSWERED = 'ANSWERED',
	CLOSED = 'CLOSED',
}
registerEnumType(InquiryStatus, {
	name: 'InquiryStatus',
});

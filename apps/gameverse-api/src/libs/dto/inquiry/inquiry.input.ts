import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { type ObjectId } from 'mongoose';
import { InquiryStatus } from '../../enums/inquiry.enum';
import { SupportTopic } from '../../enums/notice.enum';
import { Direction } from '../../enums/common.enum';
import { availableInquirySorts } from '../../config';

@InputType()
export class InquiryInput {
	@IsNotEmpty()
	@Field(() => SupportTopic)
	inquiryTopic: SupportTopic;

	@IsNotEmpty()
	@Length(3, 100)
	@Field(() => String)
	inquiryTitle: string;

	@IsNotEmpty()
	@Length(5, 2000)
	@Field(() => String)
	inquiryContent: string;

	memberId?: ObjectId;
}

/** A member's own inquiries, newest first **/
@InputType()
export class MyInquiriesInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;
}

@InputType()
class AIISearch {
	@IsOptional()
	@Field(() => InquiryStatus, { nullable: true })
	inquiryStatus?: InquiryStatus;

	@IsOptional()
	@Field(() => SupportTopic, { nullable: true })
	inquiryTopic?: SupportTopic;

	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;
}

@InputType()
export class AllInquiriesInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableInquirySorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => AIISearch)
	search: AIISearch;
}

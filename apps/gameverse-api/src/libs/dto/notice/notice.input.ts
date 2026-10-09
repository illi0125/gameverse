import { Field, InputType, Int } from '@nestjs/graphql';
import { IsBoolean, IsIn, IsNotEmpty, IsOptional, Length, Min } from 'class-validator';
import { type ObjectId } from 'mongoose';
import { NoticeCategory, NoticeStatus, SupportTopic } from '../../enums/notice.enum';
import { Direction } from '../../enums/common.enum';
import { availableNoticeSorts } from '../../config';

@InputType()
export class NoticeInput {
	@IsNotEmpty()
	@Field(() => NoticeCategory)
	noticeCategory: NoticeCategory;

	@IsOptional()
	@Field(() => SupportTopic, { nullable: true })
	noticeTopic?: SupportTopic;

	@IsNotEmpty()
	@Length(3, 150)
	@Field(() => String)
	noticeTitle: string;

	@IsNotEmpty()
	@Length(3, 5000)
	@Field(() => String)
	noticeContent: string;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true })
	noticeEvent?: boolean;

	/** HOLD keeps it as a draft; DELETE is not allowed on create **/
	@IsOptional()
	@IsIn([NoticeStatus.HOLD, NoticeStatus.ACTIVE])
	@Field(() => NoticeStatus, { nullable: true })
	noticeStatus?: NoticeStatus;

	memberId?: ObjectId;
}

@InputType()
class NISearch {
	@IsNotEmpty()
	@Field(() => NoticeCategory)
	noticeCategory: NoticeCategory;

	@IsOptional()
	@Field(() => SupportTopic, { nullable: true })
	noticeTopic?: SupportTopic;

	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;
}

/** Public: ACTIVE items of one category **/
@InputType()
export class NoticesInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableNoticeSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => NISearch)
	search: NISearch;
}

@InputType()
class ANISearch {
	@IsOptional()
	@Field(() => NoticeCategory, { nullable: true })
	noticeCategory?: NoticeCategory;

	@IsOptional()
	@Field(() => NoticeStatus, { nullable: true })
	noticeStatus?: NoticeStatus;

	@IsOptional()
	@Field(() => SupportTopic, { nullable: true })
	noticeTopic?: SupportTopic;

	@IsOptional()
	@Field(() => String, { nullable: true })
	text?: string;
}

/** Admin: every status **/
@InputType()
export class AllNoticesInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@IsIn(availableNoticeSorts)
	@Field(() => String, { nullable: true })
	sort?: string;

	@IsOptional()
	@Field(() => Direction, { nullable: true })
	direction?: Direction;

	@IsNotEmpty()
	@Field(() => ANISearch)
	search: ANISearch;
}

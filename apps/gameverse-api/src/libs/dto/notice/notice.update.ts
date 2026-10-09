import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsNotEmpty, IsOptional, Length } from 'class-validator';
import { type ObjectId } from 'mongoose';
import { NoticeCategory, NoticeStatus, SupportTopic } from '../../enums/notice.enum';

@InputType()
export class NoticeUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@IsOptional()
	@Field(() => NoticeCategory, { nullable: true })
	noticeCategory?: NoticeCategory;

	@IsOptional()
	@Field(() => SupportTopic, { nullable: true })
	noticeTopic?: SupportTopic;

	@IsOptional()
	@Field(() => NoticeStatus, { nullable: true })
	noticeStatus?: NoticeStatus;

	@IsOptional()
	@Length(3, 150)
	@Field(() => String, { nullable: true })
	noticeTitle?: string;

	@IsOptional()
	@Length(3, 5000)
	@Field(() => String, { nullable: true })
	noticeContent?: string;

	@IsOptional()
	@IsBoolean()
	@Field(() => Boolean, { nullable: true })
	noticeEvent?: boolean;
}

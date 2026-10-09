import { Field, ObjectType } from '@nestjs/graphql';
import { type ObjectId } from 'mongoose';
import { NoticeCategory, NoticeStatus, SupportTopic } from '../../enums/notice.enum';
import { Member, TotalCounter } from '../member/member';

@ObjectType()
export class Notice {
	@Field(() => String)
	_id: ObjectId;

	@Field(() => NoticeCategory)
	noticeCategory: NoticeCategory;

	@Field(() => NoticeStatus)
	noticeStatus: NoticeStatus;

	@Field(() => SupportTopic, { nullable: true })
	noticeTopic?: SupportTopic;

	@Field(() => String)
	noticeTitle: string;

	@Field(() => String)
	noticeContent: string;

	@Field(() => Boolean, { nullable: true })
	noticeEvent?: boolean;

	@Field(() => String)
	memberId: ObjectId;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	/** from aggregation (admin lists) **/

	@Field(() => Member, { nullable: true })
	memberData?: Member | null;
}

@ObjectType()
export class Notices {
	@Field(() => [Notice])
	list: Notice[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}

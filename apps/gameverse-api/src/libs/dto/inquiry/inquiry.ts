import { Field, ObjectType } from '@nestjs/graphql';
import { type ObjectId } from 'mongoose';
import { InquiryStatus } from '../../enums/inquiry.enum';
import { SupportTopic } from '../../enums/notice.enum';
import { Member, TotalCounter } from '../member/member';

@ObjectType()
export class Inquiry {
	@Field(() => String)
	_id: ObjectId;

	@Field(() => SupportTopic)
	inquiryTopic: SupportTopic;

	@Field(() => InquiryStatus)
	inquiryStatus: InquiryStatus;

	@Field(() => String)
	inquiryTitle: string;

	@Field(() => String)
	inquiryContent: string;

	@Field(() => String, { nullable: true })
	answerContent?: string;

	@Field(() => Date, { nullable: true })
	answeredAt?: Date;

	@Field(() => String, { nullable: true })
	answeredBy?: ObjectId;

	@Field(() => String)
	memberId: ObjectId;

	@Field(() => Date)
	createdAt: Date;

	@Field(() => Date)
	updatedAt: Date;

	/** from aggregation (admin lists): the member who asked **/

	@Field(() => Member, { nullable: true })
	memberData?: Member | null;
}

@ObjectType()
export class Inquiries {
	@Field(() => [Inquiry])
	list: Inquiry[];

	@Field(() => [TotalCounter], { nullable: true })
	metaCounter: TotalCounter[];
}

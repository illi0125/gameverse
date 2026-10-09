import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, Length } from 'class-validator';
import { type ObjectId } from 'mongoose';
import { InquiryStatus } from '../../enums/inquiry.enum';

/** Admin answer: stores the reply and marks the inquiry ANSWERED **/
@InputType()
export class InquiryAnswer {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@IsNotEmpty()
	@Length(2, 2000)
	@Field(() => String)
	answerContent: string;
}

/** Admin status change (close or reopen) **/
@InputType()
export class InquiryStatusUpdate {
	@IsNotEmpty()
	@Field(() => String)
	_id: ObjectId;

	@IsNotEmpty()
	@Field(() => InquiryStatus)
	inquiryStatus: InquiryStatus;
}

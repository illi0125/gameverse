import { Field, ObjectType } from '@nestjs/graphql';
import { AssistantReplyStatus } from '../../enums/assistant.enum';

@ObjectType()
export class AssistantStatus {
	@Field(() => Boolean)
	enabled: boolean;
}

@ObjectType()
export class AssistantReply {
	@Field(() => AssistantReplyStatus)
	status: AssistantReplyStatus;

	/** Plain text; render it as text, never as HTML **/
	@Field(() => String)
	answer: string;

	/** FAQ / notice ids the answer is based on **/
	@Field(() => [String])
	sourceIds: string[];

	/** The question needs a person: show the 1:1 inquiry button **/
	@Field(() => Boolean)
	suggestInquiry: boolean;
}

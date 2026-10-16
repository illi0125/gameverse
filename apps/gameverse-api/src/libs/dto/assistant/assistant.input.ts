import { Field, InputType } from '@nestjs/graphql';
import { ArrayMaxSize, IsArray, IsIn, IsNotEmpty, IsOptional, IsString, Length, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AssistantRole } from '../../enums/assistant.enum';

export const ASSISTANT_QUESTION_MAX = 500;
export const ASSISTANT_TURN_MAX = 1500;
export const ASSISTANT_HISTORY_MAX = 6;

@InputType()
export class AssistantTurnInput {
	@IsIn(Object.values(AssistantRole))
	@Field(() => AssistantRole)
	role: AssistantRole;

	@IsString()
	@Length(1, ASSISTANT_TURN_MAX)
	@Field(() => String)
	text: string;
}

@InputType()
export class AssistantInput {
	@IsNotEmpty()
	@IsString()
	@Length(2, ASSISTANT_QUESTION_MAX)
	@Field(() => String)
	question: string;

	/** Earlier turns of this conversation, oldest first; kept only by the browser **/
	@IsOptional()
	@IsArray()
	@ArrayMaxSize(ASSISTANT_HISTORY_MAX)
	@ValidateNested({ each: true })
	@Type(() => AssistantTurnInput)
	@Field(() => [AssistantTurnInput], { nullable: true })
	history?: AssistantTurnInput[];
}

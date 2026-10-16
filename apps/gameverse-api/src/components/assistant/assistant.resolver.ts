import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Types } from 'mongoose';
import { AssistantService } from './assistant.service';
import { AssistantReply, AssistantStatus } from '../../libs/dto/assistant/assistant';
import { AssistantInput } from '../../libs/dto/assistant/assistant.input';
import { WithoutGuard } from '../auth/guards/without.guard';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';

@Resolver()
export class AssistantResolver {
	constructor(private readonly assistantService: AssistantService) {}

	@UseGuards(WithoutGuard)
	@Query(() => AssistantStatus)
	public getAssistantStatus(): AssistantStatus {
		console.log('Query: getAssistantStatus');
		return this.assistantService.getStatus();
	}

	@UseGuards(AuthGuard)
	@Mutation(() => AssistantReply)
	public async askAssistant(
		@Args('input') input: AssistantInput,
		@AuthMember('_id') memberId: Types.ObjectId,
	): Promise<AssistantReply> {
		console.log('Mutation: askAssistant');
		return await this.assistantService.ask(memberId.toString(), input);
	}
}

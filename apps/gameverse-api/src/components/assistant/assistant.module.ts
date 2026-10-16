import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import NoticeSchema from '../../schemas/Notice.model';
import { AuthModule } from '../auth/auth.module';
import { AssistantResolver } from './assistant.resolver';
import { AssistantService } from './assistant.service';
import { AssistantLimitService } from '../../libs/security/assistant-limits';
import { AI_CLIENT, aiClientFactory, ASSISTANT_SETTINGS, assistantSettingsFactory } from './assistant.config';

/** AI support assistant: read-only answers from public FAQ entries and notices **/
@Module({
	imports: [MongooseModule.forFeature([{ name: 'Notice', schema: NoticeSchema }]), AuthModule, ConfigModule],
	providers: [
		AssistantResolver,
		AssistantService,
		AssistantLimitService,
		{ provide: ASSISTANT_SETTINGS, inject: [ConfigService], useFactory: assistantSettingsFactory },
		{ provide: AI_CLIENT, inject: [ASSISTANT_SETTINGS], useFactory: aiClientFactory },
	],
})
export class AssistantModule {}

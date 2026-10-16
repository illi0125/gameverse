import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApiError, Content, FinishReason, ThinkingLevel } from '@google/genai';
import { AssistantReply, AssistantStatus } from '../../libs/dto/assistant/assistant';
import {
	ASSISTANT_HISTORY_MAX,
	ASSISTANT_QUESTION_MAX,
	ASSISTANT_TURN_MAX,
	AssistantInput,
} from '../../libs/dto/assistant/assistant.input';
import { AssistantReplyStatus, AssistantRole } from '../../libs/enums/assistant.enum';
import { NoticeCategory, NoticeStatus } from '../../libs/enums/notice.enum';
import { AssistantLimitService } from '../../libs/security/assistant-limits';
import { AI_CLIENT, ASSISTANT_SETTINGS } from './assistant.config';
import type { AiClient, AssistantSettings } from './assistant.config';
import { ASSISTANT_RULES, buildKnowledge, KnowledgeItem, REPLY_SCHEMA } from './assistant.prompt';

export const KNOWLEDGE_TTL_MS = 5 * 60 * 1000;
export const KNOWLEDGE_FAQ_LIMIT = 200;
export const KNOWLEDGE_NOTICE_LIMIT = 20;
export const MAX_OUTPUT_TOKENS = 4096;

export const UNAVAILABLE_ANSWER = "Sorry, I can't answer right now. Please send your question to our team with Ask us.";
export const LIMITED_ANSWER =
	"You've reached the question limit for now. Please try again later, or send your question to our team with Ask us.";

interface Knowledge {
	text: string;
	ids: Set<string>;
	loadedAt: number;
}

const fail = (status: AssistantReplyStatus, answer: string): AssistantReply => ({
	status,
	answer,
	sourceIds: [],
	suggestInquiry: true,
});

@Injectable()
export class AssistantService {
	private readonly logger = new Logger('Assistant');
	private knowledge: Knowledge | null = null;

	constructor(
		@InjectModel('Notice') private readonly noticeModel: Model<KnowledgeItem>,
		@Inject(ASSISTANT_SETTINGS) private readonly settings: AssistantSettings,
		@Inject(AI_CLIENT) private readonly client: AiClient | null,
		private readonly limits: AssistantLimitService,
	) {}

	public getStatus(): AssistantStatus {
		return { enabled: this.isEnabled() };
	}

	public async ask(memberId: string, input: AssistantInput): Promise<AssistantReply> {
		if (!this.isEnabled() || !this.client) return fail(AssistantReplyStatus.UNAVAILABLE, UNAVAILABLE_ANSWER);
		if (!this.limits.allow(memberId, this.settings.dailyLimit))
			return fail(AssistantReplyStatus.LIMITED, LIMITED_ANSWER);

		const started = Date.now();
		try {
			const knowledge = await this.loadKnowledge();
			const response = await this.client.models.generateContent({
				model: this.settings.model,
				contents: this.buildContents(input),
				config: {
					// Rules first, then the knowledge: a stable prefix Gemini can cache implicitly between questions
					systemInstruction: `${ASSISTANT_RULES}\n\n${knowledge.text}`,
					responseMimeType: 'application/json',
					responseJsonSchema: REPLY_SCHEMA,
					maxOutputTokens: MAX_OUTPUT_TOKENS,
					thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
				},
			});

			const candidate = response.candidates?.[0];
			const usage = response.usageMetadata;
			this.logger.log(
				`member=${memberId} model=${this.settings.model} finish=${candidate?.finishReason ?? 'none'} ` +
					`blocked=${response.promptFeedback?.blockReason ?? '-'} in=${usage?.promptTokenCount ?? 0} ` +
					`cached=${usage?.cachedContentTokenCount ?? 0} out=${usage?.candidatesTokenCount ?? 0} ` +
					`thoughts=${usage?.thoughtsTokenCount ?? 0} ms=${Date.now() - started}`,
			);

			// Blocked prompt, safety stop, cut-off answer, ...: nothing trustworthy to show
			if (!candidate || candidate.finishReason !== FinishReason.STOP)
				return fail(AssistantReplyStatus.UNAVAILABLE, UNAVAILABLE_ANSWER);

			const reply = this.parseReply(response.text ?? '', knowledge.ids);
			return reply ?? fail(AssistantReplyStatus.UNAVAILABLE, UNAVAILABLE_ANSWER);
		} catch (err) {
			if (err instanceof ApiError && err.status === 429)
				this.logger.warn(`member=${memberId} rate limited by the AI API`);
			else if (err instanceof ApiError) this.logger.error(`member=${memberId} AI API error ${err.status}`);
			else this.logger.error(`member=${memberId} ${err instanceof Error ? err.message : 'unknown error'}`);
			return fail(AssistantReplyStatus.UNAVAILABLE, UNAVAILABLE_ANSWER);
		}
	}

	private isEnabled(): boolean {
		return this.settings.enabled && this.client !== null;
	}

	/** Last few turns, starting with a member turn, then the question; lengths are clamped again in case validation is bypassed **/
	private buildContents(input: AssistantInput): Content[] {
		const turns = (input.history ?? []).slice(-ASSISTANT_HISTORY_MAX).map((turn): Content => ({
			role: turn.role === AssistantRole.ASSISTANT ? 'model' : 'user',
			parts: [{ text: String(turn.text).slice(0, ASSISTANT_TURN_MAX) }],
		}));
		while (turns.length && turns[0].role !== 'user') turns.shift();
		return [
			...turns,
			{ role: 'user', parts: [{ text: String(input.question).trim().slice(0, ASSISTANT_QUESTION_MAX) }] },
		];
	}

	private parseReply(text: string, knownIds: Set<string>): AssistantReply | null {
		try {
			const parsed = JSON.parse(text) as { answer?: unknown; sourceIds?: unknown; suggestInquiry?: unknown };
			if (typeof parsed.answer !== 'string' || !parsed.answer.trim()) return null;
			const sourceIds = Array.isArray(parsed.sourceIds)
				? [...new Set(parsed.sourceIds.map(String).filter((id) => knownIds.has(id)))]
				: [];
			return {
				status: AssistantReplyStatus.OK,
				answer: parsed.answer.trim(),
				sourceIds,
				suggestInquiry: parsed.suggestInquiry === true,
			};
		} catch {
			return null;
		}
	}

	/** Public FAQ entries and the latest notices, cached for a few minutes so admin edits show up soon **/
	private async loadKnowledge(now = Date.now()): Promise<Knowledge> {
		if (this.knowledge && now - this.knowledge.loadedAt < KNOWLEDGE_TTL_MS) return this.knowledge;

		const fields = '_id noticeCategory noticeTopic noticeTitle noticeContent createdAt';
		const [faqs, notices] = await Promise.all([
			this.noticeModel
				.find({ noticeCategory: NoticeCategory.FAQ, noticeStatus: NoticeStatus.ACTIVE })
				.select(fields)
				.sort({ createdAt: 1, _id: 1 })
				.limit(KNOWLEDGE_FAQ_LIMIT)
				.lean<KnowledgeItem[]>()
				.exec(),
			this.noticeModel
				.find({ noticeCategory: NoticeCategory.NOTICE, noticeStatus: NoticeStatus.ACTIVE })
				.select(fields)
				.sort({ createdAt: -1, _id: -1 })
				.limit(KNOWLEDGE_NOTICE_LIMIT)
				.lean<KnowledgeItem[]>()
				.exec(),
		]);

		const items = [...faqs, ...notices];
		this.knowledge = {
			text: buildKnowledge(items),
			ids: new Set(items.map((item) => String(item._id))),
			loadedAt: now,
		};
		return this.knowledge;
	}
}

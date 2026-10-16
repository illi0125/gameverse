/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { ApiError } from '@google/genai';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AssistantService } from './assistant.service';
import {
	AI_RETRY,
	AssistantSettings,
	assistantSettingsFactory,
	DEFAULT_ASSISTANT_MODEL,
	DEFAULT_DAILY_LIMIT,
} from './assistant.config';
import { AssistantLimitService } from '../../libs/security/assistant-limits';
import { AssistantInput } from '../../libs/dto/assistant/assistant.input';
import { AssistantReplyStatus, AssistantRole } from '../../libs/enums/assistant.enum';
import { NoticeCategory, NoticeStatus, SupportTopic } from '../../libs/enums/notice.enum';

const faq = {
	_id: 'faq1',
	noticeCategory: NoticeCategory.FAQ,
	noticeTopic: SupportTopic.PAYMENT,
	noticeTitle: 'Can I buy games?',
	noticeContent: 'Not yet.',
};
const notice = {
	_id: 'notice1',
	noticeCategory: NoticeCategory.NOTICE,
	noticeTitle: 'Welcome',
	noticeContent: '<p>Hello</p>',
	createdAt: new Date('2024-03-01'),
};

const noticeModel = () => {
	const query = (rows: unknown[]) => {
		const chain: any = {};
		for (const step of ['select', 'sort', 'limit', 'lean']) chain[step] = jest.fn().mockReturnValue(chain);
		chain.exec = jest.fn().mockResolvedValue(rows);
		return chain;
	};
	return {
		find: jest
			.fn()
			.mockImplementation((filter) => query(filter.noticeCategory === NoticeCategory.FAQ ? [faq] : [notice])),
	};
};

/** Shape of a Gemini generateContent response (`text` is a getter on the real class) **/
const response = (text: string, finishReason = 'STOP') => ({
	candidates: [{ finishReason, content: { role: 'model', parts: [{ text }] } }],
	text,
	usageMetadata: { promptTokenCount: 10, cachedContentTokenCount: 0, candidatesTokenCount: 5 },
});

const okReply = JSON.stringify({
	answer: 'Not yet, payments are planned.',
	sourceIds: ['faq1', 'made-up'],
	suggestInquiry: false,
});

const setup = (options: { settings?: Partial<AssistantSettings>; generate?: jest.Mock; noClient?: boolean } = {}) => {
	const settings: AssistantSettings = {
		enabled: true,
		apiKey: 'test',
		model: DEFAULT_ASSISTANT_MODEL,
		dailyLimit: 100,
		...options.settings,
	};
	const generate = options.generate ?? jest.fn().mockResolvedValue(response(okReply));
	const client = options.noClient ? null : { models: { generateContent: generate } };
	const model = noticeModel();
	const service = new AssistantService(model as any, settings, client as any, new AssistantLimitService());
	return { service, generate, model };
};

const ask = (service: AssistantService, input: Partial<AssistantInput> = {}, memberId = 'm1') =>
	service.ask(memberId, { question: 'Can I buy games here?', ...input });

describe('AssistantService', () => {
	it('reports disabled and never calls the AI when switched off or without a client', async () => {
		const off = setup({ settings: { enabled: false } });
		expect(off.service.getStatus()).toEqual({ enabled: false });
		await expect(ask(off.service)).resolves.toMatchObject({
			status: AssistantReplyStatus.UNAVAILABLE,
			suggestInquiry: true,
		});
		expect(off.generate).not.toHaveBeenCalled();

		expect(setup({ noClient: true }).service.getStatus()).toEqual({ enabled: false });
	});

	it('sends the rules and public knowledge as the system instruction, and keeps only real source ids', async () => {
		const { service, generate, model } = setup();
		const reply = await ask(service);

		expect(reply).toEqual({
			status: AssistantReplyStatus.OK,
			answer: 'Not yet, payments are planned.',
			sourceIds: ['faq1'],
			suggestInquiry: false,
		});

		const request = generate.mock.calls[0][0];
		expect(request.model).toBe(DEFAULT_ASSISTANT_MODEL);
		expect(request.config.responseMimeType).toBe('application/json');
		expect(request.config.responseJsonSchema.required).toEqual(['answer', 'sourceIds', 'suggestInquiry']);
		expect(request.config.systemInstruction).toMatch(/^You are the support assistant of Gameverse/);
		expect(request.config.systemInstruction).toContain('<entry id="faq1" type="FAQ" topic="PAYMENT">');
		expect(request.config.systemInstruction).toContain(
			'<entry id="notice1" type="NOTICE" date="2024-03-01">\nWelcome\nHello',
		);
		expect(request.contents).toEqual([{ role: 'user', parts: [{ text: 'Can I buy games here?' }] }]);

		// only public items are read
		for (const [filter] of model.find.mock.calls) expect(filter.noticeStatus).toBe(NoticeStatus.ACTIVE);
	});

	it('uses the configured model', async () => {
		const { service, generate } = setup({ settings: { model: 'gemini-test' } });
		await ask(service);
		expect(generate.mock.calls[0][0].model).toBe('gemini-test');
	});

	it('reuses the knowledge between questions instead of reading the database every time', async () => {
		const { service, model } = setup();
		await ask(service);
		await ask(service);
		expect(model.find).toHaveBeenCalledTimes(2); // one FAQ + one notice query, once
	});

	it('keeps the last turns, starting with a member turn, and clamps their length', async () => {
		const { service, generate } = setup();
		const history = Array.from({ length: 9 }, (_, index) => ({
			role: index % 2 ? AssistantRole.USER : AssistantRole.ASSISTANT,
			text: 'x'.repeat(3000),
		}));
		await ask(service, { history });

		const { contents } = generate.mock.calls[0][0];
		expect(contents[0].role).toBe('user');
		expect(contents.length).toBeLessThanOrEqual(7);
		expect(contents.some((turn: any) => turn.role === 'model')).toBe(true);
		expect(contents.at(-1)).toEqual({ role: 'user', parts: [{ text: 'Can I buy games here?' }] });
		expect(contents.every((turn: any) => turn.parts[0].text.length <= 1500)).toBe(true);
	});

	it.each([
		['a safety stop', jest.fn().mockResolvedValue(response('', 'SAFETY'))],
		['a cut-off answer', jest.fn().mockResolvedValue(response('{"answer":"Not', 'MAX_TOKENS'))],
		['a blocked prompt', jest.fn().mockResolvedValue({ candidates: [], promptFeedback: { blockReason: 'SAFETY' } })],
		['invalid JSON', jest.fn().mockResolvedValue(response('not json'))],
		[
			'an empty answer',
			jest.fn().mockResolvedValue(response(JSON.stringify({ answer: ' ', sourceIds: [], suggestInquiry: false }))),
		],
		['a quota error', jest.fn().mockRejectedValue(new ApiError({ message: 'quota', status: 429 }))],
		['an API error', jest.fn().mockRejectedValue(new ApiError({ message: 'bad key', status: 400 }))],
		['an unexpected error', jest.fn().mockRejectedValue(new Error('boom'))],
	])('answers UNAVAILABLE instead of failing on %s', async (_case, generate) => {
		const { service } = setup({ generate });
		await expect(ask(service)).resolves.toMatchObject({
			status: AssistantReplyStatus.UNAVAILABLE,
			sourceIds: [],
			suggestInquiry: true,
		});
	});

	it('answers LIMITED once the daily cap is used, without calling the AI', async () => {
		const { service, generate } = setup({ settings: { dailyLimit: 1 } });
		await ask(service, {}, 'a');
		await expect(ask(service, {}, 'b')).resolves.toMatchObject({ status: AssistantReplyStatus.LIMITED });
		expect(generate).toHaveBeenCalledTimes(1);
	});
});

describe('assistantSettingsFactory', () => {
	const settings = (env: Record<string, string>) =>
		assistantSettingsFactory({ get: (key: string) => env[key] } as ConfigService);

	it('is enabled only with the switch on and a key', () => {
		expect(settings({ AI_ASSISTANT_ENABLED: 'true', AI_API_KEY: 'k' }).enabled).toBe(true);
		expect(settings({ AI_ASSISTANT_ENABLED: 'false', AI_API_KEY: 'k' }).enabled).toBe(false);
		expect(settings({ AI_ASSISTANT_ENABLED: 'true' }).enabled).toBe(false);
		expect(settings({ AI_ASSISTANT_ENABLED: 'true', AI_API_KEY: 'undefined' }).enabled).toBe(false);
	});

	it('retries temporary server errors briefly but never a quota error', () => {
		expect(AI_RETRY.attempts).toBeLessThanOrEqual(3);
		expect(AI_RETRY.httpStatusCodes).toContain(503);
		expect(AI_RETRY.httpStatusCodes).not.toContain(429);
	});

	it('uses AI_MODEL when set, the default otherwise', () => {
		expect(settings({}).model).toBe(DEFAULT_ASSISTANT_MODEL);
		expect(settings({ AI_MODEL: ' ' }).model).toBe(DEFAULT_ASSISTANT_MODEL);
		expect(settings({ AI_MODEL: 'gemini-other' }).model).toBe('gemini-other');
	});

	it('falls back to the default daily limit when the value is missing or invalid', () => {
		expect(settings({}).dailyLimit).toBe(DEFAULT_DAILY_LIMIT);
		expect(settings({ AI_DAILY_LIMIT: '' }).dailyLimit).toBe(DEFAULT_DAILY_LIMIT);
		expect(settings({ AI_DAILY_LIMIT: 'abc' }).dailyLimit).toBe(DEFAULT_DAILY_LIMIT);
		expect(settings({ AI_DAILY_LIMIT: '50' }).dailyLimit).toBe(50);
	});
});

describe('AssistantInput validation', () => {
	const errors = async (input: object) => validate(plainToInstance(AssistantInput, input));

	it('accepts a normal question with a short history', async () => {
		await expect(
			errors({ question: 'How do refunds work?', history: [{ role: AssistantRole.USER, text: 'hi' }] }),
		).resolves.toHaveLength(0);
	});

	it('rejects too short or too long questions, long history and bad turns', async () => {
		expect(await errors({ question: 'a' })).not.toHaveLength(0);
		expect(await errors({ question: 'a'.repeat(501) })).not.toHaveLength(0);
		const turn = { role: AssistantRole.USER, text: 'hi' };
		expect(await errors({ question: 'hello', history: Array(7).fill(turn) })).not.toHaveLength(0);
		expect(await errors({ question: 'hello', history: [{ role: 'SYSTEM', text: 'hi' }] })).not.toHaveLength(0);
		expect(
			await errors({ question: 'hello', history: [{ role: AssistantRole.USER, text: 'x'.repeat(1501) }] }),
		).not.toHaveLength(0);
	});
});

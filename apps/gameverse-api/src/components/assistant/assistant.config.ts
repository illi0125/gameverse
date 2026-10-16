import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

export const ASSISTANT_SETTINGS = 'ASSISTANT_SETTINGS';
export const AI_CLIENT = 'AI_CLIENT';

/** Google Gemini (AI Studio key); override with AI_MODEL without a code change **/
export const DEFAULT_ASSISTANT_MODEL = 'gemini-3.5-flash';
export const DEFAULT_DAILY_LIMIT = 300;

export type AiClient = GoogleGenAI;

export interface AssistantSettings {
	enabled: boolean;
	apiKey?: string;
	model: string;
	dailyLimit: number;
}

/**
 * Read after ConfigModule has loaded .env (see jwt.config.ts). The assistant is optional: without the switch or a key
 * it reports itself disabled and the API still starts.
 */
export const assistantSettingsFactory = (config: ConfigService): AssistantSettings => {
	const apiKey = config.get<string>('AI_API_KEY')?.trim();
	const hasKey = Boolean(apiKey) && apiKey !== 'undefined';
	const switchedOn = config.get<string>('AI_ASSISTANT_ENABLED')?.trim().toLowerCase() === 'true';
	const model = config.get<string>('AI_MODEL')?.trim() || DEFAULT_ASSISTANT_MODEL;
	const rawLimit = config.get<string>('AI_DAILY_LIMIT')?.trim();
	const parsedLimit = rawLimit ? Number(rawLimit) : NaN;
	const dailyLimit = Number.isInteger(parsedLimit) && parsedLimit >= 0 ? parsedLimit : DEFAULT_DAILY_LIMIT;

	if (switchedOn && !hasKey)
		new Logger('Assistant').warn('AI_ASSISTANT_ENABLED is true but AI_API_KEY is not set; assistant disabled');
	return { enabled: switchedOn && hasKey, apiKey: hasKey ? apiKey : undefined, model, dailyLimit };
};

/** Gemini answers 503 "high demand" now and then; retry briefly on server errors only (a 429 quota error stays a 429) **/
export const AI_RETRY = { attempts: 3, initialDelay: 1, maxDelay: 4, httpStatusCodes: [500, 502, 503, 504] };

export const aiClientFactory = (settings: AssistantSettings): AiClient | null =>
	settings.enabled
		? new GoogleGenAI({ apiKey: settings.apiKey, httpOptions: { timeout: 20_000, retryOptions: AI_RETRY } })
		: null;

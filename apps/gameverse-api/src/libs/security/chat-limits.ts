import { IncomingMessage } from 'http';
import { resolveCorsOrigins } from './http-security';

/** Largest WebSocket frame accepted (the ws default is 100 MiB) **/
export const CHAT_MAX_FRAME_BYTES = 16 * 1024;
/** Longest chat message; the chat input uses the same maxLength **/
export const CHAT_MAX_TEXT = 500;
/** Per connection: at most CHAT_BURST messages in CHAT_WINDOW_MS **/
export const CHAT_BURST = 5;
export const CHAT_WINDOW_MS = 5000;

/**
 * The text to broadcast, or null to drop the message. The text is not modified: the frontend
 * recognises its own messages by their exact text.
 */
export const acceptChatText = (payload: unknown): string | null => {
	if (typeof payload !== 'string') return null;
	if (!payload.length || payload.length > CHAT_MAX_TEXT) return null;
	return payload;
};

/** One line, bounded: user text must not forge or flood log lines **/
export const chatLogText = (text: string, max = 80): string => {
	const line = text.replace(/[\r\n\t]+/g, ' ');
	return line.length > max ? `${line.slice(0, max)}…` : line;
};

/** Sliding-window limiter keyed by connection; forget() on disconnect **/
export class ChatRateLimiter<K extends object> {
	private sent = new WeakMap<K, number[]>();

	constructor(
		private readonly burst = CHAT_BURST,
		private readonly windowMs = CHAT_WINDOW_MS,
	) {}

	public allow(key: K, now = Date.now()): boolean {
		const recent = (this.sent.get(key) ?? []).filter((time) => now - time < this.windowMs);
		if (recent.length >= this.burst) {
			this.sent.set(key, recent);
			return false;
		}
		recent.push(now);
		this.sent.set(key, recent);
		return true;
	}

	public forget(key: K): void {
		this.sent.delete(key);
	}
}

/**
 * Browsers always send Origin on a WebSocket upgrade: only the CORS origins may connect.
 * Requests without Origin (non-browser clients) are not cross-site requests and stay allowed.
 */
export const isAllowedSocketOrigin = (origin: string | undefined, env: NodeJS.ProcessEnv = process.env): boolean => {
	if (!origin) return true;
	const allowed = resolveCorsOrigins(env);
	return Array.isArray(allowed) ? allowed.includes(origin.replace(/\/+$/, '')) : allowed.test(origin);
};

/** ws `verifyClient` hook **/
export const verifySocketClient = (info: { origin: string; req: IncomingMessage }): boolean =>
	isAllowedSocketOrigin(info.origin);

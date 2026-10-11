import {
	CHAT_BURST,
	CHAT_MAX_TEXT,
	CHAT_WINDOW_MS,
	ChatRateLimiter,
	acceptChatText,
	chatLogText,
	isAllowedSocketOrigin,
} from './chat-limits';

describe('chat limits', () => {
	it('accepts ordinary text unchanged (the frontend matches its own messages by exact text)', () => {
		expect(acceptChatText('hello ')).toBe('hello ');
		expect(acceptChatText('x'.repeat(CHAT_MAX_TEXT))).toHaveLength(CHAT_MAX_TEXT);
	});

	it.each([
		['empty', ''],
		['too long', 'x'.repeat(CHAT_MAX_TEXT + 1)],
		['object', { evil: true }],
		['number', 42],
		['null', null],
	])('drops %s payloads', (_, payload) => {
		expect(acceptChatText(payload)).toBeNull();
	});

	it('allows a burst, then drops until the window moves on, per connection', () => {
		const limiter = new ChatRateLimiter<object>();
		const a = {};
		const b = {};
		for (let i = 0; i < CHAT_BURST; i++) expect(limiter.allow(a, 1000)).toBe(true);
		expect(limiter.allow(a, 1000)).toBe(false);
		expect(limiter.allow(b, 1000)).toBe(true);
		expect(limiter.allow(a, 1000 + CHAT_WINDOW_MS)).toBe(true);
		limiter.forget(a);
	});

	it('keeps log lines single-line and short', () => {
		expect(chatLogText('line1\nFAKE LOG [Admin] deleted')).toBe('line1 FAKE LOG [Admin] deleted');
		expect(chatLogText('y'.repeat(200))).toHaveLength(81);
	});

	it('lets only the allowed origins open a socket from a browser', () => {
		const prod = { NODE_ENV: 'production', CORS_ORIGINS: 'https://gameverse.kr' };
		expect(isAllowedSocketOrigin('https://gameverse.kr', prod)).toBe(true);
		expect(isAllowedSocketOrigin('https://evil.example', prod)).toBe(false);
		expect(isAllowedSocketOrigin('http://localhost:3000', { NODE_ENV: 'development' })).toBe(true);
		expect(isAllowedSocketOrigin(undefined, prod)).toBe(true);
	});
});

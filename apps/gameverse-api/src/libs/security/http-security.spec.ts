import express from 'express';
import request from 'supertest';
import { resolveCorsOrigins, securityHeaders } from './http-security';

describe('resolveCorsOrigins', () => {
	it('uses the listed origins (trimmed, without trailing slash)', () => {
		expect(resolveCorsOrigins({ CORS_ORIGINS: ' https://gv.example/ , https://www.gv.example' })).toEqual([
			'https://gv.example',
			'https://www.gv.example',
		]);
	});

	it('allows only local origins in development when nothing is listed', () => {
		const origins = resolveCorsOrigins({ NODE_ENV: 'development' }) as RegExp;
		expect(origins.test('http://localhost:3000')).toBe(true);
		expect(origins.test('http://127.0.0.1:3011')).toBe(true);
		expect(origins.test('https://evil.example')).toBe(false);
		expect(origins.test('http://localhost.evil.example')).toBe(false);
	});

	it('refuses to start in production without CORS_ORIGINS', () => {
		expect(() => resolveCorsOrigins({ NODE_ENV: 'production' })).toThrow(/CORS_ORIGINS/);
	});
});

describe('securityHeaders', () => {
	const app = (env: NodeJS.ProcessEnv) => {
		const server = express();
		server.use(securityHeaders(env));
		server.get('/', (req, res) => res.json({ ok: true }));
		return server;
	};

	it('sets the hardening headers', async () => {
		const res = await request(app({ NODE_ENV: 'development' })).get('/');
		expect(res.headers['x-content-type-options']).toBe('nosniff');
		expect(res.headers['x-frame-options']).toBe('DENY');
		expect(res.headers['referrer-policy']).toBe('no-referrer');
		expect(res.headers['strict-transport-security']).toBeUndefined();
	});

	it('adds HSTS in production only', async () => {
		const res = await request(app({ NODE_ENV: 'production' })).get('/');
		expect(res.headers['strict-transport-security']).toBe('max-age=15552000');
	});
});

import express from 'express';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import request from 'supertest';
import { uploadsGuard } from './uploads.middleware';

describe('uploadsGuard', () => {
	let dir: string;
	let app: express.Express;

	beforeAll(() => {
		dir = mkdtempSync(path.join(tmpdir(), 'gv-uploads-'));
		mkdirSync(path.join(dir, 'member'));
		writeFileSync(path.join(dir, 'member', 'a.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]));
		writeFileSync(path.join(dir, 'member', 'b.JPEG'), Buffer.from([0xff, 0xd8, 0xff]));
		writeFileSync(path.join(dir, 'member', 'x.html'), '<script>alert(1)</script>');
		writeFileSync(path.join(dir, 'member', 'y.svg'), '<svg onload="alert(1)"/>');
		app = express();
		app.use('/uploads', uploadsGuard, express.static(dir));
	});

	afterAll(() => rmSync(dir, { recursive: true, force: true }));

	it.each(['/uploads/member/a.png', '/uploads/member/b.JPEG'])('serves images with nosniff: %s', async (url) => {
		const res = await request(app).get(url);
		expect(res.status).toBe(200);
		expect(res.headers['x-content-type-options']).toBe('nosniff');
	});

	it.each(['/uploads/member/x.html', '/uploads/member/y.svg', '/uploads/member/', '/uploads/member/a.png.upload'])(
		'never serves anything else: %s',
		async (url) => {
			expect((await request(app).get(url)).status).toBe(404);
		},
	);
});

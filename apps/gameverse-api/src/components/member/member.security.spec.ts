import { existsSync, mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import * as path from 'path';
import { PassThrough, Readable } from 'stream';
import { Message } from '../../libs/enums/common.enum';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { detectImageExtension } from '../../libs/config';
import { MemberService } from './member.service';
import { MemberResolver } from './member.resolver';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const HTML = Buffer.from('<html><script>alert(1)</script></html>');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>');

const authService = () => ({
	hashPassword: jest.fn((password: string) => Promise.resolve(`hashed:${password}`)),
	createToken: jest.fn(() => Promise.resolve('token')),
});

const updateModel = () => {
	const exec = jest.fn().mockResolvedValue({ _id: 'member-id' });
	return {
		findOneAndUpdate: jest.fn().mockReturnValue({ exec }),
		findByIdAndUpdate: jest.fn().mockReturnValue({ exec }),
		create: jest.fn().mockResolvedValue({ _id: 'member-id' }),
	};
};

const service = (memberModel: any, auth: any) =>
	new MemberService(memberModel, {} as any, auth, {} as any, {} as any, {} as any);

describe('Member security (signup and updates)', () => {
	it('refuses a public signup as ADMIN without creating the member', async () => {
		const model = updateModel();
		const auth = authService();
		const input = {
			memberNick: 'mallory',
			memberPassword: 'secret1',
			memberPhone: '010',
			memberType: MemberType.ADMIN,
		};

		await expect(service(model, auth).signup(input as any)).rejects.toThrow(Message.NOT_ALLOWED_REQUEST);
		expect(model.create).not.toHaveBeenCalled();
	});

	it.each([MemberType.USER, MemberType.AGENT, undefined])('still signs up memberType %s', async (memberType) => {
		const model = updateModel();
		const auth = authService();

		await service(model, auth).signup({
			memberNick: 'alice',
			memberPassword: 'secret1',
			memberPhone: '010',
			memberType,
		});

		expect(model.create).toHaveBeenCalledWith(expect.objectContaining({ memberPassword: 'hashed:secret1' }));
	});

	it('ignores role, status and _id in a self-service update', async () => {
		const model = updateModel();
		const input = {
			_id: 'someone-else',
			memberType: MemberType.ADMIN,
			memberStatus: MemberStatus.ACTIVE,
			memberNick: 'newnick',
		};

		await service(model, authService()).updateMember('member-id' as any, input as any);

		const [filter, update] = model.findOneAndUpdate.mock.calls[0];
		expect(filter).toEqual({ _id: 'member-id', memberStatus: MemberStatus.ACTIVE });
		expect(update).toEqual({ memberNick: 'newnick' });
	});

	it('hashes a new password in a self-service update', async () => {
		const model = updateModel();

		await service(model, authService()).updateMember('member-id' as never, { memberPassword: 'newpass1' });

		expect(model.findOneAndUpdate.mock.calls[0][1]).toEqual({ memberPassword: 'hashed:newpass1' });
	});

	it('hashes a new password in an admin update and keeps admin-only fields', async () => {
		const model = updateModel();
		const auth = authService();
		const input = { _id: 'member-id', memberStatus: MemberStatus.BLOCK, memberPassword: 'reset123' };

		await service(model, auth).updateMemberByAdmin(input as any);

		expect(model.findByIdAndUpdate.mock.calls[0][1]).toEqual({
			_id: 'member-id',
			memberStatus: MemberStatus.BLOCK,
			memberPassword: 'hashed:reset123',
		});
	});

	it('does not hash when an update has no password', async () => {
		const model = updateModel();
		const auth = authService();

		await service(model, auth).updateMember('member-id' as never, { memberNick: 'newnick' });
		await service(model, auth).updateMemberByAdmin({ _id: 'member-id', memberNick: 'x12' } as any);

		expect(auth.hashPassword).not.toHaveBeenCalled();
	});
});

describe('Image uploads are checked by content', () => {
	it('detects PNG and JPEG signatures only', () => {
		expect(detectImageExtension(PNG)).toBe('.png');
		expect(detectImageExtension(JPG)).toBe('.jpg');
		expect(detectImageExtension(HTML)).toBeNull();
		expect(detectImageExtension(SVG)).toBeNull();
		expect(detectImageExtension(Buffer.alloc(0))).toBeNull();
	});

	describe('saveImage', () => {
		const cwd = process.cwd();
		let dir: string;
		const resolver = new MemberResolver({} as any, {} as any) as any;
		const files = () => readdirSync(path.join(dir, 'uploads', 'member'));

		beforeEach(() => {
			dir = mkdtempSync(path.join(tmpdir(), 'gv-upload-'));
			process.chdir(dir);
		});

		afterEach(() => {
			process.chdir(cwd);
			rmSync(dir, { recursive: true, force: true });
		});

		it.each([
			[PNG, '.png'],
			[JPG, '.jpg'],
		])('stores a real image with the extension of its content', async (bytes, extension) => {
			const url: string = await resolver.saveImage(Readable.from([bytes]), 'member');

			expect(url).toMatch(new RegExp(`^uploads/member/[0-9a-f-]{36}\\${extension}$`));
			expect(existsSync(path.join(dir, url))).toBe(true);
			expect(files()).toHaveLength(1);
		});

		it.each([HTML, SVG])('rejects non-images and leaves no file behind', async (bytes) => {
			await expect(resolver.saveImage(Readable.from([bytes]), 'member')).rejects.toThrow(
				Message.PROVIDE_ALLOWED_FORMAT,
			);
			expect(files()).toHaveLength(0);
		});

		it('fails (instead of hanging) when the upload stream errors, and cleans up', async () => {
			const stream = new PassThrough();
			const pending = resolver.saveImage(stream, 'member');
			stream.write(PNG);
			stream.destroy(new Error('File truncated as it exceeds the byte size limit.'));

			await expect(pending).rejects.toThrow(Message.UPLOAD_FAILED);
			expect(files()).toHaveLength(0);
		});

		it('keeps the upload target allow-list', async () => {
			await expect(resolver.saveImage(Readable.from([PNG]), '../etc')).rejects.toThrow(Message.NOT_ALLOWED_REQUEST);
		});
	});
});

describe('Search text is matched literally', () => {
	it('escapes regex syntax in getAgents and the admin member search', async () => {
		const aggregate = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([{ list: [], metaCounter: [] }]) });
		const memberService = service({ aggregate }, authService());

		await memberService.getAgents(null as never, { page: 1, limit: 10, search: { text: '(a+)+$' } });
		await memberService.getAllMembersByAdmin({ page: 1, limit: 10, search: { text: '.*[' } });

		const sources = aggregate.mock.calls.map(([pipeline]) => {
			const stage = (pipeline as { $match?: { memberNick?: { $regex: RegExp } } }[]).find((s) => s.$match);
			return stage?.$match?.memberNick?.$regex.source;
		});
		expect(sources).toEqual(['\\(a\\+\\)\\+\\$', '\\.\\*\\[']);
	});
});

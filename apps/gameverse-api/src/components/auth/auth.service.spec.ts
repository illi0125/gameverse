import { UnauthorizedException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import { AuthService } from './auth.service';
import { WithoutGuard } from './guards/without.guard';

function memberQuery(result: unknown) {
	return {
		lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(result) }),
	};
}

describe('database-backed authentication', () => {
	const memberId = new Types.ObjectId();

	it('returns the current database member instead of trusting JWT role claims', async () => {
		const jwtService = {
			verifyAsync: jest.fn().mockResolvedValue({ _id: memberId.toString(), memberType: MemberType.ADMIN }),
		};
		const currentMember = {
			_id: memberId,
			memberNick: 'Leo',
			memberType: MemberType.AGENT,
			memberStatus: MemberStatus.ACTIVE,
			memberGames: undefined,
		};
		const memberModel = { findOne: jest.fn().mockReturnValue(memberQuery(currentMember)) };
		const service = new AuthService(jwtService as any, memberModel as any);

		const result = await service.verifyToken('valid-token');

		expect(memberModel.findOne).toHaveBeenCalledWith({ _id: memberId, memberStatus: MemberStatus.ACTIVE });
		expect(result.memberType).toBe(MemberType.AGENT);
		expect(result.memberGames).toBe(0);
	});

	it.each([
		['missing', null],
		['blocked', null],
		['deleted', null],
	])('rejects a %s database member', async (_label, member) => {
		const jwtService = { verifyAsync: jest.fn().mockResolvedValue({ _id: memberId.toString() }) };
		const memberModel = { findOne: jest.fn().mockReturnValue(memberQuery(member)) };
		const service = new AuthService(jwtService as any, memberModel as any);

		await expect(service.verifyToken('stale-token')).rejects.toBeInstanceOf(UnauthorizedException);
	});

	it.each(['expired token', 'malformed token', 'invalid member id'])(
		'rejects %s errors as unauthorized',
		async (reason) => {
			const jwtService = {
				verifyAsync:
					reason === 'invalid member id'
						? jest.fn().mockResolvedValue({ _id: 'not-an-object-id' })
						: jest.fn().mockRejectedValue(new Error(reason)),
			};
			const service = new AuthService(jwtService as any, { findOne: jest.fn() } as any);

			await expect(service.verifyToken('bad-token')).rejects.toBeInstanceOf(UnauthorizedException);
		},
	);

	it('treats a stale token as anonymous in optional authentication', async () => {
		const authService = { verifyToken: jest.fn().mockRejectedValue(new UnauthorizedException()) };
		const guard = new WithoutGuard(authService as any);
		const request = { headers: { authorization: 'Bearer stale-token' }, body: {} };
		const context = { contextType: 'graphql', getArgByIndex: jest.fn().mockReturnValue({ req: request }) };

		await expect(guard.canActivate(context as any)).resolves.toBe(true);
		expect(request.body).toEqual({ authMember: null });
	});
});

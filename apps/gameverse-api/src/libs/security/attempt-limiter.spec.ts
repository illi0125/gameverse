import { Message } from '../enums/common.enum';
import { MemberResolver } from '../../components/member/member.resolver';
import { AttemptLimiter, AuthAttemptService, LOGIN_PER_ACCOUNT, SIGNUP_PER_IP, clientIp } from './attempt-limiter';

describe('AttemptLimiter', () => {
	it('allows up to the limit inside the window, then refuses until it passes', () => {
		const limiter = new AttemptLimiter(3, 1000);
		expect([1, 2, 3].map(() => limiter.hit('k', 0))).toEqual([true, true, true]);
		expect(limiter.hit('k', 500)).toBe(false);
		expect(limiter.hit('k', 1000)).toBe(true);
		limiter.reset('k');
		expect(limiter.hit('k', 1001)).toBe(true);
	});
});

describe('login / signup limits in the resolver', () => {
	const req = { ip: '203.0.113.7' };
	const setup = (login = jest.fn().mockResolvedValue({ _id: 'm' })) => {
		const memberService = { login, signup: jest.fn().mockResolvedValue({ _id: 'm' }) };
		return { memberService, resolver: new MemberResolver(memberService as never, new AuthAttemptService()) };
	};

	it('refuses login after repeated failures for the same nickname from one address', async () => {
		const { memberService, resolver } = setup(jest.fn().mockRejectedValue(new Error(Message.WRONG_PASSWORD)));
		for (let i = 0; i < LOGIN_PER_ACCOUNT; i++) {
			await expect(resolver.login({ memberNick: 'Leo', memberPassword: 'guess1' }, { req })).rejects.toThrow(
				Message.WRONG_PASSWORD,
			);
		}
		await expect(resolver.login({ memberNick: 'leo', memberPassword: 'guess2' }, { req })).rejects.toThrow(
			Message.TOO_MANY_ATTEMPTS,
		);
		expect(memberService.login).toHaveBeenCalledTimes(LOGIN_PER_ACCOUNT);
		// Another nickname from the same address is still allowed
		await expect(resolver.login({ memberNick: 'other', memberPassword: 'x1234' }, { req })).rejects.toThrow(
			Message.WRONG_PASSWORD,
		);
	});

	it('a successful login clears the counter for that account', async () => {
		const login = jest.fn().mockRejectedValue(new Error(Message.WRONG_PASSWORD));
		const { memberService, resolver } = setup(login);
		for (let i = 0; i < LOGIN_PER_ACCOUNT - 1; i++) {
			await resolver.login({ memberNick: 'leo', memberPassword: 'bad12' }, { req }).catch(() => undefined);
		}
		memberService.login.mockResolvedValueOnce({ _id: 'm' });
		await expect(resolver.login({ memberNick: 'leo', memberPassword: 'right' }, { req })).resolves.toEqual({
			_id: 'm',
		});
		await expect(resolver.login({ memberNick: 'leo', memberPassword: 'bad12' }, { req })).rejects.toThrow(
			Message.WRONG_PASSWORD,
		);
	});

	it('limits sign-ups per address', async () => {
		const { resolver } = setup();
		const input = { memberNick: 'new', memberPassword: 'pass1', memberPhone: '010' };
		for (let i = 0; i < SIGNUP_PER_IP; i++) await resolver.signup(input as never, { req });
		await expect(resolver.signup(input as never, { req })).rejects.toThrow(Message.TOO_MANY_ATTEMPTS);
		await expect(resolver.signup(input as never, { req: { ip: '198.51.100.1' } })).resolves.toEqual({ _id: 'm' });
	});

	it('reads the client address from the request', () => {
		expect(clientIp({ ip: '1.2.3.4' })).toBe('1.2.3.4');
		expect(clientIp({ socket: { remoteAddress: '5.6.7.8' } })).toBe('5.6.7.8');
		expect(clientIp(undefined)).toBe('unknown');
	});
});

import { Injectable } from '@nestjs/common';

/** Sliding-window counter per key, kept in memory (one API process; use a shared store if the API is scaled out) **/
export class AttemptLimiter {
	private hits = new Map<string, number[]>();
	private calls = 0;

	constructor(
		private readonly limit: number,
		private readonly windowMs: number,
	) {}

	/** Records an attempt; false when the key already used its limit in the window **/
	public hit(key: string, now = Date.now()): boolean {
		if (++this.calls % 500 === 0) this.prune(now);
		const recent = (this.hits.get(key) ?? []).filter((time) => now - time < this.windowMs);
		if (recent.length >= this.limit) {
			this.hits.set(key, recent);
			return false;
		}
		recent.push(now);
		this.hits.set(key, recent);
		return true;
	}

	public reset(key: string): void {
		this.hits.delete(key);
	}

	private prune(now: number): void {
		for (const [key, times] of this.hits) {
			if (!times.some((time) => now - time < this.windowMs)) this.hits.delete(key);
		}
	}
}

const MINUTE = 60 * 1000;
export const LOGIN_PER_ACCOUNT = 10; // per IP + nickname, 15 min (cleared by a successful login)
export const LOGIN_PER_IP = 50; // per IP, 15 min (shared networks stay usable)
export const SIGNUP_PER_IP = 10; // per IP, 1 hour

/** Brute-force and spam brakes for the public login / signup mutations **/
@Injectable()
export class AuthAttemptService {
	private loginAccount = new AttemptLimiter(LOGIN_PER_ACCOUNT, 15 * MINUTE);
	private loginIp = new AttemptLimiter(LOGIN_PER_IP, 15 * MINUTE);
	private signupIp = new AttemptLimiter(SIGNUP_PER_IP, 60 * MINUTE);

	private accountKey = (ip: string, nick: unknown) => `${ip}|${String(nick ?? '').toLowerCase()}`;

	public allowLogin(ip: string, nick: unknown): boolean {
		// Both windows count the attempt; either one can refuse it
		const account = this.loginAccount.hit(this.accountKey(ip, nick));
		const perIp = this.loginIp.hit(ip);
		return account && perIp;
	}

	public loginSucceeded(ip: string, nick: unknown): void {
		this.loginAccount.reset(this.accountKey(ip, nick));
	}

	public allowSignup(ip: string): boolean {
		return this.signupIp.hit(ip);
	}
}

/** Client address as Express sees it (set TRUST_PROXY behind a reverse proxy, or every client shares the proxy's IP) **/
export const clientIp = (req: { ip?: string; socket?: { remoteAddress?: string } } | undefined): string =>
	req?.ip ?? req?.socket?.remoteAddress ?? 'unknown';

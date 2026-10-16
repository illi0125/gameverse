import { Injectable } from '@nestjs/common';
import { AttemptLimiter } from './attempt-limiter';

const HOUR = 60 * 60 * 1000;
export const ASSISTANT_PER_MEMBER = 20; // questions per member, 1 hour

/** Cost brakes for the AI assistant: per member per hour, and one shared cap per UTC day (in memory, one API process) **/
@Injectable()
export class AssistantLimitService {
	private perMember = new AttemptLimiter(ASSISTANT_PER_MEMBER, HOUR);
	private day = '';
	private usedToday = 0;

	public allow(memberId: string, dailyLimit: number, now = Date.now()): boolean {
		const today = new Date(now).toISOString().slice(0, 10);
		if (today !== this.day) {
			this.day = today;
			this.usedToday = 0;
		}
		if (this.usedToday >= dailyLimit) return false;
		if (!this.perMember.hit(memberId, now)) return false;
		this.usedToday++;
		return true;
	}
}

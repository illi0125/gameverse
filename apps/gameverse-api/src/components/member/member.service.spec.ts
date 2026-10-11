import { MemberStatus, MemberType } from '../../libs/enums/member.enum';
import MemberSchema from '../../schemas/Member.model';
import { MemberService, memberGamesFallbackStage, normalizeMemberGames } from './member.service';

describe('Member memberGames compatibility', () => {
	it('keeps the schema default for newly created members', () => {
		expect(MemberSchema.path('memberGames').options.default).toBe(0);
	});

	it('normalizes a missing or null memberGames value to zero', () => {
		expect(normalizeMemberGames<{ memberGames?: number | null }>({ memberGames: undefined }).memberGames).toBe(0);
		expect(normalizeMemberGames<{ memberGames?: number | null }>({ memberGames: null }).memberGames).toBe(0);
		expect(normalizeMemberGames({ memberGames: 0 }).memberGames).toBe(0);
		expect(normalizeMemberGames({ memberGames: 7 }).memberGames).toBe(7);
	});

	it('normalizes getMember lean results', async () => {
		const memberModel = {
			findOne: jest.fn().mockReturnValue({
				lean: jest.fn().mockReturnValue({
					exec: jest.fn().mockResolvedValue({
						_id: 'member-id',
						memberStatus: MemberStatus.ACTIVE,
						memberGames: undefined,
					}),
				}),
			}),
		};
		const service = new MemberService(memberModel as any, {} as any, {} as any, {} as any, {} as any, {} as any);

		const result = await service.getMember(null, 'member-id' as any);

		expect(result.memberGames).toBe(0);
	});

	it('adds the fallback stage to agent and admin member aggregations', async () => {
		const aggregate = jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue([{ list: [], metaCounter: [] }]) });
		const memberModel = { aggregate };
		const service = new MemberService(memberModel as any, {} as any, {} as any, {} as any, {} as any, {} as any);

		await service.getAgents(null as any, { page: 1, limit: 10, search: {} });
		await service.getAllMembersByAdmin({ page: 1, limit: 10, search: { memberType: MemberType.AGENT } });

		for (const [pipeline] of aggregate.mock.calls) {
			expect(pipeline).toContainEqual(memberGamesFallbackStage);
		}
	});
});

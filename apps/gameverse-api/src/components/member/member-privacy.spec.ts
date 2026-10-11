import { MemberType } from '../../libs/enums/member.enum';
import { toChatMember } from '../../socket/socket.gateway';
import { MemberPrivacyResolver, canSeePrivateContact } from './member-privacy.resolver';

const member = { _id: 'member-1', memberPhone: '010-1234-5678', memberAddress: 'Seoul', memberNick: 'leo' } as never;
const context = (authMember: unknown) => ({ req: { body: { authMember } } });

describe('Member privacy (phone and address)', () => {
	const resolver = new MemberPrivacyResolver();

	it.each([
		['a visitor', undefined],
		['a signed-out request (login/signup)', null],
		['another player', { _id: 'member-2', memberType: MemberType.USER }],
		['another developer', { _id: 'member-2', memberType: MemberType.AGENT }],
	])('hides them from %s', (_, viewer) => {
		expect(resolver.memberPhone(member, context(viewer))).toBe('');
		expect(resolver.memberAddress(member, context(viewer))).toBeNull();
	});

	it('shows them to the member themselves (string or ObjectId ids)', () => {
		const self = { _id: { toString: () => 'member-1' }, memberType: MemberType.USER };
		expect(resolver.memberPhone(member, context(self))).toBe('010-1234-5678');
		expect(resolver.memberAddress(member, context(self))).toBe('Seoul');
	});

	it('shows them to admins', () => {
		const admin = { _id: 'admin-1', memberType: MemberType.ADMIN };
		expect(resolver.memberPhone(member, context(admin))).toBe('010-1234-5678');
		expect(resolver.memberAddress(member, context(admin))).toBe('Seoul');
	});

	it('keeps the non-null phone type when the stored value is missing', () => {
		const admin = { _id: 'admin-1', memberType: MemberType.ADMIN };
		expect(resolver.memberPhone({ _id: 'x' } as never, context(admin))).toBe('');
		expect(resolver.memberAddress({ _id: 'x' } as never, context(admin))).toBeNull();
	});

	it('never treats a missing id as the same member', () => {
		expect(
			canSeePrivateContact({ _id: undefined } as never, { _id: undefined, memberType: MemberType.USER } as never),
		).toBe(false);
	});
});

describe('Chat member data', () => {
	it('keeps only id, nick and image', () => {
		const full = { ...(member as object), memberStatus: 'ACTIVE', memberImage: 'uploads/member/a.png', memberLikes: 3 };
		expect(toChatMember(full as never)).toEqual({
			_id: 'member-1',
			memberNick: 'leo',
			memberImage: 'uploads/member/a.png',
		});
		expect(toChatMember(null)).toBeNull();
	});
});

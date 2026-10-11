import { Context, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { Member } from '../../libs/dto/member/member';
import { MemberType } from '../../libs/enums/member.enum';

type Viewer = Pick<Member, '_id' | 'memberType'> | null | undefined;

const idText = (id: unknown): string =>
	id === null || id === undefined ? '' : (id as { toString(): string }).toString();

/** Phone and address are private: only the member themselves and admins see them **/
export const canSeePrivateContact = (member: Pick<Member, '_id'>, viewer: Viewer): boolean => {
	if (!viewer) return false;
	if (viewer.memberType === MemberType.ADMIN) return true;
	const viewerId = idText(viewer._id);
	return viewerId !== '' && viewerId === idText(member._id);
};

/** The guards (AuthGuard, RolesGuard, WithoutGuard) put the verified member on the request; login/signup have none **/
const viewerOf = (context: { req?: { body?: { authMember?: Viewer } } }): Viewer =>
	context?.req?.body?.authMember ?? null;

/**
 * Applies to every Member the API returns: top-level (getMember, getAgents, admin lists) and nested
 * (memberData, authorData, followerData, followingData). Field names and types are unchanged:
 * a hidden phone is '' (the field is non-null), a hidden address is null.
 */
@Resolver(() => Member)
export class MemberPrivacyResolver {
	@ResolveField(() => String, { name: 'memberPhone' })
	public memberPhone(@Parent() member: Member, @Context() context: object): string {
		return canSeePrivateContact(member, viewerOf(context)) ? (member.memberPhone ?? '') : '';
	}

	@ResolveField(() => String, { name: 'memberAddress', nullable: true })
	public memberAddress(@Parent() member: Member, @Context() context: object): string | null {
		return canSeePrivateContact(member, viewerOf(context)) ? (member.memberAddress ?? null) : null;
	}
}

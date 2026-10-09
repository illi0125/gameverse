import { ObjectId as BsonObjectId } from 'bson';
import { type ObjectId } from 'mongoose';

export const availableAgentSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews', 'memberRank'];
export const availableMemberSorts = ['createdAt', 'updatedAt', 'memberLikes', 'memberViews'];
export const availableGameSorts = [
	'createdAt',
	'updatedAt',
	'gameLikes',
	'gameViews',
	'gameComments',
	'gameReviews',
	'gameRatings',
	'gameRank',
	'gamePrice',
	'gameReleaseDate',
];
export const availableBoardArticleSorts = ['createdAt', 'updatedAt', 'articleLikes', 'articleViews'];
export const availableCommentSorts = ['createdAt', 'updatedAt'];
export const availableNoticeSorts = ['createdAt', 'updatedAt'];
export const availableInquirySorts = ['createdAt', 'updatedAt', 'answeredAt'];

/** Literal text for a case-insensitive $regex search (user input must not act as a pattern) **/
export const escapeRegex = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ----------------------------------------
// IMAGE CONFIGURATION
// ----------------------------------------
import { randomUUID } from 'crypto';
import * as path from 'path';
import { T } from './types/common';

export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
export const getSerialForImage = (filename: string) => {
	const ext = path.parse(filename).ext;
	return randomUUID() + ext;
};

export function shapeIntoMongoObjectId(target: string): ObjectId;
export function shapeIntoMongoObjectId(target: ObjectId): ObjectId;
export function shapeIntoMongoObjectId(target: undefined): undefined;
export function shapeIntoMongoObjectId(target: ObjectId | undefined): ObjectId | undefined;
export function shapeIntoMongoObjectId(target: string | ObjectId | undefined): ObjectId | undefined {
	return typeof target === 'string' ? (new BsonObjectId(target) as unknown as ObjectId) : target;
}

export const lookupAuthMemberLiked = (
	memberId: T | null | undefined,
	targetRefId: string = '$_id',
	likeGroup?: string,
) => {
	return {
		$lookup: {
			from: 'likes',
			let: {
				localLikeRefId: targetRefId,
				localMemberId: memberId,
				localMyFavorite: true,
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$and: [
								{ $eq: ['$likeRefId', '$$localLikeRefId'] },
								{ $eq: ['$memberId', '$$localMemberId'] },
								...(likeGroup ? [{ $eq: ['$likeGroup', likeGroup] }] : []),
							],
						},
					},
				},
				{
					$project: {
						_id: 0,
						memberId: 1,
						likeRefId: 1,
						myFavorite: '$$localMyFavorite',
					},
				},
			],
			as: 'meLiked',
		},
	};
};

interface LookupAuthMemberFollowed {
	followerId: T;
	followingId: string;
}
export const lookupAuthMemberFollowed = (input: LookupAuthMemberFollowed) => {
	const { followerId, followingId } = input;
	return {
		$lookup: {
			from: 'follows',
			let: {
				localFollowerId: followerId,
				localFollowingId: followingId,
				localMyFavorite: true,
			},
			pipeline: [
				{
					$match: {
						$expr: {
							$and: [{ $eq: ['$followerId', '$$localFollowerId'] }, { $eq: ['$followingId', '$$localFollowingId'] }],
						},
					},
				},
				{
					$project: {
						_id: 0,
						followerId: 1,
						followingId: 1,
						myFollowing: '$$localMyFavorite',
					},
				},
			],
			as: 'meFollowed',
		},
	};
};

export const lookupMember = {
	$lookup: {
		from: 'members',
		localField: 'memberId',
		foreignField: '_id',
		as: 'memberData',
	},
};

export const lookupFollowingData = {
	$lookup: {
		from: 'members',
		localField: 'followingId',
		foreignField: '_id',
		as: 'followingData',
	},
};

export const lookupFollowerData = {
	$lookup: {
		from: 'members',
		localField: 'followerId',
		foreignField: '_id',
		as: 'followerData',
	},
};

export const lookupFavoriteGame = {
	$lookup: {
		from: 'members',
		localField: 'favoriteGame.memberId',
		foreignField: '_id',
		as: 'favoriteGame.memberData',
	},
};

export const lookupVisitedGame = {
	$lookup: {
		from: 'members',
		localField: 'visitedGame.memberId',
		foreignField: '_id',
		as: 'visitedGame.memberData',
	},
};

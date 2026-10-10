import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AnyBulkWriteOperation, Model, ObjectId, PipelineStage, Types } from 'mongoose';
import { Notification, Notifications } from '../../libs/dto/notification/notification';
import { NotificationsInquiry } from '../../libs/dto/notification/notification.input';
import { NotificationGroup, NotificationStatus, NotificationType } from '../../libs/enums/notification.enum';
import { LikeGroup } from '../../libs/enums/like.enum';
import { MemberStatus } from '../../libs/enums/member.enum';
import { NotificationEvent, StoredNotification } from '../../libs/types/notification';
import { T } from '../../libs/types/common';
import { Direction, Message } from '../../libs/enums/common.enum';
import { SocketGateway } from '../../socket/socket.gateway';

/** Which groups each type may point at; anything else is rejected before it reaches the database **/
const allowedGroups: Record<NotificationType, NotificationGroup[]> = {
	[NotificationType.LIKE]: [NotificationGroup.MEMBER, NotificationGroup.ARTICLE, NotificationGroup.GAME],
	[NotificationType.COMMENT]: [NotificationGroup.MEMBER, NotificationGroup.ARTICLE, NotificationGroup.GAME],
	[NotificationType.FOLLOW]: [NotificationGroup.MEMBER],
	[NotificationType.NEW_GAME]: [NotificationGroup.GAME],
	[NotificationType.GAME_RELEASE]: [NotificationGroup.GAME],
	[NotificationType.INQUIRY_ANSWER]: [NotificationGroup.INQUIRY],
	[NotificationType.MODERATION]: [NotificationGroup.GAME, NotificationGroup.ARTICLE],
	[NotificationType.ANNOUNCEMENT]: [NotificationGroup.NOTICE],
};

/** The target a group links to must be present (MEMBER links to the author's profile) **/
const requiredRef: Partial<Record<NotificationGroup, keyof NotificationEvent>> = {
	[NotificationGroup.GAME]: 'gameId',
	[NotificationGroup.ARTICLE]: 'articleId',
	[NotificationGroup.INQUIRY]: 'inquiryId',
	[NotificationGroup.NOTICE]: 'noticeId',
};

const lookupAuthorData: PipelineStage.Lookup = {
	$lookup: {
		from: 'members',
		localField: 'authorId',
		foreignField: '_id',
		as: 'authorData',
	},
};

const TITLE_MAX = 120;
const DESC_MAX = 200;
const BATCH_SIZE = 500;

/** Mongoose's ObjectId type does not declare toString; the runtime value is a BSON ObjectId **/
export const idText = (value: ObjectId): string => (value as unknown as Types.ObjectId).toHexString();

const clip = (text: string | undefined, max: number): string | undefined =>
	text === undefined ? undefined : text.length > max ? `${text.slice(0, max - 1)}…` : text;

@Injectable()
export class NotificationService {
	private logger = new Logger('NotificationService');

	constructor(
		@InjectModel('Notification') private readonly notificationModel: Model<Notification>,
		@InjectModel('Follow') private readonly followModel: Model<T>,
		@InjectModel('Like') private readonly likeModel: Model<T>,
		@InjectModel('Member') private readonly memberModel: Model<T>,
		private readonly socketGateway: SocketGateway,
	) {}

	/** READ — every query is scoped to the signed-in receiver; nothing takes a member ID from the client **/

	public async getMyNotifications(memberId: ObjectId, input: NotificationsInquiry): Promise<Notifications> {
		const { page, limit, search } = input;
		const match: T = { receiverId: memberId };
		if (search?.unreadOnly) match.notificationStatus = NotificationStatus.WAIT;
		if (search?.typeList?.length) match.notificationType = { $in: search.typeList };

		const result = await this.notificationModel
			.aggregate<Notifications>([
				{ $match: match },
				{ $sort: { createdAt: Direction.DESC, _id: Direction.DESC } },
				{
					$facet: {
						list: [
							{ $skip: (page - 1) * limit },
							{ $limit: limit },
							{ $project: { dedupeKey: 0 } },
							lookupAuthorData,
							{ $unwind: { path: '$authorData', preserveNullAndEmptyArrays: true } },
						],
						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();
		return result[0] ?? { list: [], metaCounter: [] };
	}

	/** Counted from stored state (indexed), so it can never drift from the list **/
	public async getUnreadNotificationCount(memberId: ObjectId): Promise<number> {
		return this.notificationModel
			.countDocuments({ receiverId: memberId, notificationStatus: NotificationStatus.WAIT })
			.exec();
	}

	/** UPDATE **/

	/** Idempotent: an already-read notification keeps its first readAt; another member's ID is "not found" **/
	public async markNotificationRead(memberId: ObjectId, notificationId: ObjectId): Promise<Notification> {
		const updated = await this.notificationModel
			.findOneAndUpdate(
				{ _id: notificationId, receiverId: memberId, notificationStatus: NotificationStatus.WAIT },
				{ $set: { notificationStatus: NotificationStatus.READ, readAt: new Date() } },
				{ new: true, projection: { dedupeKey: 0 } },
			)
			.lean<Notification>()
			.exec();
		if (updated) {
			await this.pushUnreadCount(memberId);
			return updated;
		}

		const current = await this.notificationModel
			.findOne({ _id: notificationId, receiverId: memberId }, { dedupeKey: 0 })
			.lean<Notification>()
			.exec();
		if (!current) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return current;
	}

	/** Returns how many were marked **/
	public async markAllNotificationsRead(memberId: ObjectId): Promise<number> {
		const result = await this.notificationModel
			.updateMany(
				{ receiverId: memberId, notificationStatus: NotificationStatus.WAIT },
				{ $set: { notificationStatus: NotificationStatus.READ, readAt: new Date() } },
			)
			.exec();
		if (result.modifiedCount) await this.pushUnreadCount(memberId);
		return result.modifiedCount;
	}

	/** CREATE — never throws: a notification problem must not fail the like, comment or publish that caused it **/

	public async notify(event: NotificationEvent, receiverId: ObjectId): Promise<StoredNotification | null> {
		const stored = await this.notifyMany(event, [receiverId]);
		return stored[0] ?? null;
	}

	/** Upserts one notification per receiver on its dedupe key; returns only the newly stored ones **/
	public async notifyMany(event: NotificationEvent, receiverIds: ObjectId[]): Promise<StoredNotification[]> {
		if (!this.isValidEvent(event)) return [];

		const author = idText(event.authorId);
		const seen = new Set<string>();
		const receivers = receiverIds.filter((id) => {
			if (!id) return false;
			const key = idText(id);
			if (key === author || seen.has(key)) return false;
			seen.add(key);
			return true;
		});

		const stored: StoredNotification[] = [];
		for (let start = 0; start < receivers.length; start += BATCH_SIZE) {
			stored.push(...(await this.writeBatch(event, receivers.slice(start, start + BATCH_SIZE))));
		}
		await this.deliver(event, stored);
		return stored;
	}

	/** AUDIENCES **/

	/** Everyone following the author (new game from a followed developer) **/
	public async notifyFollowers(event: NotificationEvent): Promise<StoredNotification[]> {
		try {
			const followers = await this.followModel
				.find({ followingId: event.authorId }, { followerId: 1 })
				.lean<{ followerId: ObjectId }[]>()
				.exec();
			return this.notifyMany(
				event,
				followers.map((follow) => follow.followerId),
			);
		} catch (err) {
			this.logger.error(`notifyFollowers failed: ${(err as Error).message}`);
			return [];
		}
	}

	/** Everyone who liked a game (game release; likes stand in for a wishlist) **/
	public async notifyGameLikers(event: NotificationEvent, gameId: ObjectId): Promise<StoredNotification[]> {
		try {
			const likes = await this.likeModel
				.find({ likeGroup: LikeGroup.GAME, likeRefId: gameId }, { memberId: 1 })
				.lean<{ memberId: ObjectId }[]>()
				.exec();
			return this.notifyMany(
				event,
				likes.map((like) => like.memberId),
			);
		} catch (err) {
			this.logger.error(`notifyGameLikers failed: ${(err as Error).message}`);
			return [];
		}
	}

	/** Every active member (announcements), read in batches **/
	public async notifyActiveMembers(event: NotificationEvent): Promise<StoredNotification[]> {
		const stored: StoredNotification[] = [];
		try {
			const cursor = this.memberModel
				.find({ memberStatus: MemberStatus.ACTIVE }, { _id: 1 })
				.lean<{ _id: ObjectId }>()
				.cursor({ batchSize: BATCH_SIZE });
			let batch: ObjectId[] = [];
			for await (const member of cursor) {
				batch.push(member._id);
				if (batch.length === BATCH_SIZE) {
					stored.push(...(await this.notifyMany(event, batch)));
					batch = [];
				}
			}
			if (batch.length) stored.push(...(await this.notifyMany(event, batch)));
		} catch (err) {
			this.logger.error(`notifyActiveMembers failed: ${(err as Error).message}`);
		}
		return stored;
	}

	/** HELPERS **/

	/** The actor's nick for titles of profile events (likes on a profile, follows); never throws **/
	public async memberNick(memberId: ObjectId): Promise<string> {
		try {
			const member = await this.memberModel
				.findById(memberId, { memberNick: 1 })
				.lean<{ memberNick?: string }>()
				.exec();
			return member?.memberNick ?? 'A member';
		} catch {
			return 'A member';
		}
	}

	public static dedupeKey(event: NotificationEvent, receiverId: ObjectId): string {
		const ref =
			event.commentId ?? event.gameId ?? event.articleId ?? event.inquiryId ?? event.noticeId ?? event.authorId;
		const parts = [event.notificationType, event.notificationGroup, ref, event.authorId, receiverId].map(String);
		if (event.dedupeExtra) parts.push(event.dedupeExtra);
		return parts.join(':');
	}

	private isValidEvent(event: NotificationEvent): boolean {
		const groups = allowedGroups[event.notificationType];
		const ref = requiredRef[event.notificationGroup];
		const valid =
			Boolean(groups?.includes(event.notificationGroup)) &&
			Boolean(event.authorId) &&
			Boolean(event.notificationTitle?.trim()) &&
			(!ref || Boolean(event[ref]));
		if (!valid) this.logger.warn(`Rejected notification ${event.notificationType}/${event.notificationGroup}`);
		return valid;
	}

	/** The stored fields of an event (no dedupe parts), shared by the write and the live payload **/
	private toDocument(event: NotificationEvent) {
		const fields: Omit<NotificationEvent, 'dedupeExtra'> & { dedupeExtra?: string } = { ...event };
		delete fields.dedupeExtra;
		return {
			...fields,
			notificationTitle: clip(event.notificationTitle.trim(), TITLE_MAX),
			notificationDesc: clip(event.notificationDesc?.trim(), DESC_MAX),
			notificationStatus: NotificationStatus.WAIT,
		};
	}

	/** REAL TIME — best effort on top of storage: only online receivers, one author lookup and one count query **/

	private async deliver(event: NotificationEvent, stored: StoredNotification[]): Promise<void> {
		if (!stored.length) return;
		const online = new Set(this.socketGateway.onlineMembers(stored.map((entry) => idText(entry.receiverId))));
		if (!online.size) return;

		try {
			const [authorData, unread] = await Promise.all([
				this.memberModel.findById(event.authorId, { memberNick: 1, memberImage: 1, memberType: 1 }).lean<T>().exec(),
				this.unreadCounts([...online]),
			]);
			const createdAt = new Date();
			const base = this.toDocument(event);
			for (const entry of stored) {
				const key = idText(entry.receiverId);
				if (!online.has(key)) continue;
				this.socketGateway.notifyMember(key, {
					event: 'notification',
					unread: unread.get(key) ?? 0,
					notification: {
						...base,
						_id: entry._id,
						receiverId: entry.receiverId,
						createdAt,
						updatedAt: createdAt,
						authorData: authorData ?? null,
					},
				});
			}
		} catch (err) {
			this.logger.error(`Live notification delivery failed: ${(err as Error).message}`);
		}
	}

	private async unreadCounts(memberIds: string[]): Promise<Map<string, number>> {
		const rows = await this.notificationModel
			.aggregate<{ _id: ObjectId; total: number }>([
				{
					$match: {
						receiverId: { $in: memberIds.map((key) => new Types.ObjectId(key)) },
						notificationStatus: NotificationStatus.WAIT,
					},
				},
				{ $group: { _id: '$receiverId', total: { $sum: 1 } } },
			])
			.exec();
		return new Map(rows.map((row) => [idText(row._id), row.total]));
	}

	/** Keeps a member's other tabs in step after reading **/
	private async pushUnreadCount(memberId: ObjectId): Promise<void> {
		if (!this.socketGateway.isMemberOnline(idText(memberId))) return;
		try {
			const unread = await this.getUnreadNotificationCount(memberId);
			this.socketGateway.notifyMember(idText(memberId), { event: 'notificationCount', unread });
		} catch (err) {
			this.logger.error(`Unread count push failed: ${(err as Error).message}`);
		}
	}

	private async writeBatch(event: NotificationEvent, receivers: ObjectId[]): Promise<StoredNotification[]> {
		if (!receivers.length) return [];
		const base = this.toDocument(event);
		const operations: AnyBulkWriteOperation<Notification>[] = receivers.map((receiverId) => {
			const dedupeKey = NotificationService.dedupeKey(event, receiverId);
			return {
				updateOne: {
					filter: { dedupeKey },
					update: { $setOnInsert: { ...base, receiverId, dedupeKey } },
					upsert: true,
				},
			};
		});

		try {
			const result = await this.notificationModel.bulkWrite(operations, { ordered: false });
			const upsertedIds = (result.upsertedIds ?? {}) as Record<string, ObjectId>;
			return Object.entries(upsertedIds).map(([index, _id]) => ({
				_id,
				receiverId: receivers[Number(index)],
			}));
		} catch (err) {
			// A concurrent duplicate (E11000) is expected and harmless; keep whatever was stored
			const upserted = (err as { result?: { upsertedIds?: Record<string, unknown> } }).result?.upsertedIds ?? {};
			if ((err as { code?: number }).code !== 11000) {
				this.logger.error(`Notification write failed: ${(err as Error).message}`);
			}
			return Object.entries(upserted).map(([index, _id]) => ({
				_id: _id as ObjectId,
				receiverId: receivers[Number(index)],
			}));
		}
	}
}

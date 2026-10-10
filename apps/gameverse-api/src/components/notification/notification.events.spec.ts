/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Types } from 'mongoose';
import { GameService } from '../game/game.service';
import { BoardArticleService } from '../board-article/board-article.service';
import { MemberService } from '../member/member.service';
import { FollowService } from '../follow/follow.service';
import { CommentService } from '../comment/comment.service';
import { InquiryService } from '../inquiry/inquiry.service';
import { NoticeService } from '../notice/notice.service';
import { NotificationService } from './notification.service';
import { notificationStub } from './notification.testing';
import { NotificationGroup, NotificationType } from '../../libs/enums/notification.enum';
import { GameGenre, GameMode, GamePlatform, GameStatus, GameType } from '../../libs/enums/game.enum';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';
import { CommentGroup } from '../../libs/enums/comment.enum';
import { NoticeCategory, NoticeStatus } from '../../libs/enums/notice.enum';

const id = () => new Types.ObjectId() as any;
const exec = (value: unknown) => ({ exec: jest.fn().mockResolvedValue(value) });
const execOf = (value: unknown) => jest.fn().mockReturnValue(exec(value));
/** `.lean()` that can be awaited directly or followed by `.exec()` **/
const leanExecOf = (value: unknown) =>
	jest.fn().mockReturnValue({ lean: () => Object.assign(Promise.resolve(value), exec(value)) });
const flush = () => new Promise((resolve) => setImmediate(resolve));

const catalog = {
	gameType: GameType.PAID,
	gamePrice: 30,
	gameGenres: [GameGenre.RPG],
	gamePlatforms: [GamePlatform.PC],
	gameModes: [GameMode.SINGLE_PLAYER],
	gameImages: ['uploads/game/a.jpg'],
};

/** A real NotificationService whose database is down: proves events never fail the action that caused them **/
const brokenNotifications = () =>
	new NotificationService(
		{ bulkWrite: jest.fn().mockRejectedValue(new Error('db down')) } as any,
		{
			find: jest.fn(() => {
				throw new Error('db down');
			}),
		} as any,
		{
			find: jest.fn(() => {
				throw new Error('db down');
			}),
		} as any,
		{
			findById: jest.fn(() => {
				throw new Error('db down');
			}),
			find: jest.fn(() => {
				throw new Error('db down');
			}),
		} as any,
		{ onlineMembers: () => [], isMemberOnline: () => false, notifyMember: jest.fn() } as any,
	);

describe('Notification events', () => {
	describe('games', () => {
		const owner = id();
		const gameId = id();
		const game = { _id: gameId, memberId: owner, gameTitle: 'Hades', gameStatus: GameStatus.ACTIVE };

		const likeSetup = (modifier: number, notifications: any = notificationStub()) => {
			const gameModel = {
				findOne: jest.fn().mockResolvedValue(game),
				findByIdAndUpdate: execOf({ ...game, gameLikes: 1 }),
			};
			const likeService = { toggleLike: jest.fn().mockResolvedValue(modifier) };
			const service = new GameService(gameModel as any, {} as any, {} as any, likeService as any, notifications);
			return { service, notifications };
		};

		it('notifies the owner when a game is liked, and not when it is unliked', async () => {
			const actor = id();
			const liked = likeSetup(1);
			const result = await liked.service.likeTargetGame(actor, gameId);

			expect(result).toMatchObject({ gameLikes: 1 });
			expect(liked.notifications.notify).toHaveBeenCalledWith(
				{
					notificationType: NotificationType.LIKE,
					notificationGroup: NotificationGroup.GAME,
					notificationTitle: 'Hades',
					authorId: actor,
					gameId,
				},
				owner,
			);

			const unliked = likeSetup(-1);
			await unliked.service.likeTargetGame(actor, gameId);
			expect(unliked.notifications.notify).not.toHaveBeenCalled();
		});

		it('still likes the game when the notification database is down', async () => {
			const { service } = likeSetup(1, brokenNotifications());
			await expect(service.likeTargetGame(id(), gameId)).resolves.toMatchObject({ gameLikes: 1 });
		});

		it('tells the developer’s followers about a new game, in the background', async () => {
			const notifications = notificationStub();
			const created = { ...game, ...catalog };
			const gameModel = { create: jest.fn().mockResolvedValue(created) };
			const memberService = { memberStatsEditor: jest.fn().mockResolvedValue({}) };
			const service = new GameService(
				gameModel as any,
				memberService as any,
				{} as any,
				{} as any,
				notifications as any,
			);

			const result = await service.createGame({ ...catalog, gameTitle: 'Hades', memberId: owner } as any);

			expect(result).toBe(created);
			expect(notifications.notifyFollowers).toHaveBeenCalledWith({
				notificationType: NotificationType.NEW_GAME,
				notificationGroup: NotificationGroup.GAME,
				notificationTitle: 'Hades',
				authorId: owner,
				gameId,
			});
		});

		it('creates the game even when the follower lookup fails', async () => {
			const gameModel = { create: jest.fn().mockResolvedValue({ ...game, ...catalog }) };
			const memberService = { memberStatsEditor: jest.fn().mockResolvedValue({}) };
			const service = new GameService(
				gameModel as any,
				memberService as any,
				{} as any,
				{} as any,
				brokenNotifications(),
			);

			await expect(
				service.createGame({ ...catalog, gameTitle: 'Hades', memberId: owner } as any),
			).resolves.toBeTruthy();
			await flush();
		});

		const updateSetup = (previousStatus: GameStatus, nextStatus: GameStatus) => {
			const notifications = notificationStub();
			const gameModel = {
				findOne: leanExecOf({ ...game, ...catalog, gameStatus: previousStatus }),
				findById: leanExecOf({ ...game, ...catalog, gameStatus: previousStatus }),
				findByIdAndUpdate: execOf({ ...game, gameStatus: nextStatus }),
			};
			const memberService = { memberStatsEditor: jest.fn().mockResolvedValue({}) };
			const service = new GameService(
				gameModel as any,
				memberService as any,
				{} as any,
				{} as any,
				notifications as any,
			);
			return { service, notifications };
		};

		it('tells members who liked an upcoming game that it is out (owner or admin publishes it)', async () => {
			const byOwner = updateSetup(GameStatus.UPCOMING, GameStatus.ACTIVE);
			await byOwner.service.updateGame(owner, { _id: gameId, gameStatus: GameStatus.ACTIVE });
			expect(byOwner.notifications.notifyGameLikers).toHaveBeenCalledWith(
				expect.objectContaining({ notificationType: NotificationType.GAME_RELEASE, authorId: owner, gameId }),
				gameId,
			);

			const byAdmin = updateSetup(GameStatus.UPCOMING, GameStatus.ACTIVE);
			await byAdmin.service.updateGameByAdmin({ _id: gameId, gameStatus: GameStatus.ACTIVE }, id());
			expect(byAdmin.notifications.notifyGameLikers).toHaveBeenCalledTimes(1);
		});

		it('does not announce a release for other edits', async () => {
			for (const [from, to] of [
				[GameStatus.ACTIVE, GameStatus.ACTIVE],
				[GameStatus.UPCOMING, GameStatus.UPCOMING],
				[GameStatus.ACTIVE, GameStatus.UPCOMING],
			]) {
				const { service, notifications } = updateSetup(from, to);
				await service.updateGame(owner, { _id: gameId, gameStatus: to });
				expect(notifications.notifyGameLikers).not.toHaveBeenCalled();
			}
		});

		it('tells the owner when an admin removes their game, signed by that admin', async () => {
			const adminId = id();
			const { service, notifications } = updateSetup(GameStatus.ACTIVE, GameStatus.DELETE);

			await service.updateGameByAdmin({ _id: gameId, gameStatus: GameStatus.DELETE }, adminId);

			const [event, receiver] = notifications.notify.mock.calls[0];
			expect(receiver).toBe(owner);
			expect(event).toMatchObject({
				notificationType: NotificationType.MODERATION,
				notificationGroup: NotificationGroup.GAME,
				authorId: adminId,
				gameId,
				notificationTitle: 'Hades',
			});
			expect(event.dedupeExtra).toMatch(/^\d+$/);
		});

		it('sends no moderation notice for a restore or an already-deleted game', async () => {
			const restore = updateSetup(GameStatus.DELETE, GameStatus.ACTIVE);
			await restore.service.updateGameByAdmin({ _id: gameId, gameStatus: GameStatus.ACTIVE }, id());
			expect(restore.notifications.notify).not.toHaveBeenCalled();

			const again = updateSetup(GameStatus.DELETE, GameStatus.DELETE);
			await again.service.updateGameByAdmin({ _id: gameId, gameStatus: GameStatus.DELETE }, id());
			expect(again.notifications.notify).not.toHaveBeenCalled();
		});
	});

	describe('community', () => {
		const author = id();
		const articleId = id();
		const article = {
			_id: articleId,
			memberId: author,
			articleTitle: 'Best RPGs',
			articleStatus: BoardArticleStatus.ACTIVE,
		};

		it('notifies the author when an article is liked, not when unliked', async () => {
			for (const modifier of [1, -1]) {
				const notifications = notificationStub();
				const model = {
					findOne: jest.fn().mockReturnValue(exec(article)),
					findByIdAndUpdate: execOf({ ...article, articleLikes: 1 }),
				};
				const service = new BoardArticleService(
					model as any,
					{} as any,
					{} as any,
					{ toggleLike: jest.fn().mockResolvedValue(modifier) } as any,
					notifications as any,
				);
				const actor = id();

				await service.likeTargetBoardArticle(actor, articleId);

				if (modifier > 0) {
					expect(notifications.notify).toHaveBeenCalledWith(
						expect.objectContaining({ notificationType: NotificationType.LIKE, articleId, authorId: actor }),
						author,
					);
				} else {
					expect(notifications.notify).not.toHaveBeenCalled();
				}
			}
		});

		it('tells the author when an admin removes their article; never for a restore', async () => {
			const adminId = id();
			const setup = (previousStatus: BoardArticleStatus) => {
				const notifications = notificationStub();
				const model = {
					findOneAndUpdate: jest
						.fn()
						.mockReturnValue({ lean: () => exec({ ...article, articleStatus: previousStatus }) }),
				};
				const service = new BoardArticleService(
					model as any,
					{ memberStatsEditor: jest.fn().mockResolvedValue({}) } as any,
					{} as any,
					{} as any,
					notifications as any,
				);
				return { service, notifications };
			};

			const removed = setup(BoardArticleStatus.ACTIVE);
			const result = await removed.service.updateBoardArticleByAdmin(
				{ _id: articleId, articleStatus: BoardArticleStatus.DELETE },
				adminId,
			);
			expect(result.articleStatus).toBe(BoardArticleStatus.DELETE);
			expect(removed.notifications.notify).toHaveBeenCalledWith(
				expect.objectContaining({
					notificationType: NotificationType.MODERATION,
					notificationGroup: NotificationGroup.ARTICLE,
					authorId: adminId,
					articleId,
				}),
				author,
			);

			const restored = setup(BoardArticleStatus.DELETE);
			await restored.service.updateBoardArticleByAdmin(
				{ _id: articleId, articleStatus: BoardArticleStatus.ACTIVE },
				adminId,
			);
			expect(restored.notifications.notify).not.toHaveBeenCalled();
		});

		const commentSetup = (stats: { game?: unknown; article?: unknown; member?: unknown }) => {
			const notifications = notificationStub();
			const created = { _id: id() };
			const service = new CommentService(
				{ create: jest.fn().mockResolvedValue(created) } as any,
				{ memberStatsEditor: jest.fn().mockResolvedValue(stats.member ?? null) } as any,
				{ gameStatsEditor: jest.fn().mockResolvedValue(stats.game ?? null) } as any,
				{ boardArticleStatsEditor: jest.fn().mockResolvedValue(stats.article ?? null) } as any,
				notifications as any,
			);
			return { service, notifications, created };
		};

		it('notifies the owner of a commented game, article or profile with the comment as the excerpt', async () => {
			const actor = id();
			const gameOwner = id();
			const game = { _id: id(), memberId: gameOwner, gameTitle: 'Hades' };
			const onGame = commentSetup({ game });
			await onGame.service.createComment(actor, {
				commentGroup: CommentGroup.GAME,
				commentRefId: game._id,
				commentContent: 'Co-op?',
			});
			expect(onGame.notifications.notify).toHaveBeenCalledWith(
				{
					notificationType: NotificationType.COMMENT,
					notificationGroup: NotificationGroup.GAME,
					notificationTitle: 'Hades',
					notificationDesc: 'Co-op?',
					authorId: actor,
					commentId: onGame.created._id,
					gameId: game._id,
				},
				gameOwner,
			);

			const onArticle = commentSetup({ article });
			await onArticle.service.createComment(actor, {
				commentGroup: CommentGroup.ARTICLE,
				commentRefId: articleId,
				commentContent: 'Agree',
			});
			expect(onArticle.notifications.notify.mock.calls[0][1]).toBe(author);
			expect(onArticle.notifications.notify.mock.calls[0][0]).toMatchObject({
				articleId,
				notificationTitle: 'Best RPGs',
			});

			const profileOwner = id();
			const onProfile = commentSetup({ member: { _id: profileOwner } });
			await onProfile.service.createComment(actor, {
				commentGroup: CommentGroup.MEMBER,
				commentRefId: profileOwner,
				commentContent: 'GG',
			});
			expect(onProfile.notifications.notify.mock.calls[0][1]).toBe(profileOwner);
			expect(onProfile.notifications.notify.mock.calls[0][0]).toMatchObject({
				notificationGroup: NotificationGroup.MEMBER,
				notificationTitle: 'Actor',
			});
		});

		it('sends nothing when the commented target no longer exists', async () => {
			const { service, notifications, created } = commentSetup({});
			await expect(
				service.createComment(id(), {
					commentGroup: CommentGroup.GAME,
					commentRefId: id(),
					commentContent: 'x',
				} as any),
			).resolves.toBe(created);
			expect(notifications.notify).not.toHaveBeenCalled();
		});
	});

	describe('members and follows', () => {
		const memberSetup = (modifier: number) => {
			const notifications = notificationStub();
			const target = id();
			const service = new MemberService(
				{
					findOne: jest.fn().mockReturnValue(exec({ _id: target })),
					findByIdAndUpdate: execOf({ _id: target, memberLikes: 1 }),
				} as any,
				{} as any,
				{} as any,
				{} as any,
				{ toggleLike: jest.fn().mockResolvedValue(modifier) } as any,
				notifications as any,
			);
			return { service, notifications, target };
		};

		it('notifies a member whose profile was liked, with the liker’s name; not on unlike or self-like', async () => {
			const actor = id();
			const liked = memberSetup(1);
			await liked.service.likeTargetMember(actor, liked.target);
			expect(liked.notifications.memberNick).toHaveBeenCalledWith(actor);
			expect(liked.notifications.notify).toHaveBeenCalledWith(
				{
					notificationType: NotificationType.LIKE,
					notificationGroup: NotificationGroup.MEMBER,
					notificationTitle: 'Actor',
					authorId: actor,
				},
				liked.target,
			);

			const unliked = memberSetup(-1);
			await unliked.service.likeTargetMember(actor, unliked.target);
			expect(unliked.notifications.notify).not.toHaveBeenCalled();

			const self = memberSetup(1);
			await self.service.likeTargetMember(self.target, self.target);
			expect(self.notifications.memberNick).not.toHaveBeenCalled();
			expect(self.notifications.notify).not.toHaveBeenCalled();
		});

		it('notifies the followed member with the follower’s name', async () => {
			const notifications = notificationStub();
			const follower = id();
			const following = id();
			const registered = { _id: id(), followerId: follower, followingId: following };
			const service = new FollowService(
				{ create: jest.fn().mockResolvedValue(registered) } as any,
				{
					getMember: jest.fn().mockResolvedValue({ _id: following }),
					memberStatsEditor: jest.fn().mockResolvedValue({}),
				} as any,
				notifications as any,
			);

			await expect(service.subscribe(follower, following)).resolves.toBe(registered);
			expect(notifications.notify).toHaveBeenCalledWith(
				{
					notificationType: NotificationType.FOLLOW,
					notificationGroup: NotificationGroup.MEMBER,
					notificationTitle: 'Actor',
					authorId: follower,
				},
				following,
			);
		});
	});

	describe('support and announcements', () => {
		it('tells the member when their inquiry is answered; each answer is its own notice', async () => {
			const notifications = notificationStub();
			const asker = id();
			const adminId = id();
			const answeredAt = new Date(1_700_000_000_000);
			const inquiry = { _id: id(), memberId: asker, inquiryTitle: 'Refund', answerContent: 'Done', answeredAt };
			const service = new InquiryService({ findOneAndUpdate: execOf(inquiry) } as any, notifications as any);

			await expect(service.answerInquiry(adminId, { _id: inquiry._id, answerContent: 'Done' })).resolves.toBe(inquiry);
			expect(notifications.notify).toHaveBeenCalledWith(
				{
					notificationType: NotificationType.INQUIRY_ANSWER,
					notificationGroup: NotificationGroup.INQUIRY,
					notificationTitle: 'Refund',
					notificationDesc: 'Done',
					authorId: adminId,
					inquiryId: inquiry._id,
					dedupeExtra: '1700000000000',
				},
				asker,
			);
		});

		it('still answers the inquiry when the notification database is down', async () => {
			const inquiry = {
				_id: id(),
				memberId: id(),
				inquiryTitle: 'Refund',
				answerContent: 'Done',
				answeredAt: new Date(),
			};
			const service = new InquiryService({ findOneAndUpdate: execOf(inquiry) } as any, brokenNotifications());
			await expect(service.answerInquiry(id(), { _id: inquiry._id, answerContent: 'Done' })).resolves.toBe(inquiry);
		});

		const notice = (status: NoticeStatus, category: NoticeCategory) => ({
			_id: id(),
			memberId: id(),
			noticeTitle: 'Maintenance',
			noticeStatus: status,
			noticeCategory: category,
		});

		it('announces a notice published as ACTIVE to every active member; drafts and FAQ entries stay quiet', async () => {
			for (const [status, category, announced] of [
				[NoticeStatus.ACTIVE, NoticeCategory.NOTICE, true],
				[NoticeStatus.HOLD, NoticeCategory.NOTICE, false],
				[NoticeStatus.ACTIVE, NoticeCategory.FAQ, false],
			] as const) {
				const notifications = notificationStub();
				const created = notice(status, category);
				const service = new NoticeService(
					{ create: jest.fn().mockResolvedValue(created) } as any,
					notifications as any,
				);

				await expect(service.createNotice(created.memberId, {} as any)).resolves.toBe(created);
				if (announced) {
					expect(notifications.notifyActiveMembers).toHaveBeenCalledWith({
						notificationType: NotificationType.ANNOUNCEMENT,
						notificationGroup: NotificationGroup.NOTICE,
						notificationTitle: 'Maintenance',
						authorId: created.memberId,
						noticeId: created._id,
					});
				} else {
					expect(notifications.notifyActiveMembers).not.toHaveBeenCalled();
				}
			}
		});

		it('announces when a draft is published or moved into NOTICE, not when a public notice is edited', async () => {
			const setup = (previous: object, next: object) => {
				const notifications = notificationStub();
				const service = new NoticeService(
					{ findById: leanExecOf(previous), findOneAndUpdate: execOf(next) } as any,
					notifications as any,
				);
				return { service, notifications };
			};
			const live = notice(NoticeStatus.ACTIVE, NoticeCategory.NOTICE);

			const published = setup({ noticeStatus: NoticeStatus.HOLD, noticeCategory: NoticeCategory.NOTICE }, live);
			await published.service.updateNotice({ _id: live._id, noticeStatus: NoticeStatus.ACTIVE });
			expect(published.notifications.notifyActiveMembers).toHaveBeenCalledTimes(1);

			const moved = setup({ noticeStatus: NoticeStatus.ACTIVE, noticeCategory: NoticeCategory.FAQ }, live);
			await moved.service.updateNotice({ _id: live._id, noticeCategory: NoticeCategory.NOTICE });
			expect(moved.notifications.notifyActiveMembers).toHaveBeenCalledTimes(1);

			const edited = setup({ noticeStatus: NoticeStatus.ACTIVE, noticeCategory: NoticeCategory.NOTICE }, live);
			await edited.service.updateNotice({ _id: live._id, noticeTitle: 'Maintenance (updated)' });
			expect(edited.notifications.notifyActiveMembers).not.toHaveBeenCalled();
		});

		it('publishes the notice even when the member lookup fails', async () => {
			const created = notice(NoticeStatus.ACTIVE, NoticeCategory.NOTICE);
			const service = new NoticeService({ create: jest.fn().mockResolvedValue(created) } as any, brokenNotifications());
			await expect(service.createNotice(created.memberId, {} as any)).resolves.toBe(created);
			await flush();
		});
	});
});

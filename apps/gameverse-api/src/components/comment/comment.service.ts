import { BoardArticleService } from './../board-article/board-article.service';
import { GameService } from './../game/game.service';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { MemberService } from '../member/member.service';
import { CommentInput, CommentsInquiry } from '../../libs/dto/comment/comment.input';
import { Direction, Message } from '../../libs/enums/common.enum';
import { CommentGroup, CommentStatus } from '../../libs/enums/comment.enum';
import { Comments, Comment } from '../../libs/dto/comment/comment';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';
import { T } from '../../libs/types/common';
import { lookupMember } from '../../libs/config';
import { NotificationService } from '../notification/notification.service';
import { NotificationGroup, NotificationType } from '../../libs/enums/notification.enum';
import { NotificationEvent } from '../../libs/types/notification';

@Injectable()
export class CommentService {
	constructor(
		@InjectModel('Comment') private readonly commentModel: Model<Comment>,
		private readonly memberService: MemberService,
		private readonly gameService: GameService,
		private readonly boardArticleService: BoardArticleService,
		private readonly notificationService: NotificationService,
	) {}

	public async createComment(memberId: ObjectId, input: CommentInput): Promise<Comment> {
		input.memberId = memberId;
		let result: Comment | null = null;

		try {
			result = await this.commentModel.create(input);
		} catch (err) {
			console.log('Error, Service.model:', (err as Error).message);
			throw new BadRequestException(Message.CREATE_FAILED);
		}

		// The counters' updated documents tell who owns the target, so the notification needs no extra lookup
		let notice: { event: NotificationEvent; receiverId: ObjectId } | null = null;
		const base = {
			notificationType: NotificationType.COMMENT,
			notificationDesc: input.commentContent,
			authorId: memberId,
			commentId: result?._id,
		};
		switch (input.commentGroup) {
			case CommentGroup.GAME: {
				const game = await this.gameService.gameStatsEditor({
					_id: input.commentRefId,
					targetKey: 'gameComments',
					modifier: 1,
				});
				if (game) {
					notice = {
						event: {
							...base,
							notificationGroup: NotificationGroup.GAME,
							notificationTitle: game.gameTitle,
							gameId: game._id,
						},
						receiverId: game.memberId,
					};
				}
				break;
			}

			case CommentGroup.ARTICLE: {
				const article = await this.boardArticleService.boardArticleStatsEditor({
					_id: input.commentRefId,
					targetKey: 'articleComments',
					modifier: 1,
				});
				if (article) {
					notice = {
						event: {
							...base,
							notificationGroup: NotificationGroup.ARTICLE,
							notificationTitle: article.articleTitle,
							articleId: article._id,
						},
						receiverId: article.memberId,
					};
				}
				break;
			}

			case CommentGroup.MEMBER: {
				const member = await this.memberService.memberStatsEditor({
					_id: input.commentRefId,
					targetKey: 'memberComments',
					modifier: 1,
				});
				if (member) {
					notice = {
						event: {
							...base,
							notificationGroup: NotificationGroup.MEMBER,
							notificationTitle: await this.notificationService.memberNick(memberId),
						},
						receiverId: member._id,
					};
				}
				break;
			}
		}
		if (!result) throw new InternalServerErrorException(Message.CREATE_FAILED);
		if (notice) await this.notificationService.notify(notice.event, notice.receiverId);
		return result;
	}

	public async updateComment(memberId: ObjectId, input: CommentUpdate): Promise<Comment> {
		const { _id } = input;
		const result = await this.commentModel
			.findOneAndUpdate(
				{
					_id: _id,
					memberId: memberId,
					commentStatus: CommentStatus.ACTIVE,
				},
				input,
				{
					new: true,
				},
			)
			.exec();
		if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
		if (input.commentStatus === CommentStatus.DELETE) await this.decrementTargetCounter(result);
		return result;
	}

	public async getComments(memberId: ObjectId, input: CommentsInquiry): Promise<Comments> {
		const { commentRefId, commentGroup } = input.search;
		const match: T = { commentRefId, commentGroup, commentStatus: CommentStatus.ACTIVE };
		const sort: T = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

		const result = await this.commentModel
			.aggregate<Comments>([
				{ $match: match },
				{ $sort: sort },
				{
					$facet: {
						list: [
							{ $skip: (input.page - 1) * input.limit },
							{ $limit: input.limit },
							lookupMember,
							{ $unwind: '$memberData' },
						],

						metaCounter: [{ $count: 'total' }],
					},
				},
			])
			.exec();

		if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
		return result[0];
	}

	public async removeCommentByAdmin(input: ObjectId): Promise<Comment> {
		const result = await this.commentModel.findByIdAndDelete(input);

		if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
		await this.decrementTargetCounter(result);

		return result;
	}

	private async decrementTargetCounter(comment: Comment): Promise<void> {
		switch (comment.commentGroup) {
			case CommentGroup.GAME:
				await this.gameService.gameStatsEditor({ _id: comment.commentRefId, targetKey: 'gameComments', modifier: -1 });
				break;
			case CommentGroup.ARTICLE:
				await this.boardArticleService.boardArticleStatsEditor({
					_id: comment.commentRefId,
					targetKey: 'articleComments',
					modifier: -1,
				});
				break;
			case CommentGroup.MEMBER:
				await this.memberService.memberStatsEditor({
					_id: comment.commentRefId,
					targetKey: 'memberComments',
					modifier: -1,
				});
				break;
		}
	}
}

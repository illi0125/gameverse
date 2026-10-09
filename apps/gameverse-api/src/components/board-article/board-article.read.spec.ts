/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { InternalServerErrorException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';
import { BoardArticleService } from './board-article.service';

function articleQuery(result: unknown) {
	return {
		lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(result) }),
	};
}

describe('Board article reads', () => {
	it('returns an active article with null memberData when its author was deleted', async () => {
		const articleId = new Types.ObjectId();
		const authorId = new Types.ObjectId();
		const article = { _id: articleId, memberId: authorId, articleStatus: BoardArticleStatus.ACTIVE, articleViews: 0 };
		const boardArticleModel = { findOne: jest.fn().mockReturnValue(articleQuery(article)) };
		const memberService = { getMemberOrNull: jest.fn().mockResolvedValue(null) };
		const service = new BoardArticleService(boardArticleModel as any, memberService as any, {} as any, {} as any);

		const result = await service.getBoardArticle(null as any, articleId as any);

		expect(result.memberData).toBeNull();
		expect(memberService.getMemberOrNull).toHaveBeenCalledWith(authorId);
	});

	it('still reports a missing or deleted article as not found', async () => {
		const boardArticleModel = { findOne: jest.fn().mockReturnValue(articleQuery(null)) };
		const service = new BoardArticleService(boardArticleModel as any, {} as any, {} as any, {} as any);

		await expect(service.getBoardArticle(null as any, new Types.ObjectId() as any)).rejects.toBeInstanceOf(
			InternalServerErrorException,
		);
	});
});

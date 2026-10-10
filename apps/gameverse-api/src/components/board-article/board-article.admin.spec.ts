/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { InternalServerErrorException } from '@nestjs/common';
import { Types } from 'mongoose';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';
import { BoardArticleService } from './board-article.service';
import { notificationStub } from '../notification/notification.testing';

function setup(previous: unknown) {
	const findOneAndUpdate = jest.fn().mockReturnValue({
		lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(previous) }),
	});
	const memberStatsEditor = jest.fn().mockResolvedValue(null);
	const service = new BoardArticleService(
		{ findOneAndUpdate } as any,
		{ memberStatsEditor } as any,
		{} as any,
		{} as any,
		notificationStub() as any,
	);
	return { service, findOneAndUpdate, memberStatsEditor };
}

describe('Board article admin updates', () => {
	const articleId = new Types.ObjectId();
	const authorId = new Types.ObjectId();
	const article = (articleStatus: BoardArticleStatus) => ({ _id: articleId, memberId: authorId, articleStatus });

	it('deletes an active article and decrements the author counter', async () => {
		const { service, memberStatsEditor } = setup(article(BoardArticleStatus.ACTIVE));

		const result = await service.updateBoardArticleByAdmin({
			_id: articleId,
			articleStatus: BoardArticleStatus.DELETE,
		} as any);

		expect(result.articleStatus).toBe(BoardArticleStatus.DELETE);
		expect(memberStatsEditor).toHaveBeenCalledWith({ _id: authorId, targetKey: 'memberArticles', modifier: -1 });
	});

	it('restores a deleted article and increments the author counter', async () => {
		const { service, findOneAndUpdate, memberStatsEditor } = setup(article(BoardArticleStatus.DELETE));

		const result = await service.updateBoardArticleByAdmin({
			_id: articleId,
			articleStatus: BoardArticleStatus.ACTIVE,
		} as any);

		expect(findOneAndUpdate.mock.calls[0][0]).toEqual({ _id: articleId });
		expect(result.articleStatus).toBe(BoardArticleStatus.ACTIVE);
		expect(memberStatsEditor).toHaveBeenCalledWith({ _id: authorId, targetKey: 'memberArticles', modifier: 1 });
	});

	it('leaves the counter alone when the status does not change', async () => {
		const { service, memberStatsEditor } = setup(article(BoardArticleStatus.ACTIVE));

		await service.updateBoardArticleByAdmin({ _id: articleId, articleStatus: BoardArticleStatus.ACTIVE } as any);
		await service.updateBoardArticleByAdmin({ _id: articleId, articleTitle: 'Edited' } as any);

		expect(memberStatsEditor).not.toHaveBeenCalled();
	});

	it('reports a missing article as an update failure', async () => {
		const { service } = setup(null);

		await expect(
			service.updateBoardArticleByAdmin({ _id: articleId, articleStatus: BoardArticleStatus.ACTIVE } as any),
		).rejects.toBeInstanceOf(InternalServerErrorException);
	});
});

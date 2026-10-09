import { Module } from '@nestjs/common';
import { MemberModule } from './member/member.module';
import { GameModule } from './game/game.module';
import { AuthModule } from './auth/auth.module';
import { CommentModule } from './comment/comment.module';
import { LikeModule } from './like/like.module';
import { ViewModule } from './view/view.module';
import { FollowModule } from './follow/follow.module';
import { BoardArticleModule } from './board-article/board-article.module';
import { NoticeModule } from './notice/notice.module';
import { InquiryModule } from './inquiry/inquiry.module';

@Module({
	imports: [
		MemberModule,
		GameModule,
		AuthModule,
		CommentModule,
		LikeModule,
		ViewModule,
		FollowModule,
		BoardArticleModule,
		NoticeModule,
		InquiryModule,
	],
})
export class ComponentsModule {}

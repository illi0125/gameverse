import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import GameSchema from '../../schemas/Game.model';
import { AuthModule } from '../auth/auth.module';
import { LikeModule } from '../like/like.module';
import { MemberModule } from '../member/member.module';
import { ViewModule } from '../view/view.module';
import { GameResolver } from './game.resolver';
import { GameService } from './game.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
	imports: [
		MongooseModule.forFeature([{ name: 'Game', schema: GameSchema }]),
		AuthModule,
		ViewModule,
		MemberModule,
		LikeModule,
		NotificationModule,
	],
	providers: [GameResolver, GameService],
	exports: [GameService],
})
export class GameModule {}

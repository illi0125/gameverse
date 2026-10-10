import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import NotificationSchema from '../../schemas/Notification.model';
import FollowSchema from '../../schemas/Follow.model';
import LikeSchema from '../../schemas/Like.model';
import MemberSchema from '../../schemas/Member.model';
import { NotificationService } from './notification.service';
import { NotificationResolver } from './notification.resolver';
import { AuthModule } from '../auth/auth.module';
import { SocketModule } from '../../socket/socket.module';

@Module({
	imports: [
		MongooseModule.forFeature([
			{ name: 'Notification', schema: NotificationSchema },
			{ name: 'Follow', schema: FollowSchema },
			{ name: 'Like', schema: LikeSchema },
			{ name: 'Member', schema: MemberSchema },
		]),
		AuthModule,
		SocketModule,
	],
	providers: [NotificationResolver, NotificationService],
	exports: [NotificationService],
})
export class NotificationModule {}

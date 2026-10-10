import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import MemberSchema from '../../schemas/Member.model';
import { jwtOptionsFactory } from './jwt.config';

@Module({
	imports: [
		HttpModule,
		MongooseModule.forFeature([{ name: 'Member', schema: MemberSchema }]),
		JwtModule.registerAsync({
			imports: [ConfigModule],
			inject: [ConfigService],
			useFactory: jwtOptionsFactory,
		}),
	],
	providers: [AuthService],
	exports: [AuthService],
})
export class AuthModule {}

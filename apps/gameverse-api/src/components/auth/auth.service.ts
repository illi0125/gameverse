import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { T } from '../../libs/types/common';
import { Member } from '../../libs/dto/member/member';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { MemberStatus } from '../../libs/enums/member.enum';
import { Message } from '../../libs/enums/common.enum';

@Injectable()
export class AuthService {
	constructor(
		private jwtService: JwtService,
		@InjectModel('Member') private readonly memberModel: Model<Member>,
	) {}

	public async hashPassword(memberPassword: string): Promise<string> {
		const salt = await bcrypt.genSalt();
		return await bcrypt.hash(memberPassword, salt);
	}

	public async comparePasswords(password: string, hashedPassword: string): Promise<boolean> {
		return await bcrypt.compare(password, hashedPassword);
	}

	public async createToken(member: Member): Promise<string> {
		// console.log('member:', member);
		const memberRecord = member as unknown as Record<string, unknown>;
		const documentRecord = memberRecord._doc;
		const source =
			typeof documentRecord === 'object' && documentRecord !== null
				? (documentRecord as Record<string, unknown>)
				: memberRecord;
		const payload: T = { ...source };
		delete payload.memberPassword;
		// console.log('payload:', payload);

		return await this.jwtService.signAsync(payload);
	}
	public async verifyToken(token: string): Promise<Member> {
		let memberId: ObjectId;
		try {
			const payload = await this.jwtService.verifyAsync<{ _id?: unknown }>(token);
			if (typeof payload._id !== 'string') throw new Error('Token member ID is missing');
			memberId = shapeIntoMongoObjectId(payload._id);
		} catch {
			throw new UnauthorizedException(Message.NOT_AUTHENTICATED);
		}

		const member = await this.memberModel.findOne({ _id: memberId, memberStatus: MemberStatus.ACTIVE }).lean().exec();
		if (!member) throw new UnauthorizedException(Message.NOT_AUTHENTICATED);

		return { ...member, memberGames: member.memberGames ?? 0 };
	}
}

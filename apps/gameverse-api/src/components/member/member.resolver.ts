import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from '../../libs/dto/member/member.input';
import { Member, Members } from '../../libs/dto/member/member';
import { HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { type ObjectId } from 'mongoose';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberType } from '../../libs/enums/member.enum';
import { MemberUpdate } from '../../libs/dto/member/member.update';
import {
	detectImageExtension,
	getSerialForImage,
	IMAGE_SIGNATURE_LENGTH,
	shapeIntoMongoObjectId,
	validMimeTypes,
} from '../../libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { GraphQLUpload, FileUpload } from 'graphql-upload';
import { closeSync, createWriteStream, mkdirSync, openSync, readSync, renameSync, rmSync } from 'fs';
import * as path from 'path';
import { Message } from '../../libs/enums/common.enum';
import { AuthAttemptService, clientIp } from '../../libs/security/attempt-limiter';

@Resolver()
export class MemberResolver {
	constructor(
		private readonly memberService: MemberService,
		private readonly authAttempts: AuthAttemptService,
	) {}

	@Mutation(() => Member)
	public async signup(@Args('input') input: MemberInput, @Context() context: { req?: any }): Promise<Member> {
		console.log('Mutation: signup');
		if (!this.authAttempts.allowSignup(clientIp(context?.req))) {
			throw new HttpException(Message.TOO_MANY_ATTEMPTS, HttpStatus.TOO_MANY_REQUESTS);
		}
		return await this.memberService.signup(input);
	}

	@Mutation(() => Member)
	public async login(@Args('input') input: LoginInput, @Context() context: { req?: any }): Promise<Member> {
		console.log('Mutation: login');
		const ip = clientIp(context?.req);
		if (!this.authAttempts.allowLogin(ip, input.memberNick)) {
			throw new HttpException(Message.TOO_MANY_ATTEMPTS, HttpStatus.TOO_MANY_REQUESTS);
		}
		const member = await this.memberService.login(input);
		this.authAttempts.loginSucceeded(ip, input.memberNick);
		return member;
	}
	@UseGuards(AuthGuard)
	@Query(() => String)
	public async checkAuth(@AuthMember('memberNick') memberNick: string): Promise<string> {
		console.log('Query: checkAuth');
		console.log('memberNick:', memberNick);
		return `Hi  ${memberNick}`;
	}

	@Roles(MemberType.USER, MemberType.AGENT)
	@UseGuards(RolesGuard)
	@Query(() => String)
	public async checkAuthRoles(@AuthMember() authMember: Member): Promise<string> {
		console.log('Query: checkAuthRoles');
		return `Hi  ${authMember.memberNick}, you are ${authMember.memberType} (memberId: ${authMember._id})`;
	}

	// Authenticated
	@UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async updateMember(
		@Args('input') input: MemberUpdate,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Member> {
		console.log('Mutation: updateMember');
		delete input._id;
		return await this.memberService.updateMember(memberId, input);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Member)
	public async getMember(
		@Args('memberId') input: string,
		@AuthMember('_id') memberId: ObjectId, //
	): Promise<Member> {
		console.log('Query: getMember');
		console.log('memberId:', memberId);
		const targetId = shapeIntoMongoObjectId(input);
		return await this.memberService.getMember(memberId, targetId);
	}

	@UseGuards(WithoutGuard)
	@Query(() => Members)
	public async getAgents(
		@Args('input') input: AgentsInquiry,
		@AuthMember('_id') memberId: ObjectId, //
	): Promise<Members> {
		console.log('Query: getAgents');
		return await this.memberService.getAgents(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Mutation(() => Member)
	public async likeTargetMember(
		@Args('memberId') input: string,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Member> {
		console.log('Mutation: likeTargetMember');
		const likeRefId = shapeIntoMongoObjectId(input);
		return await this.memberService.likeTargetMember(memberId, likeRefId);
	}

	// ----------------------------------------
	// ADMIN
	// ----------------------------------------

	// Authorization: ADMIN
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Members)
	public async getAllMembersByAdmin(@Args('input') input: MembersInquiry): Promise<Members> {
		console.log('Query: getAllMembersByAdmin');
		return await this.memberService.getAllMembersByAdmin(input);
	}

	// Authorization: ADMIN
	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Member)
	public async updateMemberByAdmin(@Args('input') input: MemberUpdate): Promise<Member> {
		console.log('Mutation: updateMemberByAdmin');
		return await this.memberService.updateMemberByAdmin(input);
	}

	// ----------------------------------------
	// UPLOADER
	// ----------------------------------------
	@UseGuards(AuthGuard)
	@Mutation((returns) => String)
	public async imageUploader(
		@Args({ name: 'file', type: () => GraphQLUpload })
		{ createReadStream, filename, mimetype }: FileUpload,
		@Args('target') target: String,
	): Promise<string> {
		console.log('Mutation: imageUploader');

		if (!filename) throw new Error(Message.UPLOAD_FAILED);
		const validMime = validMimeTypes.includes(mimetype);
		if (!validMime) throw new Error(Message.PROVIDE_ALLOWED_FORMAT);

		return await this.saveImage(createReadStream(), String(target));
	}

	@UseGuards(AuthGuard)
	@Mutation((returns) => [String])
	public async imagesUploader(
		@Args('files', { type: () => [GraphQLUpload] })
		files: Promise<FileUpload>[],
		@Args('target') target: String,
	): Promise<string[]> {
		console.log('Mutation: imagesUploader');

		const uploadedImages: string[] = [];
		const promisedList = files.map(async (img: Promise<FileUpload>, index: number): Promise<Promise<void>> => {
			try {
				const { mimetype, createReadStream } = await img;

				const validMime = validMimeTypes.includes(mimetype);
				if (!validMime) throw new Error(Message.PROVIDE_ALLOWED_FORMAT);

				uploadedImages[index] = await this.saveImage(createReadStream(), String(target));
			} catch (err) {
				console.log('Error, file missing!');
			}
		});

		await Promise.all(promisedList);
		return uploadedImages;
	}

	/**
	 * Writes the upload to a temporary file, then keeps it only if its first bytes are a PNG or JPEG.
	 * The stored extension comes from that content, so a renamed HTML/SVG file is never served as such.
	 */
	private async saveImage(stream: NodeJS.ReadableStream, target: string): Promise<string> {
		const tempPath = this.buildUploadPath(target, `${getSerialForImage()}.upload`);
		try {
			await new Promise<void>((resolve, reject) => {
				const file = createWriteStream(tempPath);
				stream.on('error', reject); // e.g. over maxFileSize: without this the request could hang
				file.on('error', reject).on('finish', () => resolve());
				stream.pipe(file);
			});
		} catch {
			rmSync(tempPath, { force: true });
			throw new Error(Message.UPLOAD_FAILED);
		}

		const head = Buffer.alloc(IMAGE_SIGNATURE_LENGTH);
		const fd = openSync(tempPath, 'r');
		const bytesRead = readSync(fd, head, 0, head.length, 0);
		closeSync(fd);
		const extension = detectImageExtension(head.subarray(0, bytesRead));
		if (!extension) {
			rmSync(tempPath, { force: true });
			throw new Error(Message.PROVIDE_ALLOWED_FORMAT);
		}

		const url = tempPath.replace(/\.upload$/, extension);
		renameSync(tempPath, url);
		return url;
	}

	private buildUploadPath(target: String, imageName: string): string {
		const allowedTargets = new Set(['member', 'article', 'game']);
		const targetName = String(target);
		if (!allowedTargets.has(targetName)) throw new Error(Message.NOT_ALLOWED_REQUEST);
		const uploadRoot = path.resolve('uploads');
		const targetDirectory = path.resolve(uploadRoot, targetName);
		if (!targetDirectory.startsWith(`${uploadRoot}${path.sep}`)) throw new Error(Message.NOT_ALLOWED_REQUEST);
		mkdirSync(targetDirectory, { recursive: true });
		return path.join('uploads', targetName, imageName);
	}
}

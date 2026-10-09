import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { type ObjectId } from 'mongoose';
import { InquiryService } from './inquiry.service';
import { Inquiries, Inquiry } from '../../libs/dto/inquiry/inquiry';
import { AllInquiriesInquiry, InquiryInput, MyInquiriesInquiry } from '../../libs/dto/inquiry/inquiry.input';
import { InquiryAnswer, InquiryStatusUpdate } from '../../libs/dto/inquiry/inquiry.update';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { MemberType } from '../../libs/enums/member.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class InquiryResolver {
	constructor(private readonly inquiryService: InquiryService) {}

	@UseGuards(AuthGuard)
	@Mutation(() => Inquiry)
	public async createInquiry(@Args('input') input: InquiryInput, @AuthMember('_id') memberId: ObjectId): Promise<Inquiry> {
		console.log('Mutation: createInquiry');
		return await this.inquiryService.createInquiry(memberId, input);
	}

	@UseGuards(AuthGuard)
	@Query(() => Inquiries)
	public async getMyInquiries(
		@Args('input') input: MyInquiriesInquiry,
		@AuthMember('_id') memberId: ObjectId,
	): Promise<Inquiries> {
		console.log('Query: getMyInquiries');
		return await this.inquiryService.getMyInquiries(memberId, input);
	}

	/** ADMIN **/

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Query(() => Inquiries)
	public async getAllInquiriesByAdmin(@Args('input') input: AllInquiriesInquiry): Promise<Inquiries> {
		console.log('Query: getAllInquiriesByAdmin');
		return await this.inquiryService.getAllInquiriesByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Inquiry)
	public async answerInquiry(@Args('input') input: InquiryAnswer, @AuthMember('_id') adminId: ObjectId): Promise<Inquiry> {
		console.log('Mutation: answerInquiry');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.inquiryService.answerInquiry(adminId, input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Inquiry)
	public async updateInquiryByAdmin(@Args('input') input: InquiryStatusUpdate): Promise<Inquiry> {
		console.log('Mutation: updateInquiryByAdmin');
		input._id = shapeIntoMongoObjectId(input._id);
		return await this.inquiryService.updateInquiryByAdmin(input);
	}

	@Roles(MemberType.ADMIN)
	@UseGuards(RolesGuard)
	@Mutation(() => Inquiry)
	public async removeInquiry(@Args('inquiryId') input: string): Promise<Inquiry> {
		console.log('Mutation: removeInquiry');
		return await this.inquiryService.removeInquiry(shapeIntoMongoObjectId(input));
	}
}

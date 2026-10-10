import { Field, InputType, Int } from '@nestjs/graphql';
import { ArrayMaxSize, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';
import { NotificationType } from '../../enums/notification.enum';

@InputType()
class NotificationsSearch {
	/** Category filter on the frontend maps to a list of types **/
	@IsOptional()
	@ArrayMaxSize(8)
	@Field(() => [NotificationType], { nullable: true })
	typeList?: NotificationType[];

	@IsOptional()
	@Field(() => Boolean, { nullable: true })
	unreadOnly?: boolean;
}

/** The caller's own notifications, newest first **/
@InputType()
export class NotificationsInquiry {
	@IsNotEmpty()
	@Min(1)
	@Field(() => Int)
	page: number;

	@IsNotEmpty()
	@Min(1)
	@Max(50)
	@Field(() => Int)
	limit: number;

	@IsOptional()
	@Field(() => NotificationsSearch, { nullable: true })
	search?: NotificationsSearch;
}

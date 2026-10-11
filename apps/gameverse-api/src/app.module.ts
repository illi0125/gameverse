import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver } from '@nestjs/apollo';
import { AppResolver } from './app.resolver';
import { ComponentsModule } from './components/components.module';
import { DatabaseModule } from './database/database.module';
import { T } from './libs/types/common';
import { SocketModule } from './socket/socket.module';
import { queryLimitsRule } from './libs/security/query-limits';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
	imports: [
		ConfigModule.forRoot(),
		GraphQLModule.forRoot({
			driver: ApolloDriver,
			// Schema exploration only outside production
			playground: !isProduction,
			introspection: !isProduction,
			validationRules: [queryLimitsRule],
			uploads: false,
			autoSchemaFile: true,
			formatError: (error: any) => {
				const res = error?.extensions?.originalError || error?.extensions?.response;
				const rawMsg = res?.message || error?.message;

				const graphQLFormattedError = {
					message: Array.isArray(rawMsg) ? rawMsg.join('; ') : rawMsg,
					extensions: {
						code: error?.extensions?.code || 'BAD_REQUEST',
					},
				};

				console.log('GRAPHQL GLOBAL ERR:', graphQLFormattedError);
				return graphQLFormattedError;
			},
		}),
		ComponentsModule,
		DatabaseModule,
		SocketModule,
	],
	controllers: [AppController],
	providers: [AppService, AppResolver],
})
export class AppModule {}

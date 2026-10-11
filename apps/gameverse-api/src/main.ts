import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { LoggingInterceptor } from './libs/interceptor/Logging.interceptor';
import { graphqlUploadExpress } from 'graphql-upload';
import * as express from 'express';
import { WsAdapter } from '@nestjs/platform-ws';
import { uploadsGuard } from './libs/middleware/uploads.middleware';
import { resolveCorsOrigins, securityHeaders } from './libs/security/http-security';

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(new ValidationPipe());
	app.useGlobalInterceptors(new LoggingInterceptor());
	// After create: ConfigModule has loaded .env by now. Throws (no listen) in production without CORS_ORIGINS
	app.enableCors({ origin: resolveCorsOrigins(), credentials: true });
	app.getHttpAdapter().getInstance().disable('x-powered-by');
	// Behind a reverse proxy (e.g. TRUST_PROXY=1 for one hop) req.ip is the visitor, not the proxy: login limits rely on it
	if (process.env.TRUST_PROXY) {
		const hops = Number(process.env.TRUST_PROXY);
		app
			.getHttpAdapter()
			.getInstance()
			.set('trust proxy', Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
	}
	app.use(securityHeaders());

	app.use(graphqlUploadExpress({ maxFileSize: 15000000, maxFiles: 10 }));
	app.use('/uploads', uploadsGuard, express.static('./uploads'));

	app.useWebSocketAdapter(new WsAdapter(app));
	await app.listen(process.env.PORT_API ?? 3000);
}
bootstrap();

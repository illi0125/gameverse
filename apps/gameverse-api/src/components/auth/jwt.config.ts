import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

/** A short, human-chosen HS256 secret can be brute-forced offline from any issued token **/
export const MIN_SECRET_LENGTH = 32;
/** New tokens; tokens issued earlier keep the expiry they were signed with **/
export const DEFAULT_TOKEN_LIFETIME = '7d';

/**
 * Read after ConfigModule has loaded .env. Reading process.env while the module file is imported ran before .env was
 * loaded, which made the secret the literal string "undefined". Refuse to start without a real secret, and in
 * production without a long one (generate with: openssl rand -base64 48).
 */
export const jwtOptionsFactory = (config: ConfigService): JwtModuleOptions => {
	const secret = config.get<string>('SECRET_TOKEN')?.trim();
	if (!secret || secret === 'undefined')
		throw new Error('SECRET_TOKEN is not set; refusing to sign tokens without a secret');
	if (secret.length < MIN_SECRET_LENGTH) {
		const message = `SECRET_TOKEN is shorter than ${MIN_SECRET_LENGTH} characters`;
		if (config.get<string>('NODE_ENV') === 'production') throw new Error(`${message}; refusing to start in production`);
		new Logger('JwtConfig').warn(`${message}; use a random secret before deploying`);
	}
	const expiresIn = config.get<string>('JWT_EXPIRES_IN')?.trim() || DEFAULT_TOKEN_LIFETIME;
	return { secret, signOptions: { expiresIn } };
};

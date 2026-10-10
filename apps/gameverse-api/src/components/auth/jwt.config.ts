import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';

/**
 * Read after ConfigModule has loaded .env. Reading process.env while the module file is imported ran before .env was
 * loaded, which made the secret the literal string "undefined". Refuse to start without a real secret.
 */
export const jwtOptionsFactory = (config: ConfigService): JwtModuleOptions => {
	const secret = config.get<string>('SECRET_TOKEN')?.trim();
	if (!secret || secret === 'undefined')
		throw new Error('SECRET_TOKEN is not set; refusing to sign tokens without a secret');
	return { secret, signOptions: { expiresIn: '30d' } };
};

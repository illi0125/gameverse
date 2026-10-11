import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { jwtOptionsFactory } from './jwt.config';

const configWith = (value?: string) => new ConfigService(value === undefined ? {} : { SECRET_TOKEN: value });

describe('jwtOptionsFactory', () => {
	it('uses SECRET_TOKEN from the loaded configuration', () => {
		expect(jwtOptionsFactory(configWith('s3cret'))).toEqual({ secret: 's3cret', signOptions: { expiresIn: '7d' } });
	});

	it('refuses to start without a real secret', () => {
		for (const value of [undefined, '', '   ', 'undefined']) {
			expect(() => jwtOptionsFactory(configWith(value))).toThrow('SECRET_TOKEN is not set');
		}
	});

	it('rejects tokens signed with the old literal "undefined" secret', async () => {
		const jwt = new JwtService(jwtOptionsFactory(configWith('s3cret')));
		const forged = await new JwtService({ secret: 'undefined' }).signAsync({ _id: 'x' });

		await expect(jwt.verifyAsync(forged)).rejects.toThrow();
		await expect(jwt.verifyAsync(await jwt.signAsync({ _id: 'x' }))).resolves.toMatchObject({ _id: 'x' });
	});

	describe('secret strength and token lifetime', () => {
		const strong = 'x'.repeat(48);
		const env = process.env.NODE_ENV;
		afterEach(() => {
			process.env.NODE_ENV = env;
		});

		it('refuses a short secret in production', () => {
			process.env.NODE_ENV = 'production';
			expect(() => jwtOptionsFactory(configWith('short-human-pw1!'))).toThrow(/shorter than 32 characters/);
			expect(jwtOptionsFactory(configWith(strong)).secret).toBe(strong);
		});

		it('only warns about a short secret outside production', () => {
			process.env.NODE_ENV = 'development';
			expect(jwtOptionsFactory(configWith('s3cret')).secret).toBe('s3cret');
		});

		it('takes the lifetime from JWT_EXPIRES_IN, defaulting to 7 days', () => {
			const config = new ConfigService({ SECRET_TOKEN: strong, JWT_EXPIRES_IN: '2d' });
			expect(jwtOptionsFactory(config).signOptions).toEqual({ expiresIn: '2d' });
			expect(jwtOptionsFactory(configWith(strong)).signOptions).toEqual({ expiresIn: '7d' });
		});

		it('signs tokens that expire after 7 days', async () => {
			const jwt = new JwtService(jwtOptionsFactory(configWith(strong)));
			const { iat, exp } = jwt.decode<{ iat: number; exp: number }>(await jwt.signAsync({ _id: 'x' }));
			expect(exp - iat).toBe(7 * 24 * 60 * 60);
		});
	});
});

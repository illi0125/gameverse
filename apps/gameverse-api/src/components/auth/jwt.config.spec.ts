import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { jwtOptionsFactory } from './jwt.config';

const configWith = (value?: string) => new ConfigService(value === undefined ? {} : { SECRET_TOKEN: value });

describe('jwtOptionsFactory', () => {
	it('uses SECRET_TOKEN from the loaded configuration', () => {
		expect(jwtOptionsFactory(configWith('s3cret'))).toEqual({ secret: 's3cret', signOptions: { expiresIn: '30d' } });
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
});

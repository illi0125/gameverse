import { NextFunction, Request, Response } from 'express';

type CorsOrigin = string[] | RegExp;

/** Any http(s) origin on this machine (Next dev on 3000 or another port) **/
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * Websites allowed to call the API with credentials.
 * CORS_ORIGINS: comma-separated origins, e.g. "https://gameverse.example,https://www.gameverse.example".
 * Without it, development allows only local origins and production refuses to start.
 */
export const resolveCorsOrigins = (env: NodeJS.ProcessEnv = process.env): CorsOrigin => {
	const listed = (env.CORS_ORIGINS ?? '')
		.split(',')
		.map((origin) => origin.trim().replace(/\/+$/, ''))
		.filter(Boolean);
	if (listed.length) return listed;
	if (env.NODE_ENV === 'production') {
		throw new Error('CORS_ORIGINS must list the frontend origin(s) in production (comma-separated).');
	}
	return LOCAL_ORIGIN;
};

/** Basic hardening headers for API responses (JSON, uploads and the dev Playground) **/
export const securityHeaders =
	(env: NodeJS.ProcessEnv = process.env) =>
	(req: Request, res: Response, next: NextFunction) => {
		res.setHeader('X-Content-Type-Options', 'nosniff');
		res.setHeader('X-Frame-Options', 'DENY');
		res.setHeader('Referrer-Policy', 'no-referrer');
		if (env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=15552000');
		next();
	};

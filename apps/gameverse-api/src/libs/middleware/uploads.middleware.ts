import { NextFunction, Request, Response } from 'express';

/**
 * In front of express.static('./uploads'): only image files are served (content is checked on upload),
 * always with nosniff, so a stray non-image file can never be rendered as HTML/SVG from the API origin.
 */
export const uploadsGuard = (req: Request, res: Response, next: NextFunction) => {
	if (!/\.(png|jpe?g)$/i.test(req.path)) return res.status(404).end();
	res.setHeader('X-Content-Type-Options', 'nosniff');
	next();
};

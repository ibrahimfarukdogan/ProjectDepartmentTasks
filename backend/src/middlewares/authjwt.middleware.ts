import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types/auth.js';
import { NextFunction, Response, Request } from 'express';

declare global { namespace Express { interface Request { user?: JwtPayload; permissionLevel?: number;  } } }

export default function authenticateJWT(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        res.status(401).json({ error: 'No token provided' });
        return;
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        req.user = decoded;
        next();
    } catch (err) {
        res.status(403).json({ error: 'Invalid token' });
        return;
    }
}
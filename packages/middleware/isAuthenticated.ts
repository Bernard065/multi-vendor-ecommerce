import jwt from 'jsonwebtoken';
import { NextFunction, Response, Request } from 'express';
import { prisma } from '@multi-vendor-ecommerce/prisma';

// Extend Express Request interface to include user property
declare module 'express' {
  interface Request {
    user?: {
      id: string;
      email: string;
      name: string | null;
    };
  }
}

const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.accessToken || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized! Token missing.' });
    }

    if (!process.env.ACCESS_TOKEN_SECRET) {
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) as {
      userId: string;
      role: string;
    };

    if (!decoded) {
      return res.status(401).json({
        message: 'Unauthorized! Invalid token.',
      });
    }

    const account = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!account) {
      return res.status(401).json({
        message: 'Account not found',
      });
    }

    req.user = account;

    return next();
  } catch (error) {
    return next(error);
  }
};

export default isAuthenticated;

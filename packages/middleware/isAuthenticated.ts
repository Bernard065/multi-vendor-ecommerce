import jwt from 'jsonwebtoken';
import { NextFunction, Response, Request } from 'express';
import { prisma } from '@multi-vendor-ecommerce/prisma';

// Extend Express Request interface to include user and seller properties
declare module 'express' {
  interface Request {
    user?: Awaited<ReturnType<typeof prisma.user.findUnique>>;
    seller?: Awaited<ReturnType<typeof prisma.seller.findUnique>> & {
      shop?: Awaited<ReturnType<typeof prisma.shop.findMany>>;
    };
  }
}

const isAuthenticated = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token =
      req.cookies['accessToken'] ||
      req.cookies['seller-access-token'] ||
      req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Unauthorized! Token missing.' });
    }

    if (!process.env.ACCESS_TOKEN_SECRET) {
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET) as {
      userId: string;
      role: 'user' | 'seller';
    };

    if (!decoded) {
      return res.status(401).json({
        message: 'Unauthorized! Invalid token.',
      });
    }

    const userAccount = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    const sellerAccount = await prisma.seller.findUnique({
      where: { id: decoded.userId },
      include: { shop: true },
    });

    if (decoded.role === 'user') {
      if (!userAccount) {
        return res.status(401).json({
          message: 'Account not found',
        });
      }

      req.user = userAccount;
    } else if (decoded.role === 'seller') {
      if (!sellerAccount) {
        return res.status(401).json({
          message: 'Account not found',
        });
      }

      req.seller = sellerAccount;
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

export default isAuthenticated;

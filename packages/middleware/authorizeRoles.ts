import { NextFunction, Response, Request } from 'express';

export const isSeller = (req: Request, res: Response, next: NextFunction) => {
  if (!req.seller) {
    return res.status(403).json({ message: 'Forbidden! Seller role required.' });
  }
  return next();
};

export const isUser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(403).json({ message: 'Forbidden! User role required.' });
  }
  return next();
};

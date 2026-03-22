import { Request, Response, NextFunction } from 'express';
import { AppError } from './index';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorMiddleware = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      details: err.details,
    });
  }

  console.error('Non-operational error:', err);
  return res.status(500).json({
    message: 'Internal server error',
  });
};

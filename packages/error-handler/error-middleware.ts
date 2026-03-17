import { NextFunction, Request, Response } from 'express';
import { AppError } from './index';

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
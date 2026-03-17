export class AppError extends Error {
    public statusCode: number;
    public readonly isOperational: boolean;
    public readonly details?: unknown;

    constructor(message: string, statusCode: number, isOperational = true, details?: unknown) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.details = details;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Not found error
export class NotFoundError extends AppError {
    constructor(message = 'Resource not found', details?: unknown) {
        super(message, 404, true, details);
    }
}

// Validation error
export class ValidationError extends AppError {
    constructor(message = 'Validation failed', details?: unknown) {
        super(message, 400, true, details);
    }
}

// Authentication error
export class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed', details?: unknown) {
        super(message, 401, true, details);
    }
}

// Authorization error
export class AuthorizationError extends AppError {
    constructor(message = 'Authorization failed', details?: unknown) {
        super(message, 403, true, details);
    }
}

// Internal server error
export class InternalServerError extends AppError {
    constructor(message = 'Internal server error', details?: unknown) {
        super(message, 500, true, details);
    }
}

// Rate limit error
export class RateLimitError extends AppError {
    constructor(message = 'Too many requests', details?: unknown) {
        super(message, 429, true, details);
    }
}

export * from './error-middleware';
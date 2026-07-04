import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * Global error handling middleware.
 * Bắt tất cả lỗi từ controllers và services, trả về JSON chuẩn.
 */
export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = err instanceof AppError ? err.status : 500;
  const message = err.message || 'Internal Server Error';

  logger.error(`[${status}] ${message}`, err.stack);

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Middleware bắt route không tồn tại (404).
 */
export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError('Route không tồn tại', 404));
};

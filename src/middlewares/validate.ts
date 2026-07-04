import { Request, Response, NextFunction } from 'express';
import { ZodType, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * Middleware validate request body bằng Zod schema.
 * @param schema - Zod schema object
 * @param source - 'body' | 'query' | 'params' — nguồn cần validate
 */
export const validate = (schema: ZodType, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const data = schema.parse(req[source]);
      // Ghi đè giá trị đã parse (đã có default, transform nếu có)
      (req as unknown as Record<string, unknown>)[source] = data;
      next();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const messages = err.issues
          .map((e) =>
            `${e.path.map(String).join('.').trim()}: ${e.message}`)
          .join(', ');
        return next(new AppError(messages, 400));
      }
      next(err);
    }
  };
};

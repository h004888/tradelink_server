import { Request, Response, NextFunction } from 'express';
import { buildPublicUrl } from '../middlewares/upload';
import { AppError } from '../utils/AppError';

/**
 * POST /upload/image — Upload 1 ảnh đơn (multipart/form-data, field "image").
 * Trả về `{ url }` để client gắn vào listing.imageUrls hoặc user.avatarUrl.
 */
export const uploadOne = (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) throw new AppError('Không nhận được file ảnh. Đảm bảo field name = "image".', 400);
    const url = buildPublicUrl(req, file.filename);
    res.status(201).json({ success: true, data: { url, filename: file.filename, size: file.size } });
  } catch (err) { next(err); }
};

/**
 * POST /upload/images — Upload nhiều ảnh (multipart/form-data, field "images").
 * Trả về `{ urls: [...] }` để gắn vào listing.imageUrls.
 */
export const uploadMany = (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = ((req as any).files as Express.Multer.File[] | undefined) ?? [];
    if (files.length === 0) {
      throw new AppError('Không nhận được file ảnh. Đảm bảo field name = "images".', 400);
    }
    const urls = files.map((f) => buildPublicUrl(req, f.filename));
    res.status(201).json({ success: true, data: { urls, count: urls.length } });
  } catch (err) { next(err); }
};

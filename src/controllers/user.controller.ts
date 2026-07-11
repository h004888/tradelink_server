import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
import { buildPublicUrl } from '../middlewares/upload';
import { AppError } from '../utils/AppError';

export const getUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.findById(req.params.id as string);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.update(req.params.id as string, req.body);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

/**
 * PUT /users/:id/avatar — multipart/form-data với field `image`.
 * Nếu không có file, có thể dùng body `{ avatarUrl: string }` (legacy).
 */
export const updateAvatar = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    let avatarUrl: string | undefined;
    if (file) {
      avatarUrl = buildPublicUrl(req, file.filename);
    } else if (req.body?.avatarUrl) {
      avatarUrl = req.body.avatarUrl as string;
    } else {
      throw new AppError('Thiếu file ảnh (field "image") hoặc avatarUrl trong body', 400);
    }
    const user = await userService.updateAvatar(req.params.id as string, avatarUrl);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

export const getTopSellers = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const sellers = await userService.getTopSellers();
    res.json({ success: true, data: sellers });
  } catch (err) { next(err); }
};

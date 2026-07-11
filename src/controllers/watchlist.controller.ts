import { Response, NextFunction } from 'express';
import * as watchlistService from '../services/watchlist.service';
import { AuthRequest } from '../middlewares/auth';

export const getAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const items = await watchlistService.getAll(req.user!.id);
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
};

export const check = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await watchlistService.check(req.user!.id, req.params.listingId as string);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

export const add = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await watchlistService.add(req.user!.id, req.body.listingId);
    res.status(201).json({ success: true, message: 'Đã lưu tin đăng' });
  } catch (err) { next(err); }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await watchlistService.remove(req.user!.id, req.params.listingId as string);
    res.json({ success: true, message: 'Đã bỏ lưu tin đăng' });
  } catch (err) { next(err); }
};

import { Response, NextFunction } from 'express';
import * as reviewService from '../services/review.service';
import { AuthRequest } from '../middlewares/auth';

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const review = await reviewService.create({ ...req.body, reviewerId: req.user!.id });
    res.status(201).json({ success: true, data: review });
  } catch (err) { next(err); }
};

export const getByUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const reviews = await reviewService.findByUser(req.params.userId as string);
    res.json({ success: true, data: reviews });
  } catch (err) { next(err); }
};

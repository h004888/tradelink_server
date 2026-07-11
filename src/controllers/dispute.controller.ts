import { Response, NextFunction } from 'express';
import * as disputeService from '../services/dispute.service';
import { AuthRequest } from '../middlewares/auth';

export const create = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dispute = await disputeService.create({ ...req.body, raisedBy: req.user!.id });
    res.status(201).json({ success: true, data: dispute });
  } catch (err) { next(err); }
};

export const getByTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dispute = await disputeService.findByTransaction(req.params.transactionId as string);
    res.json({ success: true, data: dispute });
  } catch (err) { next(err); }
};

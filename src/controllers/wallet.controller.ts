import { Response, NextFunction } from 'express';
import * as walletService from '../services/wallet.service';
import { AuthRequest } from '../middlewares/auth';

export const getMyWallet = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const wallet = await walletService.getWallet(req.user!.id);
    res.json({ success: true, data: wallet });
  } catch (err) { next(err); }
};

export const getMyLedger = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const entries = await walletService.getLedger(req.user!.id, page, limit);
    res.json({ success: true, data: entries });
  } catch (err) { next(err); }
};

export const getMyWithdrawals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const withdrawals = await walletService.getMyWithdrawals(req.user!.id);
    res.json({ success: true, data: withdrawals });
  } catch (err) { next(err); }
};

export const requestWithdrawal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const withdrawal = await walletService.requestWithdrawal(req.user!.id, req.body);
    res.status(201).json({ success: true, data: withdrawal });
  } catch (err) { next(err); }
};

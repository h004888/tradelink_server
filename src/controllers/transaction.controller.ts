import { Response, NextFunction } from 'express';
import * as transactionService from '../services/transaction.service';
import { AuthRequest } from '../middlewares/auth';

export const getTransactions = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const txs = await transactionService.findByUser(req.user!.id, req.query.role as string);
    res.json({ success: true, data: txs });
  } catch (err) { next(err); }
};

export const getTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tx = await transactionService.findById(req.params.id as string);
    res.json({ success: true, data: tx });
  } catch (err) { next(err); }
};

export const createTransaction = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tx = await transactionService.create({ ...req.body, buyerId: req.user!.id, buyerName: (req.user as any).name || 'Unknown' });
    res.status(201).json({ success: true, data: tx });
  } catch (err) { next(err); }
};

export const advanceEscrow = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const tx = await transactionService.advanceEscrow(req.params.id as string, req.user!.id);
    res.json({ success: true, data: tx });
  } catch (err) { next(err); }
};

export const confirmTrade = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { party, sent, received } = req.body;
    const tx = await transactionService.confirmTrade(req.params.id as string, req.user!.id, party, sent, received);
    res.json({ success: true, data: tx });
  } catch (err) { next(err); }
};

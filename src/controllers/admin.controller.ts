import { Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';
import * as disputeService from '../services/dispute.service';
import { AuthRequest } from '../middlewares/auth';

export const getDashboard = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const data = await adminService.getDashboard();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const getUsers = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const users = await adminService.getAllUsers();
    res.json({ success: true, data: users });
  } catch (err) { next(err); }
};

export const getTransactions = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const txs = await adminService.getAllTransactions();
    res.json({ success: true, data: txs });
  } catch (err) { next(err); }
};

export const getWalletOverview = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const overview = await adminService.getWalletOverview();
    res.json({ success: true, data: overview });
  } catch (err) { next(err); }
};

export const getWithdrawals = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as 'pending' | 'paid' | 'rejected' | undefined;
    const withdrawals = await adminService.getWithdrawals(status);
    res.json({ success: true, data: withdrawals });
  } catch (err) { next(err); }
};

export const approveWithdrawal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const withdrawal = await adminService.approveWithdrawal(req.params.id as string, req.user!.id);
    res.json({ success: true, data: withdrawal });
  } catch (err) { next(err); }
};

export const rejectWithdrawal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const withdrawal = await adminService.rejectWithdrawal(req.params.id as string, req.user!.id, req.body?.note);
    res.json({ success: true, data: withdrawal });
  } catch (err) { next(err); }
};

export const resolveDispute = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dispute = await disputeService.resolve(req.params.id as string, req.body.resolution, req.body.decision);
    res.json({ success: true, data: dispute });
  } catch (err) { next(err); }
};

export const getFlaggedListings = async (_req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listings = await adminService.getFlaggedListings();
    res.json({ success: true, data: listings });
  } catch (err) { next(err); }
};

/**
 * PATCH /admin/listings/:id/moderate — body: { action: 'approve' | 'reject' }
 */
export const moderateListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const action = req.body?.action;
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ success: false, message: 'action phải là "approve" hoặc "reject"' });
    }
    const listing = await adminService.moderateListing(req.params.id as string, action);
    res.json({ success: true, data: listing });
  } catch (err) { next(err); }
};

/**
 * POST /admin/users — body: { email, name, password, role? }
 */
export const createUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await adminService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) { next(err); }
};

/**
 * DELETE /admin/users/:id — xóa user (cascade transactions/listings đã handled).
 */
export const deleteUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await adminService.deleteUser(req.params.id as string);
    res.json({ success: true, message: 'Xóa người dùng thành công' });
  } catch (err) { next(err); }
};

/**
 * PATCH /admin/users/:id/role — body: { role: 'user' | 'admin' }
 */
export const updateRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body ?? {};
    const user = await adminService.updateRole(req.params.id as string, role);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

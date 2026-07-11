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

export const resolveDispute = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const dispute = await disputeService.resolve(req.params.id as string, req.body.resolution);
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
 * PATCH /admin/users/:id/role — body: { role: 'buyer' | 'seller' | 'admin' }
 */
export const updateRole = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { role } = req.body ?? {};
    const user = await adminService.updateRole(req.params.id as string, role);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { AuthRequest } from '../middlewares/auth';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body;
    const data = await authService.register(email, password, name);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

export const loginLocal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const data = await authService.loginLocal(email, password);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    const data = await authService.refreshAccessToken(refreshToken);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

export const logout = async (_req: AuthRequest, res: Response) => {
  res.json({ success: true, message: 'Đăng xuất thành công' });
};

export const me = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json({ success: true, data: user });
  } catch (err) { next(err); }
};

/**
 * POST /auth/change-password — đổi mật khẩu (yêu cầu Bearer token).
 * Body: { oldPassword: string, newPassword: string }
 */
export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.id, oldPassword, newPassword);
    res.json({ success: true, message: 'Đổi mật khẩu thành công' });
  } catch (err) { next(err); }
};

/**
 * POST /auth/forgot-password — body: { email }
 * Trả về token reset (workaround vì K4 email service chưa có).
 * Khi tích hợp email thật, đổi để chỉ trả message chung chung.
 */
export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const r = await authService.createResetToken(email);
    res.json({ success: true, data: { token: r.token, expiresAt: r.expiresAt } });
  } catch (err) { next(err); }
};

/**
 * POST /auth/reset-password — body: { token, newPassword }
 */
export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    await authService.resetPasswordWithToken(token, newPassword);
    res.json({ success: true, message: 'Đặt lại mật khẩu thành công' });
  } catch (err) { next(err); }
};

/**
 * POST /auth/verify-email — body: { token }
 * Trả về thông báo nếu thành công.
 */
export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.body;
    await authService.verifyEmailWithToken(token);
    res.json({ success: true, message: 'Xác nhận email thành công' });
  } catch (err) { next(err); }
};

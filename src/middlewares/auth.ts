import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../utils/AppError';
import { User } from '../models/user.model';

// Mở rộng Request interface để chứa user info
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  tokenVersion: number;
}

/**
 * Middleware xác thực JWT token.
 * Lấy token từ header Authorization: Bearer <token>
 * Kiểm tra tokenVersion để phát hiện token đã bị thu hồi (đổi password, logout all).
 */
export const authenticate = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Vui lòng đăng nhập để truy cập', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Kiểm tra tokenVersion — nếu user đã đổi mật khẩu hoặc logout all, token cũ bị vô hiệu
    const user = await User.findById(decoded.id).select('tokenVersion');
    if (!user) {
      throw new AppError('Tài khoản không tồn tại', 401);
    }
    if (user.tokenVersion !== decoded.tokenVersion) {
      throw new AppError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 401);
    }

    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    next();
  } catch (err) {
    if (err instanceof AppError) return next(err);
    next(new AppError('Token không hợp lệ hoặc đã hết hạn', 401));
  }
};

/**
 * Middleware phân quyền theo role.
 * @param roles - Danh sách role được phép truy cập
 */
export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Vui lòng đăng nhập để truy cập', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('Bạn không có quyền thực hiện hành động này', 403));
    }

    next();
  };
};

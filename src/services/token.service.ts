import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../utils/AppError';

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  tokenVersion: number;
}

export interface RefreshPayload {
  id: string;
  type: 'refresh';
  tokenVersion: number;
}

/**
 * Generate access + refresh token pair.
 * Luôn tạo cặp mới mỗi lần gọi (refresh token rotation).
 */
export function generateTokens(user: {
  _id: string | { toString(): string };
  email: string;
  role: string;
  tokenVersion: number;
}): { token: string; refreshToken: string } {
  const id = typeof user._id === 'string' ? user._id : user._id.toString();
  const token = jwt.sign(
    {
      id: id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    } as TokenPayload,
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn } as jwt.SignOptions,
  );

  const refreshToken = jwt.sign(
    {
      id: id,
      type: 'refresh',
      tokenVersion: user.tokenVersion,
    } as RefreshPayload,
    config.jwt.secret,
    { expiresIn: config.jwt.refreshExpiresIn } as jwt.SignOptions,
  );

  return { token, refreshToken };
}

/**
 * Verify refresh token và trả về payload.
 * Kiểm tra type === 'refresh' để phân biệt với access token.
 */
export function verifyRefreshToken(token: string): RefreshPayload {
  let payload: any;
  try {
    payload = jwt.verify(token, config.jwt.secret);
  } catch {
    throw new AppError('Refresh token không hợp lệ hoặc đã hết hạn', 401);
  }

  if (payload.type !== 'refresh') {
    throw new AppError('Refresh token không hợp lệ', 401);
  }

  return payload as RefreshPayload;
}

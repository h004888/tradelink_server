import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { User, IUser } from '../models/user.model';
import { Listing } from '../models/listing.model';
import { Transaction } from '../models/transaction.model';
import { config } from '../config';
import { AppError } from '../utils/AppError';
import { generateTokens, verifyRefreshToken } from './token.service';
import { sendOTP } from './email.service';

// Generate OTP 6 digits
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const googleClient = new OAuth2Client(config.google.clientId || undefined);

export const register = async (
  email: string,
  password: string,
  fullName: string,
  phone: string,
  address?: string
): Promise<{ userId: string; email: string }> => {
  const existing = await User.findOne({ email });
  if (existing) throw new AppError('Email đã được đăng ký', 409);

  const passwordHash = await bcrypt.hash(password, config.bcrypt.rounds);
  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  let user: IUser;
  try {
    user = await User.create({
      email,
      fullName,
      phone,
      address,
      passwordHash,
      role: 'user',
      isVerified: false,
      otp,
      otpExpiry,
      otpAttempts: 0,
    });
  } catch (err: any) {
    if (err?.code === 11000) {
      throw new AppError('Email đã được đăng ký', 409);
    }
    throw err;
  }

  // Send OTP via email — fire and forget, không block response
  console.log(`[DEV] OTP for ${email}: ${otp}`);
  sendOTP(email, otp).catch((e) => {
    console.error('Failed to send OTP email:', e);
  });

  return { userId: user._id.toString(), email: user.email };
};

export const loginLocal = async (
  email: string,
  password: string
): Promise<{ token: string; refreshToken: string; user: IUser }> => {
  const user = await User.findOne({ email });
  if (!user) {
    console.warn('[AUTH_LOGIN_FAIL]', { email, reason: 'user_not_found', timestamp: new Date().toISOString() });
    throw new AppError('Email hoặc mật khẩu không đúng', 401);
  }
  if (!user.passwordHash) {
    console.warn('[AUTH_LOGIN_FAIL]', { email, reason: 'no_password', timestamp: new Date().toISOString() });
    throw new AppError('Tài khoản chưa có mật khẩu, vui lòng đăng ký', 401);
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    console.warn('[AUTH_LOGIN_FAIL]', { email, reason: 'wrong_password', timestamp: new Date().toISOString() });
    throw new AppError('Email hoặc mật khẩu không đúng', 401);
  }

  return {
    ...generateTokens(user),
    user,
  };
};

export const loginWithGoogle = async (
  idToken: string,
): Promise<{ token: string; refreshToken: string; user: IUser }> => {
  if (!config.google.clientId) {
    throw new AppError('GOOGLE_CLIENT_ID chưa được cấu hình', 500);
  }

  let ticket;
  try {
    ticket = await googleClient.verifyIdToken({
      idToken,
      audience: config.google.clientId,
    });
  } catch {
    throw new AppError('Google ID Token không hợp lệ', 401);
  }

  const payload = ticket.getPayload();
  if (!payload?.email) {
    throw new AppError('Không lấy được email từ tài khoản Google', 400);
  }

  const email = payload.email.toLowerCase().trim();
  let user = await User.findOne({ email });

  if (!user) {
    const fullName = payload.name?.trim() || email.split('@')[0];
    user = await User.create({
      email,
      fullName,
      avatarUrl: payload.picture,
      isVerified: payload.email_verified ?? true,
      role: 'user',
    });
  } else {
    const updatePayload: Record<string, unknown> = {};
    if (!user.fullName && payload.name?.trim()) {
      updatePayload.fullName = payload.name.trim();
    }
    if (!user.avatarUrl && payload.picture) {
      updatePayload.avatarUrl = payload.picture;
    }
    if (!user.isVerified && payload.email_verified) {
      updatePayload.isVerified = true;
    }

    if (Object.keys(updatePayload).length > 0) {
      user = await User.findByIdAndUpdate(
        user._id,
        { $set: updatePayload },
        { new: true },
      );
    }
  }

  if (!user) {
    throw new AppError('Không thể xử lý đăng nhập Google', 500);
  }

  return {
    ...generateTokens(user),
    user,
  };
};

export const refreshAccessToken = async (refreshToken: string): Promise<{ token: string; refreshToken: string; user: IUser }> => {
  const payload = verifyRefreshToken(refreshToken);
  const user = await User.findById(payload.id);
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);
  if (user.tokenVersion !== payload.tokenVersion) {
    throw new AppError('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', 401);
  }
  // Refresh token rotation: bump tokenVersion để token cũ bị vô hiệu
  const updatedUser = await User.findByIdAndUpdate(
    payload.id,
    { $inc: { tokenVersion: 1 } },
    { new: true },
  );
  if (!updatedUser) throw new AppError('Không tìm thấy người dùng', 404);
  const tokens = generateTokens({ _id: updatedUser._id, email: updatedUser.email, role: updatedUser.role, tokenVersion: updatedUser.tokenVersion } as any);
  return { ...tokens, user: updatedUser };
};

export const logout = async (userId: string): Promise<void> => {
  // Refresh token hiện là JWT stateless, không có store riêng để delete.
  // Việc tăng tokenVersion sẽ revoke ngay toàn bộ access token và refresh token cũ của user.
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { tokenVersion: 1 } },
    { new: true },
  ).select('_id');

  if (!user) {
    throw new AppError('Không tìm thấy người dùng', 404);
  }
};

export const getMe = async (userId: string): Promise<Record<string, unknown>> => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);

  // Đếm số liệu thực tế từ DB — không dùng field tĩnh trong User document
  const [totalListings, totalTransactions, completedTransactions] = await Promise.all([
    Listing.countDocuments({ sellerId: userId, status: { $ne: 'draft' } }),
    Transaction.countDocuments({ $or: [{ buyerId: userId }, { sellerId: userId }] }),
    Transaction.countDocuments({
      $or: [{ buyerId: userId }, { sellerId: userId }],
      escrowStep: 'released',
    }),
  ]);

  const successRate = totalTransactions > 0
    ? Math.round((completedTransactions / totalTransactions) * 100)
    : 100;

  const {
    avatarUrl,
    reputationScore,
    totalTransactions: persistedTotalTransactions,
    badges,
    ...rest
  } = user.toObject();

  return {
    ...rest,
    avatar: avatarUrl ?? null,
    fullName: user.fullName,
    uyTinScore: reputationScore ?? 0,
    successfulTransactions: persistedTotalTransactions ?? 0,
    badges: badges ?? [],
    totalListings,
    totalTransactions,
    successRate,
  };
};

/**
 * Đổi mật khẩu — yêu cầu cung cấp mật khẩu cũ, hash mật khẩu mới bằng bcrypt.
 */
export const changePassword = async (
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<void> => {
  if (newPassword.length < 6) {
    throw new AppError('Mật khẩu mới tối thiểu 6 ký tự', 400);
  }
  const user = await User.findById(userId);
  if (!user || !user.passwordHash) {
    throw new AppError('Không tìm thấy tài khoản hoặc chưa thiết lập mật khẩu', 404);
  }
  const ok = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!ok) throw new AppError('Mật khẩu cũ không đúng', 401);

  // #12: Check newPassword != oldPassword
  const same = await bcrypt.compare(newPassword, user.passwordHash);
  if (same) throw new AppError('Mật khẩu mới phải khác mật khẩu cũ', 400);

  const newHash = await bcrypt.hash(newPassword, config.bcrypt.rounds);
  // #14: Increment tokenVersion — tất cả token cũ bị vô hiệu
  await User.findByIdAndUpdate(userId, {
    $set: { passwordHash: newHash },
    $inc: { tokenVersion: 1 },
  });
};

/**
 * A2/J5 — tạo token reset password (1 giờ).
 * Workaround vì K4 (email service) chưa có: trả token trong response để dev/test dùng.
 * Khi tích hợp email service thực sự, đổi để chỉ trả message chung chung.
 */
export const createResetToken = async (
  email: string
): Promise<{ token: string; expiresAt: Date }> => {
  const user = await User.findOne({ email }).select('+resetPasswordToken +resetPasswordExpires');
  // Không tiết lộ email có tồn tại hay không — bảo mật
  if (!user) {
    // Vẫn trả về fake token để không lộ email
    const fakeExpires = new Date(Date.now() + 60 * 60 * 1000);
    return { token: 'no-such-email', expiresAt: fakeExpires };
  }
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  user.resetPasswordToken = token;
  user.resetPasswordExpires = expiresAt;
  await user.save();
  return { token, expiresAt };
};

/**
 * A2/J5 — verify token + cập nhật password mới.
 */
export const resetPasswordWithToken = async (
  token: string,
  newPassword: string
): Promise<void> => {
  if (newPassword.length < 6) {
    throw new AppError('Mật khẩu mới tối thiểu 6 ký tự', 400);
  }
  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires');
  if (!user) throw new AppError('Token không hợp lệ hoặc đã hết hạn', 400);
  const newHash = await bcrypt.hash(newPassword, config.bcrypt.rounds);
  user.passwordHash = newHash;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();
};

/**
 * A3 — verify email bằng token (nếu có). Nếu K4 (email service) chưa có,
 * vẫn auto-verify on register để tránh block UX — toggle qua env nếu cần.
 */
export const verifyEmailWithToken = async (token: string): Promise<void> => {
  const user = await User.findOne({
    verifyToken: token,
    verifyTokenExpires: { $gt: new Date() },
  }).select('+verifyToken +verifyTokenExpires');
  if (!user) throw new AppError('Token xác nhận không hợp lệ hoặc đã hết hạn', 400);
  user.isVerified = true;
  user.verifyToken = undefined;
  user.verifyTokenExpires = undefined;
  await user.save();
};

// ── OTP Verification ──

export const verifyOTP = async (
  email: string,
  otp: string
): Promise<{ token: string; refreshToken: string; user: IUser }> => {
  // Validate OTP format
  if (!/^\d{6}$/.test(otp)) {
    throw new AppError('Mã OTP phải là 6 chữ số', 400);
  }

  const user = await User.findOne({ email })
    .select('+otp +otpExpiry +otpAttempts +otpLockedUntil');

  if (!user) throw new AppError('Không tìm thấy tài khoản', 404);

  // Check if account is locked
  if (user.otpLockedUntil && user.otpLockedUntil > new Date()) {
    const remaining = Math.ceil((user.otpLockedUntil.getTime() - Date.now()) / 1000);
    throw new AppError(`Tài khoản bị khóa. Thử lại sau ${remaining} giây`, 429);
  }

  // Check OTP
  if (user.otp !== otp) {
    const attempts = (user.otpAttempts || 0) + 1;
    user.otpAttempts = attempts;

    // Lock after 5 failed attempts
    if (attempts >= 5) {
      user.otpLockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
      user.otpAttempts = 0;
      await user.save();
      throw new AppError('Quá nhiều lần thử sai. Tài khoản bị khóa 15 phút', 429);
    }

    await user.save();
    throw new AppError(`Mã OTP không đúng. Còn ${5 - attempts} lần thử`, 400);
  }

  // Check OTP expired
  if (!user.otpExpiry || user.otpExpiry < new Date()) {
    throw new AppError('Mã OTP đã hết hạn', 400);
  }

  // Verify success
  user.isVerified = true;
  user.otp = undefined;
  user.otpExpiry = undefined;
  user.otpAttempts = 0;
  user.otpLockedUntil = undefined;
  await user.save();

  // Generate token
  const tokens = generateTokens({
    _id: user._id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  } as any);

  return { ...tokens, user };
};

export const resendOTP = async (email: string): Promise<void> => {
  const user = await User.findOne({ email }).select('+otp +otpExpiry +otpAttempts');
  if (!user) throw new AppError('Không tìm thấy tài khoản', 404);

  // Rate limit: check if enough time passed since last OTP
  if (user.otpExpiry) {
    const lastOTPTime = user.otpExpiry.getTime() - 5 * 60 * 1000;
    const timePassed = Date.now() - lastOTPTime;
    if (timePassed < 45 * 1000) { // 45 seconds
      const waitTime = Math.ceil((45 * 1000 - timePassed) / 1000);
      throw new AppError(`Vui lòng chờ ${waitTime} giây trước khi gửi lại`, 429);
    }
  }

  const otp = generateOTP();
  const otpExpiry = new Date(Date.now() + 5 * 60 * 1000);

  user.otp = otp;
  user.otpExpiry = otpExpiry;
  user.otpAttempts = 0;
  await user.save();

  await sendOTP(email, otp);
};

import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/user.model';
import { Transaction } from '../models/transaction.model';
import { Listing } from '../models/listing.model';
import { Dispute } from '../models/dispute.model';
import { config } from '../config';
import { AppError } from '../utils/AppError';

export const getDashboard = async () => {
  const [pendingDisputes, resolvedToday, totalUsers, totalTransactions, recentDisputes, flaggedListings, pendingReviews] = await Promise.all([
    Dispute.countDocuments({ status: 'open' }),
    Dispute.countDocuments({ status: 'resolved', updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
    User.countDocuments(),
    Transaction.countDocuments(),
    Dispute.find({ status: 'open' }).sort({ priority: -1, createdAt: -1 }).limit(10)
      .populate('raisedBy', 'name phone')
      .populate('transactionId', 'type listingTitle'),
    Listing.find({ flags: { $gt: 0 } }).sort({ flags: -1 }).limit(10)
      .populate('sellerId', 'name phone'),
    Dispute.countDocuments({ status: 'open' }), // pending reviews = all open disputes for now
  ]);

  return {
    pendingDisputes,
    resolvedToday,
    totalUsers,
    totalTransactions,
    pendingReviews,
    flaggedListings, // trả về array để UI dùng thẳng
    recentDisputes,
  };
};

export const getAllUsers = async () => {
  return User.find().select('-password').sort({ createdAt: -1 });
};

export const getAllTransactions = async () => {
  return Transaction.find().sort({ createdAt: -1 })
    .populate('buyerId', 'name phone')
    .populate('sellerId', 'name phone');
};

export const getFlaggedListings = async () => {
  return Listing.find({ flags: { $gt: 0 } }).sort({ flags: -1 })
    .populate('sellerId', 'name phone');
};

/**
 * H6 — Admin tạo user (cho phép chỉ định role).
 */
export const createUser = async (data: { email: string; name: string; password: string; role?: 'buyer' | 'seller' | 'admin' }): Promise<IUser> => {
  if (!data.email || !data.name || !data.password) {
    throw new AppError('Thiếu email/name/password', 400);
  }
  if (data.password.length < 6) throw new AppError('Mật khẩu tối thiểu 6 ký tự', 400);
  const exists = await User.findOne({ email: data.email });
  if (exists) throw new AppError('Email đã tồn tại', 409);
  const passwordHash = await bcrypt.hash(data.password, config.bcrypt.rounds);
  const user = await User.create({
    email: data.email,
    name: data.name,
    passwordHash,
    role: data.role || 'buyer',
    isVerified: true,
  });
  return user;
};

/**
 * H6 — Admin xóa user.
 */
export const deleteUser = async (id: string): Promise<void> => {
  const user = await User.findByIdAndDelete(id);
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);
};

/**
 * H7 — Admin đổi vai trò người dùng.
 */
export const updateRole = async (id: string, role: string): Promise<IUser> => {
  if (!['buyer', 'seller', 'admin'].includes(role)) {
    throw new AppError('Vai trò không hợp lệ', 400);
  }
  const user = await User.findByIdAndUpdate(id, { $set: { role } }, { new: true }).select('-passwordHash');
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);
  return user;
};

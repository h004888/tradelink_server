import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/user.model';
import { Transaction } from '../models/transaction.model';
import { Listing, IListing } from '../models/listing.model';
import { Dispute } from '../models/dispute.model';
import { config } from '../config';
import { AppError } from '../utils/AppError';
import * as notificationService from './notification.service';

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

/**
 * Giao dịch bán hàng đã 'released' (buyer xác nhận hoàn tất) nhưng admin chưa chuyển
 * khoản thủ công cho seller — dùng cho màn "Cần thanh toán" trong admin app.
 */
export const getPendingPayouts = async () => {
  return Transaction.find({ type: 'sale', escrowStep: 'released', payoutStatus: 'pending' })
    .sort({ updatedAt: 1 })
    .populate('sellerId', 'name phone bankName bankAccountNumber bankAccountHolder')
    .populate('buyerId', 'name phone');
};

/**
 * Admin xác nhận đã tự chuyển khoản tiền hàng cho seller (thao tác thủ công, không tự
 * động chuyển tiền thật). Atomic filter theo payoutStatus:'pending' để tránh double-payout
 * nếu admin bấm 2 lần / 2 tab.
 */
export const markPayoutPaid = async (id: string) => {
  const tx = await Transaction.findOneAndUpdate(
    { _id: id, payoutStatus: 'pending' },
    { $set: { payoutStatus: 'paid', payoutAt: new Date() } },
    { new: true }
  );
  if (!tx) throw new AppError('Không tìm thấy giao dịch cần thanh toán hoặc đã được xử lý trước đó', 404);
  return tx;
};

export const getFlaggedListings = async () => {
  return Listing.find({ flags: { $gt: 0 } }).sort({ flags: -1 })
    .populate('sellerId', 'name phone');
};

/**
 * Admin duyệt tin bị báo cáo: 'approve' = tin hợp lệ, xoá cờ báo cáo và giữ hoạt động;
 * 'reject' = vi phạm thật, ẩn tin khỏi marketplace.
 */
export const moderateListing = async (id: string, action: 'approve' | 'reject'): Promise<IListing> => {
  const listing = await Listing.findById(id);
  if (!listing) throw new AppError('Không tìm thấy tin đăng', 404);

  listing.flags = 0;
  if (action === 'reject') {
    listing.status = 'hidden';
  }
  await listing.save();

  await notificationService.create({
    userId: listing.sellerId.toString(),
    type: 'system',
    title: action === 'approve' ? 'Tin đăng đã được duyệt' : 'Tin đăng đã bị gỡ',
    body: action === 'approve'
      ? `Tin "${listing.title}" đã được admin xem xét và giữ nguyên hoạt động.`
      : `Tin "${listing.title}" đã bị gỡ do vi phạm quy định.`,
    relatedId: listing._id.toString(),
  }).catch((err) => console.error('Moderation notification failed:', err));

  return listing;
};

/**
 * H6 — Admin tạo user (cho phép chỉ định role).
 */
export const createUser = async (data: { email: string; name: string; password: string; role?: 'user' | 'admin' }): Promise<IUser> => {
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
    role: data.role || 'user',
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
  if (!['user', 'admin'].includes(role)) {
    throw new AppError('Vai trò không hợp lệ', 400);
  }
  const user = await User.findByIdAndUpdate(id, { $set: { role } }, { new: true }).select('-passwordHash');
  if (!user) throw new AppError('Không tìm thấy người dùng', 404);
  return user;
};

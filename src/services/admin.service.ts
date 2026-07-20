import bcrypt from 'bcryptjs';
import { User, IUser } from '../models/user.model';
import { Transaction } from '../models/transaction.model';
import { Listing, IListing } from '../models/listing.model';
import { Dispute } from '../models/dispute.model';
import { Wallet } from '../models/wallet.model';
import { WalletLedgerEntry } from '../models/walletLedger.model';
import { WithdrawalRequest, WithdrawalStatus } from '../models/withdrawalRequest.model';
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
      .populate('raisedBy', 'fullName phone')
      .populate('transactionId', 'type listingTitle'),
    Listing.find({ flags: { $gt: 0 } }).sort({ flags: -1 }).limit(10)
      .populate('sellerId', 'fullName phone'),
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
    .populate('buyerId', 'fullName phone')
    .populate('sellerId', 'fullName phone');
};

/**
 * Tổng quan ví trên toàn hệ thống — dùng cho màn "Ví" trong admin app: tổng số dư
 * (tiền admin đang giữ hộ seller), tổng đang chờ rút, tổng đã rút thành công.
 */
export const getWalletOverview = async () => {
  const [balanceAgg, pendingAgg, paidAgg] = await Promise.all([
    Wallet.aggregate([{ $group: { _id: null, total: { $sum: '$balance' } } }]),
    WithdrawalRequest.aggregate([{ $match: { status: 'pending' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    WithdrawalRequest.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ]);
  return {
    totalBalance: balanceAgg[0]?.total || 0,
    totalPending: pendingAgg[0]?.total || 0,
    totalPaidOut: paidAgg[0]?.total || 0,
  };
};

/**
 * Danh sách yêu cầu rút tiền — dùng cho màn "Yêu cầu rút tiền" trong admin app.
 * Không phân trang (khối lượng nhỏ), sắp xếp cũ nhất trước cho hàng đợi 'pending'.
 */
export const getWithdrawals = async (status?: WithdrawalStatus) => {
  const query = status ? { status } : {};
  return WithdrawalRequest.find(query)
    .sort({ createdAt: status === 'pending' ? 1 : -1 })
    .populate('userId', 'fullName phone bankName bankAccountNumber bankAccountHolder');
};

/**
 * Admin xác nhận đã tự chuyển khoản cho seller (thao tác thủ công, không tự động
 * chuyển tiền thật). Atomic filter theo status:'pending' để tránh double-processing.
 */
export const approveWithdrawal = async (id: string, adminUserId: string) => {
  const withdrawal = await WithdrawalRequest.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { $set: { status: 'paid', processedAt: new Date(), processedBy: adminUserId } },
    { new: true }
  );
  if (!withdrawal) throw new AppError('Không tìm thấy yêu cầu rút tiền hoặc đã được xử lý trước đó', 404);

  await Wallet.findOneAndUpdate({ userId: withdrawal.userId }, { $inc: { totalWithdrawn: withdrawal.amount } });

  await notificationService.create({
    userId: withdrawal.userId.toString(),
    type: 'wallet',
    title: 'Yêu cầu rút tiền đã được xử lý',
    body: `Yêu cầu rút ${withdrawal.amount.toLocaleString('vi-VN')}đ đã được admin chuyển khoản.`,
    relatedId: withdrawal._id.toString(),
  }).catch((err) => console.error('Withdrawal notification failed:', err));

  return withdrawal;
};

/**
 * Admin từ chối yêu cầu rút tiền — hoàn lại số dư vào ví seller.
 */
export const rejectWithdrawal = async (id: string, adminUserId: string, note?: string) => {
  const withdrawal = await WithdrawalRequest.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { $set: { status: 'rejected', processedAt: new Date(), processedBy: adminUserId, note } },
    { new: true }
  );
  if (!withdrawal) throw new AppError('Không tìm thấy yêu cầu rút tiền hoặc đã được xử lý trước đó', 404);

  const wallet = await Wallet.findOneAndUpdate(
    { userId: withdrawal.userId },
    { $inc: { balance: withdrawal.amount } },
    { new: true }
  );

  await WalletLedgerEntry.create({
    userId: withdrawal.userId,
    type: 'credit',
    reason: 'withdrawal_refund',
    amount: withdrawal.amount,
    balanceAfter: wallet?.balance || 0,
    relatedWithdrawalId: withdrawal._id,
  });

  await notificationService.create({
    userId: withdrawal.userId.toString(),
    type: 'wallet',
    title: 'Yêu cầu rút tiền bị từ chối',
    body: note
      ? `Yêu cầu rút ${withdrawal.amount.toLocaleString('vi-VN')}đ đã bị từ chối: ${note}. Số dư đã được hoàn lại vào ví.`
      : `Yêu cầu rút ${withdrawal.amount.toLocaleString('vi-VN')}đ đã bị từ chối. Số dư đã được hoàn lại vào ví.`,
    relatedId: withdrawal._id.toString(),
  }).catch((err) => console.error('Withdrawal notification failed:', err));

  return withdrawal;
};

export const getFlaggedListings = async () => {
  return Listing.find({ flags: { $gt: 0 } }).sort({ flags: -1 })
    .populate('sellerId', 'fullName phone');
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
export const createUser = async (data: { email: string; fullName: string; password: string; role?: 'user' | 'admin' }): Promise<IUser> => {
  if (!data.email || !data.fullName || !data.password) {
    throw new AppError('Thiếu email/fullName/password', 400);
  }
  if (data.password.length < 6) throw new AppError('Mật khẩu tối thiểu 6 ký tự', 400);
  const exists = await User.findOne({ email: data.email });
  if (exists) throw new AppError('Email đã tồn tại', 409);
  const passwordHash = await bcrypt.hash(data.password, config.bcrypt.rounds);
  const user = await User.create({
    email: data.email,
    fullName: data.fullName,
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

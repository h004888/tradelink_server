import { Wallet, IWallet } from '../models/wallet.model';
import { WalletLedgerEntry } from '../models/walletLedger.model';
import { WithdrawalRequest } from '../models/withdrawalRequest.model';
import { ITransaction } from '../models/transaction.model';
import { User } from '../models/user.model';
import { AppError } from '../utils/AppError';
import * as notificationService from './notification.service';

export const getOrCreateWallet = async (userId: string): Promise<IWallet> => {
  return Wallet.findOneAndUpdate(
    { userId },
    { $setOnInsert: { userId, balance: 0, totalEarned: 0, totalWithdrawn: 0 } },
    { upsert: true, new: true }
  );
};

export const getWallet = async (userId: string): Promise<IWallet> => {
  return getOrCreateWallet(userId);
};

export const getLedger = async (userId: string, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;
  return WalletLedgerEntry.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
};

/**
 * Cộng tiền vào ví seller khi 1 giao dịch sale chuyển sang 'released'. Idempotent qua
 * cờ tx.walletCredited — advanceEscrow() gọi hàm này rồi lưu tx, không cộng ví 2 lần
 * nếu code chạy lại trên cùng transaction.
 */
export const creditForSale = async (tx: ITransaction): Promise<void> => {
  if (tx.walletCredited) return;
  const amount = tx.amount || 0;
  if (amount <= 0) return;

  const wallet = await Wallet.findOneAndUpdate(
    { userId: tx.sellerId },
    { $inc: { balance: amount, totalEarned: amount }, $setOnInsert: { userId: tx.sellerId } },
    { upsert: true, new: true }
  );

  await WalletLedgerEntry.create({
    userId: tx.sellerId,
    type: 'credit',
    reason: 'sale',
    amount,
    balanceAfter: wallet.balance,
    relatedTransactionId: tx._id,
  });

  await notificationService.create({
    userId: tx.sellerId.toString(),
    type: 'wallet',
    title: 'Bạn vừa nhận tiền vào ví',
    body: `Giao dịch "${tx.listingTitle}" đã hoàn tất — số dư ví của bạn đã được cộng thêm.`,
    relatedId: tx._id.toString(),
  }).catch((err) => console.error('Wallet credit notification failed:', err));
};

export const requestWithdrawal = async (
  userId: string,
  data: { amount: number; bankName?: string; bankAccountNumber?: string; bankAccountHolder?: string }
) => {
  if (!data.amount || data.amount <= 0) throw new AppError('Số tiền rút không hợp lệ', 400);

  let bankName = data.bankName;
  let bankAccountNumber = data.bankAccountNumber;
  let bankAccountHolder = data.bankAccountHolder;

  if (!bankName || !bankAccountNumber || !bankAccountHolder) {
    const user = await User.findById(userId);
    bankName = bankName || user?.bankName;
    bankAccountNumber = bankAccountNumber || user?.bankAccountNumber;
    bankAccountHolder = bankAccountHolder || user?.bankAccountHolder;
  }
  if (!bankName || !bankAccountNumber || !bankAccountHolder) {
    throw new AppError('Vui lòng cập nhật thông tin ngân hàng trước khi rút tiền', 400);
  }

  const wallet = await Wallet.findOneAndUpdate(
    { userId, balance: { $gte: data.amount } },
    { $inc: { balance: -data.amount } },
    { new: true }
  );
  if (!wallet) throw new AppError('Số dư không đủ', 400);

  const withdrawal = await WithdrawalRequest.create({
    userId,
    amount: data.amount,
    bankName,
    bankAccountNumber,
    bankAccountHolder,
    status: 'pending',
  });

  await WalletLedgerEntry.create({
    userId,
    type: 'debit',
    reason: 'withdrawal',
    amount: data.amount,
    balanceAfter: wallet.balance,
    relatedWithdrawalId: withdrawal._id,
  });

  return withdrawal;
};

export const getMyWithdrawals = async (userId: string) => {
  return WithdrawalRequest.find({ userId }).sort({ createdAt: -1 });
};

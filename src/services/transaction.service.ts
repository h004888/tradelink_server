import { Transaction, ITransaction, EscrowStep } from '../models/transaction.model';
import { Listing } from '../models/listing.model';
import { AppError } from '../utils/AppError';
import * as notificationService from './notification.service';

const ESCROW_FLOW: EscrowStep[] = ['paymentPending', 'paymentConfirmed', 'shipping', 'delivered', 'reviewPeriod', 'released'];

export const findByUser = async (userId: string, role?: string) => {
  const query: any = {};
  if (role === 'buyer') query.buyerId = userId;
  else if (role === 'seller') query.sellerId = userId;
  else query.$or = [{ buyerId: userId }, { sellerId: userId }];
  return Transaction.find(query).sort({ createdAt: -1 });
};

export const findById = async (id: string): Promise<ITransaction> => {
  const tx = await Transaction.findById(id);
  if (!tx) throw new AppError('Không tìm thấy giao dịch', 404);
  return tx;
};

export const create = async (data: { listingId: string; buyerId: string; buyerName: string; amount?: number }): Promise<ITransaction> => {
  const listing = await Listing.findById(data.listingId);
  if (!listing) throw new AppError('Không tìm thấy tin đăng', 404);
  if (listing.status !== 'active') throw new AppError('Tin đăng không khả dụng', 400);

  const type = listing.type === 'trade' ? 'trade' : 'sale';
  const tx = await Transaction.create({
    type,
    listingId: listing._id,
    listingTitle: listing.title,
    buyerId: data.buyerId,
    buyerName: data.buyerName,
    sellerId: listing.sellerId,
    sellerName: listing.sellerName,
    amount: data.amount || listing.price,
    escrowStep: type === 'sale' ? 'paymentPending' : undefined,
  });

  // Cập nhật trạng thái listing
  listing.status = type === 'sale' ? 'sold' : 'hidden';
  await listing.save();

  // F1: Auto notification cho seller
  await notificationService.create({
    userId: listing.sellerId.toString(),
    type: 'transaction',
    title: 'Đơn hàng mới',
    body: `Bạn có đơn hàng mới cho "${listing.title}"`,
    relatedId: tx._id.toString(),
  }).catch((err) => {
    // Notification failure không nên block transaction
    console.error('Notification failed:', err);
  });

  return tx;
};

export const advanceEscrow = async (id: string, userId: string): Promise<ITransaction> => {
  const tx = await Transaction.findById(id);
  if (!tx || tx.type !== 'sale') throw new AppError('Giao dịch không hợp lệ', 400);
  if (!tx.escrowStep) throw new AppError('Trạng thái escrow không hợp lệ', 400);

  // Authorization check: chỉ buyer hoặc seller của tx mới được advance
  const userIdStr = userId.toString();
  const isBuyer = tx.buyerId.toString() === userIdStr;
  const isSeller = tx.sellerId.toString() === userIdStr;
  if (!isBuyer && !isSeller) {
    throw new AppError('Bạn không có quyền thao tác giao dịch này', 403);
  }

  const currentIdx = ESCROW_FLOW.indexOf(tx.escrowStep);
  if (currentIdx === -1 || currentIdx === ESCROW_FLOW.length - 1) {
    throw new AppError('Giao dịch đã hoàn tất', 400);
  }

  const nextStep = ESCROW_FLOW[currentIdx + 1];
  tx.escrowStep = nextStep;
  await tx.save();
  return tx;
};

export const confirmTrade = async (id: string, userId: string, party: 'A' | 'B', sent: boolean, received: boolean): Promise<ITransaction> => {
  const tx = await Transaction.findById(id);
  if (!tx || tx.type !== 'trade') throw new AppError('Giao dịch không hợp lệ', 400);

  // Authorization check: userId phải là buyer (party A) hoặc seller (party B)
  const userIdStr = userId.toString();
  const isBuyer = tx.buyerId.toString() === userIdStr;
  const isSeller = tx.sellerId.toString() === userIdStr;
  if (!isBuyer && !isSeller) {
    throw new AppError('Bạn không có quyền thao tác giao dịch này', 403);
  }

  // party phải đúng vai trò — buyer gửi là party A, seller gửi là party B
  if ((party === 'A' && !isBuyer) || (party === 'B' && !isSeller)) {
    throw new AppError('Vai trò không khớp với bên giao dịch', 403);
  }

  if (party === 'A') {
    tx.partyASent = sent;
    tx.partyAReceived = received;
  } else {
    tx.partyBSent = sent;
    tx.partyBReceived = received;
  }

  await tx.save();
  return tx;
};

export const findAll = async () => {
  return Transaction.find().sort({ createdAt: -1 }).populate('buyerId', 'name phone').populate('sellerId', 'name phone');
};

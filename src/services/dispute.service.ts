import { Dispute } from '../models/dispute.model';
import { Transaction } from '../models/transaction.model';
import { User } from '../models/user.model';
import { AppError } from '../utils/AppError';
import * as notificationService from './notification.service';
import * as walletService from './wallet.service';

export const create = async (data: { transactionId: string; raisedBy: string; reason: string; description: string; priority?: boolean }) => {
  const exists = await Dispute.findOne({ transactionId: data.transactionId });
  if (exists) throw new AppError('Giao dịch này đã có khiếu nại', 409);

  const dispute = await Dispute.create(data);

  // F1: Notify bên đối diện + tất cả admin
  const tx = await Transaction.findById(data.transactionId);
  if (tx) {
    const otherPartyId = tx.buyerId.toString() === data.raisedBy
      ? tx.sellerId.toString()
      : tx.buyerId.toString();

    await notificationService.create({
      userId: otherPartyId,
      type: 'dispute',
      title: 'Khiếu nại mới',
      body: `Có khiếu nại mới về giao dịch "${tx.listingTitle}"`,
      relatedId: dispute._id.toString(),
    }).catch((err) => console.error('Dispute notification failed:', err));

    // Notify admins
    const admins = await User.find({ role: 'admin' }).select('_id');
    for (const admin of admins) {
      await notificationService.create({
        userId: admin._id.toString(),
        type: 'dispute',
        title: `[Admin] Khiếu nại mới (${data.priority ? 'URGENT' : 'normal'})`,
        body: `Transaction: ${tx.listingTitle}, lý do: ${data.reason}`,
        relatedId: dispute._id.toString(),
      }).catch((err) => console.error('Admin notification failed:', err));
    }
  }

  return dispute;
};

export const findByTransaction = async (transactionId: string) => {
  const dispute = await Dispute.findOne({ transactionId })
    .populate('raisedBy', 'fullName phone')
    .populate('transactionId');
  if (!dispute) throw new AppError('Không tìm thấy khiếu nại', 404);
  return dispute;
};

export const resolve = async (id: string, resolution: string, decision?: 'refund' | 'release' | 'reject') => {
  // Chỉ resolve được khiếu nại đang 'open' — atomic, tránh xử lý trùng (vd 2 admin cùng bấm)
  // gây hoàn tiền/giải ngân lặp lại trên cùng 1 giao dịch.
  const dispute = await Dispute.findOneAndUpdate(
    { _id: id, status: 'open' },
    { $set: { status: 'resolved', resolution, decision } },
    { new: true }
  );
  if (!dispute) {
    const exists = await Dispute.exists({ _id: id });
    if (!exists) throw new AppError('Không tìm thấy khiếu nại', 404);
    throw new AppError('Khiếu nại này đã được xử lý', 409);
  }

  const tx = await Transaction.findById(dispute.transactionId);
  if (tx) {
    // Quyết định của admin tác động trực tiếp lên trạng thái giao dịch —
    // hoàn tiền/giải ngân đóng luôn escrow, từ chối thì giữ nguyên trạng thái hiện tại.
    if (decision === 'refund') {
      tx.escrowStep = 'refunded';
      await tx.save();
    } else if (decision === 'release') {
      tx.escrowStep = 'released';
      // Đồng bộ với advanceEscrow() thường (transaction.service.ts) — giải ngân qua
      // khiếu nại cũng phải cộng tiền vào ví seller, không chỉ đổi trạng thái.
      await walletService.creditForSale(tx);
      tx.walletCredited = true;
      await tx.save();
    }

    const notifyBody = decision === 'refund'
      ? `Khiếu nại về "${tx.listingTitle}" đã được xử lý: hoàn tiền cho người mua.`
      : decision === 'release'
        ? `Khiếu nại về "${tx.listingTitle}" đã được xử lý: giải ngân cho người bán.`
        : `Khiếu nại về "${tx.listingTitle}" đã được xử lý: ${resolution}`;

    for (const userId of [tx.buyerId.toString(), tx.sellerId.toString()]) {
      await notificationService.create({
        userId,
        type: 'dispute',
        title: 'Khiếu nại đã được giải quyết',
        body: notifyBody,
        relatedId: dispute._id.toString(),
      }).catch((err) => console.error('Dispute resolve notification failed:', err));
    }
  }

  return dispute;
};

export const getStats = async () => {
  const [pendingDisputes, resolvedToday] = await Promise.all([
    Dispute.countDocuments({ status: 'open' }),
    Dispute.countDocuments({ status: 'resolved', updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
  ]);
  return { pendingDisputes, resolvedToday };
};

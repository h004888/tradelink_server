import { Dispute } from '../models/dispute.model';
import { Transaction } from '../models/transaction.model';
import { User } from '../models/user.model';
import { AppError } from '../utils/AppError';
import * as notificationService from './notification.service';

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
    .populate('raisedBy', 'name phone')
    .populate('transactionId');
  if (!dispute) throw new AppError('Không tìm thấy khiếu nại', 404);
  return dispute;
};

export const resolve = async (id: string, resolution: string) => {
  const dispute = await Dispute.findByIdAndUpdate(id, { $set: { status: 'resolved', resolution } }, { new: true });
  if (!dispute) throw new AppError('Không tìm thấy khiếu nại', 404);
  return dispute;
};

export const getStats = async () => {
  const [pendingDisputes, resolvedToday] = await Promise.all([
    Dispute.countDocuments({ status: 'open' }),
    Dispute.countDocuments({ status: 'resolved', updatedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }),
  ]);
  return { pendingDisputes, resolvedToday };
};

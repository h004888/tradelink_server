import { Notification } from '../models/notification.model';
import { AppError } from '../utils/AppError';

export const getAll = async (userId: string) => {
  return Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
};

export const markRead = async (userId: string, id: string) => {
  const notif = await Notification.findOneAndUpdate({ _id: id, userId }, { $set: { isRead: true } }, { new: true });
  if (!notif) throw new AppError('Không tìm thấy thông báo', 404);
  return notif;
};

export const markAllRead = async (userId: string) => {
  await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
};

export const create = async (data: { userId: string; type: 'transaction' | 'chat' | 'dispute' | 'system'; title: string; body: string; relatedId?: string }) => {
  return Notification.create(data);
};

import { Notification, NotificationType } from '../models/notification.model';
import { chatGateway } from '../realtime/chat.gateway';
import { AppError } from '../utils/AppError';

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  deeplink?: string;
  relatedId?: string;
};

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

export const create = async (data: CreateNotificationInput) => {
  if ((data.action || data.deeplink) && (!data.entityType || !data.entityId)) {
    throw new AppError('entityType and entityId are required', 400);
  }

  const notification = await Notification.create({
    ...data,
    relatedId: data.relatedId ?? data.entityId,
  });

  try {
    chatGateway.broadcastNotification(data.userId, notification);
  } catch (err) {
    console.error('Realtime notification broadcast failed:', err);
  }

  return notification;
};

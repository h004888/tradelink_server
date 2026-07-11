import { Request, Response, NextFunction } from 'express';
import * as notificationService from '../services/notification.service';
import { Notification } from '../models/notification.model';
import { AuthRequest } from '../middlewares/auth';

export const getAll = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const items = await notificationService.getAll(req.user!.id);
    res.json({ success: true, data: items });
  } catch (err) { next(err); }
};

export const markRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notif = await notificationService.markRead(req.user!.id, req.params.id as string);
    res.json({ success: true, data: notif });
  } catch (err) { next(err); }
};

export const markAllRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    await notificationService.markAllRead(req.user!.id);
    res.json({ success: true, message: 'Đã đánh dấu tất cả đã đọc' });
  } catch (err) { next(err); }
};

export const getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.json({ success: true, data: { count: 0 } });
      return;
    }
    const count = await Notification.countDocuments({ userId: req.user.id, isRead: false });
    res.json({ success: true, data: { count } });
  } catch (err) { next(err); }
};

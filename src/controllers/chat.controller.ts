import { Response, NextFunction } from 'express';
import * as chatService from '../services/chat.service';
import { Conversation } from '../models/conversation.model';
import { User } from '../models/user.model';
import { AppError } from '../utils/AppError';
import { AuthRequest } from '../middlewares/auth';

export const getConversations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const convs = await chatService.getConversations(req.user!.id);
    res.json({ success: true, data: convs });
  } catch (err) { next(err); }
};

// E4 — khởi tạo/lấy conversation giữa current user và otherUserId
export const initConversation = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { otherUserId, listingId } = req.body;
    if (!otherUserId) {
      return res.status(400).json({ success: false, message: 'Thiếu otherUserId' });
    }
    const conv = await chatService.getOrCreateConversation(req.user!.id, otherUserId, listingId);
    res.json({ success: true, data: conv });
  } catch (err) { next(err); }
};

export const getMessages = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const conversationId = String(req.params.id);

    // Authorization: user phải là participant của conversation
    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      throw new AppError('Không tìm thấy hội thoại', 404);
    }
    const userId = String(req.user!.id);
    const isParticipant = conv.participants.some(
      (p) => p.toString() === userId,
    );
    if (!isParticipant) {
      throw new AppError('Bạn không có quyền xem hội thoại này', 403);
    }

    const msgs = await chatService.getMessages(conversationId, Number(req.query.page) || 1);
    res.json({ success: true, data: msgs });
  } catch (err) { next(err); }
};

export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { text, isOffer, offerListingId } = req.body;
    const conversationId = String(req.params.id);

    // Authorization: user phải là participant của conversation
    const conv = await Conversation.findById(conversationId);
    if (!conv) {
      throw new AppError('Không tìm thấy hội thoại', 404);
    }
    const userId = String(req.user!.id);
    const isParticipant = conv.participants.some(
      (p) => p.toString() === userId,
    );
    if (!isParticipant) {
      throw new AppError('Bạn không có quyền gửi tin nhắn vào hội thoại này', 403);
    }

    // Lấy tên user từ DB để hiển thị trong message (JWT chỉ có id/email/role)
    const sender = await User.findById(userId).select('name');
    const senderName = sender?.name ?? 'Unknown';

    const msg = await chatService.sendMessage(conversationId, userId, senderName, text, isOffer, offerListingId);
    // E5/K1 — broadcast realtime (nếu gateway đã được attach)
    try {
      const { chatGateway } = await import('../realtime');
      chatGateway.broadcastMessage(conversationId, {
        _id: String(msg._id),
        conversationId: String(msg.conversationId),
        senderId: String(msg.senderId),
        senderName: msg.senderName,
        text: msg.text,
        isOffer: msg.isOffer,
        offerListingId: msg.offerListingId ? String(msg.offerListingId) : null,
        createdAt: msg.createdAt,
      });
    } catch { /* gateway chưa sẵn sàng — bỏ qua */ }
    res.status(201).json({ success: true, data: msg });
  } catch (err) { next(err); }
};

import { Response, NextFunction } from 'express';
import * as chatService from '../services/chat.service';
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
    const msgs = await chatService.getMessages(req.params.id as string, Number(req.query.page) || 1);
    res.json({ success: true, data: msgs });
  } catch (err) { next(err); }
};

export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { text, isOffer, offerListingId } = req.body;
    const msg = await chatService.sendMessage(req.params.id as string, req.user!.id, (req.user as any).name || 'Unknown', text, isOffer, offerListingId);
    // E5/K1 — broadcast realtime (nếu gateway đã được attach)
    try {
      const { chatGateway } = await import('../realtime');
      chatGateway.broadcastMessage(req.params.id as string, {
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

import { Conversation, IConversation } from '../models/conversation.model';
import { Message, IMessage } from '../models/message.model';
import { AppError } from '../utils/AppError';
import * as notificationService from './notification.service';

export const getConversations = async (userId: string) => {
  return Conversation.find({ participants: userId }).sort({ updatedAt: -1 }).populate('participants', 'fullName avatarUrl');
};

export const getOrCreateConversation = async (userId: string, otherUserId: string, listingId?: string): Promise<IConversation> => {
  const participants = [userId, otherUserId].sort();
  let conv = await Conversation.findOne({ participants: { $all: participants } });
  if (!conv) {
    conv = await Conversation.create({ participants, listingId });
  }
  return conv;
};

export const getMessages = async (conversationId: string, page = 1, limit = 50) => {
  const conv = await Conversation.findById(conversationId);
  if (!conv) throw new AppError('Không tìm thấy hội thoại', 404);

  const skip = (page - 1) * limit;
  const messages = await Message.find({ conversationId }).sort({ createdAt: -1 }).skip(skip).limit(limit);
  return messages.reverse();
};

export const sendMessage = async (conversationId: string, senderId: string, senderName: string, text: string, isOffer = false, offerListingId?: string, imageUrl?: string): Promise<IMessage> => {
  const msg = await Message.create({ conversationId, senderId, senderName, text, isOffer, offerListingId, imageUrl, readBy: [senderId] });
  const preview = text ? text.slice(0, 100) : (imageUrl ? '[Hình ảnh]' : '');
  await Conversation.findByIdAndUpdate(conversationId, { lastMessage: preview, updatedAt: new Date() });

  // F1: Notify cho participants khác (trừ người gửi)
  const conv = await Conversation.findById(conversationId);
  if (conv) {
    const recipients = conv.participants.filter((p) => p.toString() !== senderId);
    for (const recipientId of recipients) {
      await notificationService.create({
        userId: recipientId.toString(),
        type: 'chat',
        title: `Tin nhắn mới từ ${senderName}`,
        body: text.slice(0, 100),
        relatedId: conversationId,
      }).catch((err) => console.error('Chat notification failed:', err));
    }
  }

  return msg;
};

/**
 * Đánh dấu đã đọc tất cả tin nhắn (của người khác) trong 1 conversation.
 * Trả về danh sách message id vừa được đánh dấu — dùng để broadcast 'message:read'.
 */
export const markAsRead = async (conversationId: string, userId: string): Promise<string[]> => {
  const unread = await Message.find({
    conversationId,
    senderId: { $ne: userId },
    readBy: { $ne: userId },
  }).select('_id');
  if (unread.length === 0) return [];

  const ids = unread.map((m) => m._id);
  await Message.updateMany({ _id: { $in: ids } }, { $addToSet: { readBy: userId } });
  return ids.map((id) => String(id));
};

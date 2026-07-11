import { Conversation, IConversation } from '../models/conversation.model';
import { Message, IMessage } from '../models/message.model';
import { AppError } from '../utils/AppError';
import * as notificationService from './notification.service';

export const getConversations = async (userId: string) => {
  return Conversation.find({ participants: userId }).sort({ updatedAt: -1 }).populate('participants', 'name avatarUrl');
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

export const sendMessage = async (conversationId: string, senderId: string, senderName: string, text: string, isOffer = false, offerListingId?: string): Promise<IMessage> => {
  const msg = await Message.create({ conversationId, senderId, senderName, text, isOffer, offerListingId });
  await Conversation.findByIdAndUpdate(conversationId, { lastMessage: text.slice(0, 100), updatedAt: new Date() });

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

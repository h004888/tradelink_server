import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../models/user.model';
import { Conversation } from '../models/conversation.model';
import * as chatService from '../services/chat.service';

/**
 * Realtime gateway cho chat — thay thế polling 5s bằng push event.
 * - Client connect kèm Bearer JWT trong `auth.token`.
 * - Client emit `join` với conversationId → join room.
 * - Server emit `message:new` cho room khi có tin nhắn mới.
 */
export class ChatGateway {
  private io: SocketIOServer | null = null;

  attach(server: import('http').Server): void {
    this.io = new SocketIOServer(server, {
      cors: { origin: '*', methods: ['GET', 'POST'] },
    });

    // Auth middleware — verify JWT + check tokenVersion để vô hiệu hóa token cũ
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return next(new Error('NO_TOKEN'));
        const payload = jwt.verify(String(token), config.jwt.secret) as { id: string; email: string; tokenVersion?: number };
        // Verify tokenVersion — nếu user đã đổi mật khẩu, token cũ bị từ chối
        const user = await User.findById(payload.id).select('tokenVersion');
        if (!user) return next(new Error('INVALID_TOKEN'));
        if (payload.tokenVersion !== undefined && user.tokenVersion !== payload.tokenVersion) {
          return next(new Error('TOKEN_REVOKED'));
        }
        (socket as any).user = { ...payload, tokenVersion: user.tokenVersion };
        next();
      } catch (err) {
        next(new Error('INVALID_TOKEN'));
      }
    });

    this.io.on('connection', (socket: Socket) => this.onConnection(socket));
  }

  private onConnection(socket: Socket): void {
    const user = (socket as any).user as { id: string; email: string } | undefined;
    if (!user) return;

    // Auto-join rooms cho tất cả conversations của user
    socket.on('join', (conversationId: string) => {
      if (typeof conversationId !== 'string') return;
      socket.join(`conv:${conversationId}`);
      socket.emit('joined', { conversationId });
    });

    // Client có thể emit `send` để gửi realtime (forward tới service + broadcast)
    socket.on('send', async (payload: { conversationId: string; text: string; isOffer?: boolean; offerListingId?: string; imageUrl?: string }, ack?: (res: any) => void) => {
      try {
        if (!payload?.conversationId || (!payload.text && !payload.imageUrl)) {
          ack?.({ success: false, message: 'Thiếu conversationId hoặc nội dung tin nhắn' });
          return;
        }
        // Membership check: socket user phải là participant của conversation
        const conv = await Conversation.findById(payload.conversationId);
        if (!conv) {
          ack?.({ success: false, message: 'Không tìm thấy hội thoại' });
          return;
        }
        const isParticipant = conv.participants.some((p) => p.toString() === user.id);
        if (!isParticipant) {
          ack?.({ success: false, message: 'Bạn không có quyền gửi tin nhắn vào hội thoại này' });
          return;
        }
        // Lấy tên user từ DB để hiển thị chính xác
        const senderDoc = await User.findById(user.id).select('fullName');
        const name = senderDoc?.fullName || user.email.split('@')[0];
        const msg = await chatService.sendMessage(
          payload.conversationId,
          user.id,
          name,
          payload.text,
          !!payload.isOffer,
          payload.offerListingId,
          payload.imageUrl,
        );
        const out = {
          _id: String(msg._id),
          conversationId: String(msg.conversationId),
          senderId: String(msg.senderId),
          senderName: msg.senderName,
          text: msg.text,
          imageUrl: msg.imageUrl ?? null,
          isOffer: msg.isOffer,
          offerListingId: msg.offerListingId ? String(msg.offerListingId) : null,
          createdAt: msg.createdAt,
        };
        // Broadcast cho tất cả client trong room (bao gồm cả người gửi)
        this.io?.to(`conv:${payload.conversationId}`).emit('message:new', out);
        ack?.({ success: true, data: out });
      } catch (err: any) {
        ack?.({ success: false, message: err?.message ?? 'Lỗi không xác định' });
      }
    });

    // Client emit `read` khi mở/scroll tới cuối conversation → đánh dấu đã đọc + báo cho người gửi
    socket.on('read', async (payload: { conversationId: string }) => {
      try {
        if (!payload?.conversationId) return;
        const messageIds = await chatService.markAsRead(payload.conversationId, user.id);
        if (messageIds.length === 0) return;
        this.io?.to(`conv:${payload.conversationId}`).emit('message:read', {
          conversationId: payload.conversationId,
          readerId: user.id,
          messageIds,
        });
      } catch {
        // best-effort — không cần ack
      }
    });

    socket.on('disconnect', () => {
      // cleanup rooms auto khi disconnect — không cần xử lý thêm
    });
  }

  /** Được gọi từ REST controller khi có tin nhắn mới (tạo qua HTTP) để broadcast. */
  broadcastMessage(conversationId: string, msg: any): void {
    if (!this.io) return;
    this.io.to(`conv:${conversationId}`).emit('message:new', msg);
  }

  /** Được gọi từ REST controller khi có tin nhắn được đánh dấu đã đọc qua HTTP. */
  broadcastRead(conversationId: string, readerId: string, messageIds: string[]): void {
    if (!this.io || messageIds.length === 0) return;
    this.io.to(`conv:${conversationId}`).emit('message:read', { conversationId, readerId, messageIds });
  }
}

export const chatGateway = new ChatGateway();

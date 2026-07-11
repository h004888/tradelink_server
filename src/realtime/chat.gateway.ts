import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config';
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

    // Auth middleware
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return next(new Error('NO_TOKEN'));
        const payload = jwt.verify(String(token), config.jwt.secret) as { id: string; email: string };
        (socket as any).user = payload;
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
    socket.on('send', async (payload: { conversationId: string; text: string; isOffer?: boolean; offerListingId?: string }, ack?: (res: any) => void) => {
      try {
        if (!payload?.conversationId || !payload.text) {
          ack?.({ success: false, message: 'Thiếu conversationId hoặc text' });
          return;
        }
        const name = (user as any).name || user.email.split('@')[0];
        const msg = await chatService.sendMessage(
          payload.conversationId,
          user.id,
          name,
          payload.text,
          !!payload.isOffer,
          payload.offerListingId,
        );
        const out = {
          _id: String(msg._id),
          conversationId: String(msg.conversationId),
          senderId: String(msg.senderId),
          senderName: msg.senderName,
          text: msg.text,
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

    socket.on('disconnect', () => {
      // cleanup rooms auto khi disconnect — không cần xử lý thêm
    });
  }

  /** Được gọi từ REST controller khi có tin nhắn mới (tạo qua HTTP) để broadcast. */
  broadcastMessage(conversationId: string, msg: any): void {
    if (!this.io) return;
    this.io.to(`conv:${conversationId}`).emit('message:new', msg);
  }
}

export const chatGateway = new ChatGateway();

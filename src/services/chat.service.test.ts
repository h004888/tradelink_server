jest.mock('../models/message.model', () => ({
  Message: {
    create: jest.fn(),
  },
}));

jest.mock('../models/conversation.model', () => ({
  Conversation: {
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock('./notification.service', () => ({
  create: jest.fn(),
}));

import { Conversation } from '../models/conversation.model';
import { Message } from '../models/message.model';
import * as notificationService from './notification.service';
import { sendMessage } from './chat.service';

describe('chat.service.sendMessage notification contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Message.create as jest.Mock).mockResolvedValue({ _id: 'msg1' });
    (Conversation.findByIdAndUpdate as jest.Mock).mockResolvedValue({});
    (notificationService.create as jest.Mock).mockResolvedValue({ _id: 'n1' });
  });

  it('creates chat notification contract for recipient only', async () => {
    (Conversation.findById as jest.Mock).mockResolvedValue({
      participants: [{ toString: () => 'sender1' }, { toString: () => 'recipient1' }],
    });

    await sendMessage('conv1', 'sender1', 'An', 'Xin chào');

    expect(notificationService.create).toHaveBeenCalledTimes(1);
    expect(notificationService.create).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'recipient1',
      type: 'chat',
      entityType: 'conversation',
      entityId: 'conv1',
      action: 'chat.message.created',
      deeplink: '/chat/conv1',
      relatedId: 'conv1',
    }));
  });

  it('uses image preview for image-only message notification', async () => {
    (Conversation.findById as jest.Mock).mockResolvedValue({
      participants: [{ toString: () => 'sender1' }, { toString: () => 'recipient1' }],
    });

    await expect(sendMessage('conv1', 'sender1', 'An', '', false, undefined, 'https://img')).resolves.toEqual({ _id: 'msg1' });

    expect(Conversation.findByIdAndUpdate).toHaveBeenCalledWith(
      'conv1',
      expect.objectContaining({ lastMessage: '[Hình ảnh]' })
    );
    expect(notificationService.create).toHaveBeenCalledWith(expect.objectContaining({
      body: '[Hình ảnh]',
    }));
  });
});

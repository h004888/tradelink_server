import { Notification } from '../models/notification.model';
import { chatGateway } from '../realtime/chat.gateway';
import * as notificationService from './notification.service';

jest.mock('../models/notification.model', () => ({
  Notification: {
    create: jest.fn(),
  },
}));

jest.mock('../realtime/chat.gateway', () => ({
  chatGateway: {
    broadcastNotification: jest.fn(),
  },
}));

const mockedNotification = Notification as jest.Mocked<typeof Notification>;
const mockedChatGateway = chatGateway as jest.Mocked<typeof chatGateway>;

describe('notification service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a notification with normalized contract fields', async () => {
    mockedNotification.create.mockResolvedValue({ _id: 'n1' } as any);

    await notificationService.create({
      userId: 'u1',
      type: 'chat',
      title: 'Tin nhan moi',
      body: 'Xin chao',
      entityType: 'conversation',
      entityId: 'c1',
      action: 'chat.message.created',
      deeplink: '/chat/c1',
    });

    expect(mockedNotification.create).toHaveBeenCalledWith({
      userId: 'u1',
      type: 'chat',
      title: 'Tin nhan moi',
      body: 'Xin chao',
      entityType: 'conversation',
      entityId: 'c1',
      action: 'chat.message.created',
      deeplink: '/chat/c1',
      relatedId: 'c1',
    });
  });

  it('rejects new contract input without entityType or entityId', async () => {
    await expect(
      notificationService.create({
        userId: 'u1',
        type: 'transaction',
        title: 'T',
        body: 'B',
        action: 'transaction.created',
      }),
    ).rejects.toThrow('entityType and entityId are required');

    expect(mockedNotification.create).not.toHaveBeenCalled();
  });

  it('broadcasts a realtime notification after create succeeds', async () => {
    const created = { _id: 'n1', userId: 'u1', title: 'Tin moi' };
    mockedNotification.create.mockResolvedValue(created as any);

    await notificationService.create({
      userId: 'u1',
      type: 'chat',
      title: 'Tin moi',
      body: 'B',
      entityType: 'conversation',
      entityId: 'c1',
      action: 'chat.message.created',
      deeplink: '/chat/c1',
    });

    expect(mockedChatGateway.broadcastNotification).toHaveBeenCalledWith('u1', created);
  });
});

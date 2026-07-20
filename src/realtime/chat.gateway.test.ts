import { ChatGateway } from './chat.gateway';

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

jest.mock('../config', () => ({
  config: { jwt: { secret: 'test-secret' } },
}));

jest.mock('../models/user.model', () => ({
  User: { findById: jest.fn() },
}));

jest.mock('../models/conversation.model', () => ({
  Conversation: { findById: jest.fn() },
}));

jest.mock('../services/chat.service', () => ({
  sendMessage: jest.fn(),
  markAsRead: jest.fn(),
}));

describe('ChatGateway notifications', () => {
  it('joins the authenticated user room on connection', () => {
    const gateway = new ChatGateway();
    const socket = {
      user: { id: 'u1', email: 'u1@example.com' },
      join: jest.fn(),
      emit: jest.fn(),
      on: jest.fn(),
    };

    (gateway as any).onConnection(socket);

    expect(socket.join).toHaveBeenCalledWith('user:u1');
  });

  it('broadcasts notification:new to the target user room', () => {
    const gateway = new ChatGateway();
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    const payload = { _id: 'n1', title: 'Tin moi' };

    (gateway as any).io = { to };
    (gateway as any).broadcastNotification('u1', payload);

    expect(to).toHaveBeenCalledWith('user:u1');
    expect(emit).toHaveBeenCalledWith('notification:new', payload);
  });
});

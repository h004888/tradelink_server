import { Server } from 'http';
import { chatGateway } from './chat.gateway';

/**
 * Mount tất cả socket.io gateways vào HTTP server.
 * Phải gọi SAU khi `app.listen()` trả về server instance.
 */
export const attachRealtime = (server: Server): void => {
  chatGateway.attach(server);
};

export { chatGateway };

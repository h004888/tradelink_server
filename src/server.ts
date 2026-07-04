import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { config } from './config';
import { logger } from './utils/logger';

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server đang chạy tại http://localhost:${PORT}`);
  logger.info(`📋 Environment: ${config.nodeEnv}`);
  logger.info(`📖 API Docs: http://localhost:${PORT}/api/v1`);
  logger.info(`💚 Health Check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`🛑 Nhận tín hiệu ${signal} — Đóng server...`);
  server.close(() => {
    logger.info('✅ Server đã đóng an toàn');
    process.exit(0);
  });

  // Force exit sau 10s nếu chưa đóng xong
  setTimeout(() => {
    logger.error('⏰ Force exit sau timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Bắt unhandled errors
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

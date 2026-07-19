import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { config } from './config';
import { connectDB } from './config/database';
import { logger } from './utils/logger';
import { attachRealtime } from './realtime';
import { pollSepayTransactions } from './services/transaction.service';

const PORT = config.port;

const start = async () => {
  await connectDB();

  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Server đang chạy tại http://0.0.0.0:${PORT}`);
    logger.info(`📋 Environment: ${config.nodeEnv}`);
    logger.info(`📖 API Docs: http://localhost:${PORT}/api/v1`);
    logger.info(`💚 Health Check: http://localhost:${PORT}/health`);
  });

  // Mount socket.io realtime gateways (E5/K1)
  attachRealtime(server);

  // Dự phòng cho webhook SePay: poll API giao dịch mỗi 15s (xem transaction.service.ts)
  if (config.sepay.apiKey) {
    setInterval(() => {
      pollSepayTransactions().catch((err) => logger.error('[SePay poll] Lỗi:', err));
    }, 15000);
    logger.info('🔁 SePay polling fallback đã bật (mỗi 15s)');
  }

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

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', reason);
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
  });
};

start();

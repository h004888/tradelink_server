import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import path from 'path';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';

const app = express();

// ========== Middleware chung ==========
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } })); // Bảo mật HTTP headers
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));            // Cho phép cross-origin với restrict
app.use(compression());                     // Nén response
app.use(morgan('dev'));                     // Log request
app.use(express.json());                    // Parse JSON body
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded body

// ========== Static uploads (trả ảnh đã upload) ==========
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ========== API Routes ==========
app.use('/api/v1', routes);

// ========== Health Check ==========
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ========== Error Handling ==========
app.use(notFoundHandler);   // 404 cho route không tồn tại
app.use(errorHandler);      // Global error handler

export default app;

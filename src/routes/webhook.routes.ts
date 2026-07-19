import { Router } from 'express';
import { sepayWebhook } from '../controllers/webhook.controller';

const router = Router();

// Không dùng middleware `authenticate` (JWT) — webhook được SePay gọi trực tiếp,
// tự xác thực riêng bằng Apikey trong header (xem webhook.controller.ts).
router.post('/sepay', sepayWebhook);

export default router;

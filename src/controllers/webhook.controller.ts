import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import * as transactionService from '../services/transaction.service';

/**
 * POST /webhooks/sepay — SePay gọi vào mỗi khi tài khoản ngân hàng đã liên kết nhận
 * được 1 giao dịch chuyển khoản. Xác thực bằng header "Authorization: Apikey <key>"
 * (cấu hình cùng giá trị SEPAY_WEBHOOK_API_KEY khi tạo webhook trên my.sepay.vn).
 *
 * Payload tham khảo: https://docs.sepay.vn/tich-hop-webhooks.html
 */
export const sepayWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = req.headers['authorization'] || '';
    if (!config.sepay.webhookApiKey || auth !== `Apikey ${config.sepay.webhookApiKey}`) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const body = req.body ?? {};
    const transferType = body.transferType as string | undefined;
    const transferAmount = Number(body.transferAmount ?? 0);
    const content = String(body.content ?? body.description ?? '');
    const referenceCode = String(body.referenceCode ?? body.id ?? '');

    // Chỉ quan tâm giao dịch tiền VÀO — bỏ qua tiền ra (SePay cũng bắn webhook cho cả 2 chiều).
    if (transferType !== 'in') {
      return res.json({ success: true });
    }

    // Mã đối soát dạng "DHxxxxxxxx" — dò trong nội dung chuyển khoản (SePay không đảm bảo
    // giữ nguyên hoa/thường hoặc dấu cách nên chuẩn hoá trước khi so khớp).
    const match = content.toUpperCase().replace(/\s+/g, '').match(/DH[0-9A-F]{8}/);
    if (!match) {
      console.warn('[SePay] Không tìm thấy mã đối soát trong nội dung:', content);
      return res.json({ success: true });
    }

    await transactionService.confirmPaymentFromWebhook(match[0], transferAmount, referenceCode);
    res.json({ success: true });
  } catch (err) { next(err); }
};

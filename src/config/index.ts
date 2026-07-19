import dotenv from 'dotenv';
dotenv.config();

// JWT_SECRET bắt buộc trong production — fallback chỉ dùng ở dev
const jwtSecret = process.env.JWT_SECRET
  || (process.env.NODE_ENV === 'production' ? (() => { throw new Error('JWT_SECRET must be set in production'); })() : 'dev-only-insecure-secret');

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  database: {
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/tradelink',
  },
  jwt: {
    secret: jwtSecret,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  },
  autoVerifyEmail: process.env.AUTO_VERIFY_EMAIL !== 'false',
  sepay: {
    webhookApiKey: process.env.SEPAY_WEBHOOK_API_KEY || '',
    bankBin: process.env.SEPAY_BANK_BIN || '',
    accountNumber: process.env.SEPAY_ACCOUNT_NUMBER || '',
    accountName: process.env.SEPAY_ACCOUNT_NAME || '',
    // Nếu tài khoản ngân hàng chỉ hỗ trợ VA (Virtual Account), QR phải trỏ vào số VA này
    // thay vì số tài khoản chính — tiền chuyển vào tài khoản chính sẽ KHÔNG được SePay ghi nhận.
    vaNumber: process.env.SEPAY_VA_NUMBER || '',
    // Public API token (my.sepay.vn → Tạo API Token) — dùng để chủ động poll danh sách giao dịch,
    // làm phương án dự phòng cho trường hợp webhook không được gọi (một số tài khoản VA gặp tình
    // trạng này dù SePay vẫn ghi nhận giao dịch phía họ).
    apiKey: process.env.SEPAY_API_KEY || '',
  },
};

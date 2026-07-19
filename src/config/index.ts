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
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
  },
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  },
  autoVerifyEmail: process.env.AUTO_VERIFY_EMAIL !== 'false',
};

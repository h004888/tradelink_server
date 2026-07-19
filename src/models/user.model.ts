import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  name: string;
  passwordHash?: string;
  role: 'user' | 'admin';
  avatarUrl?: string;
  phone?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  reputationScore: number;
  rating: number;
  totalTransactions: number;
  totalReviews: number;
  responseTime: string;
  successRate: number;
  totalListings: number;
  memberSince: Date;
  createdAt: Date;
  updatedAt: Date;
  // A2/J5 — forgot/reset password
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  // A3 — email verification
  isVerified?: boolean;
  verifyToken?: string;
  verifyTokenExpires?: Date;
  // OTP
  otp?: string;
  otpExpiry?: Date;
  otpAttempts?: number;
  otpLockedUntil?: Date;
  // Auth — refresh token rotation version
  tokenVersion: number;
  // Thông tin nhận tiền — admin dùng để chuyển khoản thủ công khi giao dịch bán hàng hoàn tất.
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountHolder?: string;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    passwordHash: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    avatarUrl: { type: String },
    phone: { type: String },
    address: { type: String },
    latitude: { type: Number },
    longitude: { type: Number },
    reputationScore: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalTransactions: { type: Number, default: 0 },
    totalReviews: { type: Number, default: 0 },
    responseTime: { type: String, default: 'Chưa có' },
    successRate: { type: Number, default: 100 },
    totalListings: { type: Number, default: 0 },
    memberSince: { type: Date, default: Date.now },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    isVerified: { type: Boolean, default: false },
    verifyToken: { type: String, select: false },
    verifyTokenExpires: { type: Date, select: false },
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    otpLockedUntil: { type: Date, select: false },
    tokenVersion: { type: Number, default: 0 },
    bankName: { type: String },
    bankAccountNumber: { type: String },
    bankAccountHolder: { type: String },
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);

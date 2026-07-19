import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  fullName: string;
  passwordHash?: string;
  role: 'buyer' | 'seller' | 'admin';
  avatarUrl?: string;
  badges: string[];
  settings: {
    notifications: boolean;
    language: string;
  };
  hasSeenOnboarding: boolean;
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
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    passwordHash: { type: String },
    role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
    avatarUrl: { type: String },
    badges: { type: [String], default: [] },
    settings: {
      notifications: { type: Boolean, default: true },
      language: { type: String, default: 'vi' },
    },
    hasSeenOnboarding: { type: Boolean, default: false },
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
  },
  { timestamps: true }
);

export const User = mongoose.model<IUser>('User', userSchema);

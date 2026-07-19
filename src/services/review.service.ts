import { Review } from '../models/review.model';
import { User } from '../models/user.model';
import { AppError } from '../utils/AppError';

export const create = async (data: {
  transactionId: string;
  reviewerId: string;
  targetId: string;
  rating: number;
  communication: number;
  punctuality: number;
  quality: number;
  comment?: string;
}) => {
  const exists = await Review.findOne({ transactionId: data.transactionId, reviewerId: data.reviewerId });
  if (exists) throw new AppError('Bạn đã đánh giá giao dịch này rồi', 409);

  const review = await Review.create(data);

  // Cập nhật reputation score của target user
  const reviews = await Review.find({ targetId: data.targetId });
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await User.findByIdAndUpdate(data.targetId, {
    $inc: { totalTransactions: 1 },
    $set: {
      reputationScore: Math.round(avgRating * 20), // Convert 1-5 → 0-100
      successRate: Math.round((reviews.filter(r => r.rating >= 3).length / reviews.length) * 100 * 10) / 10,
    },
  });

  return review;
};

export const findByUser = async (userId: string) => {
  return Review.find({ targetId: userId }).sort({ createdAt: -1 }).populate('reviewerId', 'fullName avatarUrl');
};

export const getPendingCount = async () => {
  // Reviews that haven't been submitted yet for completed transactions
  const today = new Date(new Date().setHours(0, 0, 0, 0));
  return Review.countDocuments({ createdAt: { $gte: today } });
};

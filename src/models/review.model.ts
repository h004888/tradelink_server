import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  transactionId: mongoose.Types.ObjectId;
  reviewerId: mongoose.Types.ObjectId;
  targetId: mongoose.Types.ObjectId;
  rating: number;
  communication: number;
  punctuality: number;
  quality: number;
  comment?: string;
  createdAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    communication: { type: Number, required: true, min: 1, max: 5 },
    punctuality: { type: Number, required: true, min: 1, max: 5 },
    quality: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

reviewSchema.index({ transactionId: 1, reviewerId: 1 }, { unique: true });
reviewSchema.index({ targetId: 1 });

export const Review = mongoose.model<IReview>('Review', reviewSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface IWatchlist extends Document {
  userId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const watchlistSchema = new Schema<IWatchlist>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

watchlistSchema.index({ userId: 1, listingId: 1 }, { unique: true });
watchlistSchema.index({ userId: 1 });

export const Watchlist = mongoose.model<IWatchlist>('Watchlist', watchlistSchema);

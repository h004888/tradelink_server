import mongoose, { Document, Schema } from 'mongoose';

export interface IListing extends Document {
  title: string;
  description: string;
  price?: number;
  imageUrls: string[];
  category: string;
  condition: 'new' | 'likeNew' | 'used';
  type: 'sale' | 'trade' | 'both';
  status: 'active' | 'sold' | 'hidden' | 'draft';
  sellerId: mongoose.Types.ObjectId;
  sellerName: string;
  views: number;
  interests: number;
  saves: number;
  flags: number;
  boostExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const listingSchema = new Schema<IListing>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number },
    imageUrls: [{ type: String }],
    category: { type: String, required: true },
    condition: { type: String, enum: ['new', 'likeNew', 'used'], default: 'used' },
    type: { type: String, enum: ['sale', 'trade', 'both'], default: 'sale' },
    status: { type: String, enum: ['active', 'sold', 'hidden', 'draft'], default: 'active' },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerName: { type: String, required: true },
    views: { type: Number, default: 0 },
    interests: { type: Number, default: 0 },
    saves: { type: Number, default: 0 },
    flags: { type: Number, default: 0 },
    boostExpiry: { type: Date },
  },
  { timestamps: true }
);

listingSchema.index({ title: 'text', description: 'text' });
listingSchema.index({ category: 1, status: 1 });
listingSchema.index({ sellerId: 1 });
listingSchema.index({ boostExpiry: -1 });

export const Listing = mongoose.model<IListing>('Listing', listingSchema);

import mongoose, { Document, Schema } from 'mongoose';

export interface IOffer extends Document {
  listingId: mongoose.Types.ObjectId;
  buyerId: mongoose.Types.ObjectId;
  price?: number;
  tradeItemDescription?: string;
  cashTopUp?: number;
  type: 'buy' | 'trade';
  message: string;
  status: 'pending' | 'accepted' | 'rejected';
  transactionId?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const offerSchema = new Schema<IOffer>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    price: { type: Number },
    tradeItemDescription: { type: String },
    cashTopUp: { type: Number },
    type: { type: String, enum: ['buy', 'trade'], required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

offerSchema.index({ listingId: 1 });
offerSchema.index({ buyerId: 1 });

export const Offer = mongoose.model<IOffer>('Offer', offerSchema);

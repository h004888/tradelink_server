import mongoose, { Document, Schema } from 'mongoose';

export type EscrowStep = 'paymentPending' | 'paymentConfirmed' | 'shipping' | 'delivered' | 'reviewPeriod' | 'released' | 'refunded';

export interface ITransaction extends Document {
  type: 'sale' | 'trade';
  listingId: mongoose.Types.ObjectId;
  listingTitle: string;
  buyerId: mongoose.Types.ObjectId;
  buyerName: string;
  sellerId: mongoose.Types.ObjectId;
  sellerName: string;
  amount?: number;
  escrowStep?: EscrowStep;
  partyASent?: boolean;
  partyAReceived?: boolean;
  partyBSent?: boolean;
  partyBReceived?: boolean;
  // SePay — mã đối soát gắn trong nội dung chuyển khoản để webhook khớp đúng giao dịch.
  paymentCode?: string;
  sepayReferenceCode?: string;
  // Cờ idempotent — đánh dấu đã cộng tiền vào ví seller khi escrowStep chuyển sang 'released'.
  walletCredited?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const transactionSchema = new Schema<ITransaction>(
  {
    type: { type: String, enum: ['sale', 'trade'], required: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    listingTitle: { type: String, required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    buyerName: { type: String, required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    sellerName: { type: String, required: true },
    amount: { type: Number },
    escrowStep: {
      type: String,
      enum: ['paymentPending', 'paymentConfirmed', 'shipping', 'delivered', 'reviewPeriod', 'released', 'refunded'],
    },
    partyASent: { type: Boolean },
    partyAReceived: { type: Boolean },
    partyBSent: { type: Boolean },
    partyBReceived: { type: Boolean },
    paymentCode: { type: String },
    sepayReferenceCode: { type: String },
    walletCredited: { type: Boolean },
  },
  { timestamps: true }
);

transactionSchema.index({ buyerId: 1 });
transactionSchema.index({ sellerId: 1 });
transactionSchema.index({ listingId: 1 });
transactionSchema.index({ paymentCode: 1 }, { sparse: true });

export const Transaction = mongoose.model<ITransaction>('Transaction', transactionSchema);

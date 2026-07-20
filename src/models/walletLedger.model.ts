import mongoose, { Document, Schema } from 'mongoose';

export type WalletLedgerType = 'credit' | 'debit';
export type WalletLedgerReason = 'sale' | 'withdrawal' | 'withdrawal_refund';

export interface IWalletLedgerEntry extends Document {
  userId: mongoose.Types.ObjectId;
  type: WalletLedgerType;
  reason: WalletLedgerReason;
  amount: number;
  balanceAfter: number;
  relatedTransactionId?: mongoose.Types.ObjectId;
  relatedWithdrawalId?: mongoose.Types.ObjectId;
  note?: string;
  createdAt: Date;
}

const walletLedgerSchema = new Schema<IWalletLedgerEntry>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['credit', 'debit'], required: true },
    reason: { type: String, enum: ['sale', 'withdrawal', 'withdrawal_refund'], required: true },
    amount: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    relatedTransactionId: { type: Schema.Types.ObjectId, ref: 'Transaction' },
    relatedWithdrawalId: { type: Schema.Types.ObjectId, ref: 'WithdrawalRequest' },
    note: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

walletLedgerSchema.index({ userId: 1, createdAt: -1 });

export const WalletLedgerEntry = mongoose.model<IWalletLedgerEntry>('WalletLedgerEntry', walletLedgerSchema);

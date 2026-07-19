import mongoose, { Document, Schema } from 'mongoose';

export interface IDispute extends Document {
  transactionId: mongoose.Types.ObjectId;
  raisedBy: mongoose.Types.ObjectId;
  reason: string;
  description: string;
  priority: boolean;
  status: 'open' | 'resolved' | 'closed';
  resolution?: string;
  decision?: 'refund' | 'release' | 'reject';
  attachments?: string[];
  chatLogSnapshot?: string;
  createdAt: Date;
  updatedAt: Date;
}

const disputeSchema = new Schema<IDispute>(
  {
    transactionId: { type: Schema.Types.ObjectId, ref: 'Transaction', required: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    description: { type: String, required: true },
    priority: { type: Boolean, default: false },
    status: { type: String, enum: ['open', 'resolved', 'closed'], default: 'open' },
    resolution: { type: String },
    decision: { type: String, enum: ['refund', 'release', 'reject'] },
    attachments: [{ type: String }],
    chatLogSnapshot: { type: String },
  },
  { timestamps: true }
);

disputeSchema.index({ transactionId: 1 }, { unique: true });
disputeSchema.index({ status: 1 });

export const Dispute = mongoose.model<IDispute>('Dispute', disputeSchema);

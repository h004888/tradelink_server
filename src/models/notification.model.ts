import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType = 'transaction' | 'chat' | 'dispute' | 'system' | 'offer' | 'wallet';

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  entityType?: string;
  entityId?: string;
  action?: string;
  deeplink?: string;
  relatedId?: string;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['transaction', 'chat', 'dispute', 'system', 'offer', 'wallet'], required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    entityType: { type: String },
    entityId: { type: String },
    action: { type: String },
    deeplink: { type: String },
    relatedId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

export const Notification = mongoose.model<INotification>('Notification', notificationSchema);

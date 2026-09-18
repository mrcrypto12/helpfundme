import mongoose, { Document, Schema } from 'mongoose';

export interface IRefund extends Document {
  _id: mongoose.Types.ObjectId;
  donation: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  reason: string;
  status: 'pending' | 'approved' | 'processed' | 'rejected';
  adminNotes: string;
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const refundSchema = new Schema<IRefund>(
  {
    donation: { type: Schema.Types.ObjectId, ref: 'Donation', required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, maxlength: 1000 },
    status: { type: String, enum: ['pending', 'approved', 'processed', 'rejected'], default: 'pending', index: true },
    adminNotes: { type: String, default: '' },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

const Refund = mongoose.model<IRefund>('Refund', refundSchema);
export default Refund;
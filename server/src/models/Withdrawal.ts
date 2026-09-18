import mongoose, { Document, Schema } from 'mongoose';

export interface IWithdrawal extends Document {
  _id: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  amount: number;
  method: 'bank' | 'mobile_money';
  bankInfo?: { bank: string; accountNumber: string; accountName: string };
  mobileMoneyInfo?: { provider: string; phone: string; name: string };
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  adminNotes: string;
  processedBy?: mongoose.Types.ObjectId;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const withdrawalSchema = new Schema<IWithdrawal>(
  {
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    method: { type: String, enum: ['bank', 'mobile_money'], required: true },
    bankInfo: {
      bank: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      accountName: { type: String, default: '' },
    },
    mobileMoneyInfo: {
      provider: { type: String, default: '' },
      phone: { type: String, default: '' },
      name: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'processing', 'completed', 'rejected'],
      default: 'pending',
      index: true,
    },
    adminNotes: { type: String, default: '' },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

const Withdrawal = mongoose.model<IWithdrawal>('Withdrawal', withdrawalSchema);
export default Withdrawal;
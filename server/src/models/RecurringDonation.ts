import mongoose, { Document, Schema } from 'mongoose';

export interface IRecurringDonation extends Document {
  _id: mongoose.Types.ObjectId;
  donor: mongoose.Types.ObjectId;
  post?: mongoose.Types.ObjectId;
  amount: number;
  type: 'post' | 'platform';
  frequency: 'weekly' | 'monthly';
  paystackPlanCode: string;
  paystackSubscriptionCode: string;
  paystackEmailToken: string;
  status: 'active' | 'paused' | 'cancelled';
  nextChargeDate?: Date;
  totalCharged: number;
  chargeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const recurringDonationSchema = new Schema<IRecurringDonation>(
  {
    donor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post', default: null },
    amount: { type: Number, required: true, min: 0.5 },
    type: { type: String, enum: ['post', 'platform'], required: true },
    frequency: { type: String, enum: ['weekly', 'monthly'], default: 'monthly' },
    paystackPlanCode: { type: String, default: '' },
    paystackSubscriptionCode: { type: String, default: '' },
    paystackEmailToken: { type: String, default: '' },
    status: { type: String, enum: ['active', 'paused', 'cancelled'], default: 'active' },
    nextChargeDate: { type: Date },
    totalCharged: { type: Number, default: 0 },
    chargeCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

recurringDonationSchema.index({ donor: 1, status: 1 });
recurringDonationSchema.index({ paystackPlanCode: 1 });

const RecurringDonation = mongoose.model<IRecurringDonation>('RecurringDonation', recurringDonationSchema);
export default RecurringDonation;
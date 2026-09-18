import mongoose, { Document, Schema } from 'mongoose';

export interface IDonation extends Document {
  _id: mongoose.Types.ObjectId;
  donor: mongoose.Types.ObjectId;
  post?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  type: 'post' | 'platform';
  paymentRef: string;
  paymentStatus: 'pending' | 'success' | 'failed';
  transactionId: string;
  message: string;
  isAnonymous: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const donationSchema = new Schema<IDonation>(
  {
    donor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.5, 'Minimum donation is GHS 0.50'],
    },
    currency: {
      type: String,
      default: 'GHS',
      enum: ['GHS'],
    },
    type: {
      type: String,
      enum: ['post', 'platform'],
      required: true,
    },
    paymentRef: {
      type: String,
      required: true,
      unique: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },
    transactionId: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      maxlength: [500, 'Message cannot exceed 500 characters'],
      default: '',
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
donationSchema.index({ createdAt: -1 });
donationSchema.index({ type: 1 });

const Donation = mongoose.model<IDonation>('Donation', donationSchema);
export default Donation;

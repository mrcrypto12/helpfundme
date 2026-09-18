import mongoose, { Document, Schema } from 'mongoose';

export interface IAllocation {
  post: mongoose.Types.ObjectId;
  amount: number;
  allocatedBy: mongoose.Types.ObjectId;
  reason: string;
  date: Date;
}

export interface IPlatformFund extends Document {
  _id: mongoose.Types.ObjectId;
  totalBalance: number;
  totalReceived: number;
  totalAllocated: number;
  allocations: IAllocation[];
  updatedAt: Date;
}

const platformFundSchema = new Schema<IPlatformFund>(
  {
    totalBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalReceived: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalAllocated: {
      type: Number,
      default: 0,
      min: 0,
    },
    allocations: [
      {
        post: {
          type: Schema.Types.ObjectId,
          ref: 'Post',
          required: true,
        },
        amount: {
          type: Number,
          required: true,
          min: 0,
        },
        allocatedBy: {
          type: Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        reason: {
          type: String,
          required: true,
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const PlatformFund = mongoose.model<IPlatformFund>('PlatformFund', platformFundSchema);
export default PlatformFund;

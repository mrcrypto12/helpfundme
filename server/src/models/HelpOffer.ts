import mongoose, { Document, Schema } from 'mongoose';

export interface IHelpOffer extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  type: 'share' | 'items' | 'transport' | 'professional' | 'prayer';
  message: string;
  status: 'offered' | 'accepted' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const helpOfferSchema = new Schema<IHelpOffer>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    post: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    type: { type: String, enum: ['share', 'items', 'transport', 'professional', 'prayer'], required: true },
    message: { type: String, maxlength: 500, default: '' },
    status: { type: String, enum: ['offered', 'accepted', 'completed'], default: 'offered' },
  },
  { timestamps: true }
);

const HelpOffer = mongoose.model<IHelpOffer>('HelpOffer', helpOfferSchema);
export default HelpOffer;
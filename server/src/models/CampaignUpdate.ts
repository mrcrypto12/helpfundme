import mongoose, { Document, Schema } from 'mongoose';

export interface ICampaignUpdate extends Document {
  _id: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  content: string;
  images: string[];
  videoUrl: string;
  type: 'update' | 'milestone' | 'thank_you' | 'completion';
  createdAt: Date;
  updatedAt: Date;
}

const campaignUpdateSchema = new Schema<ICampaignUpdate>(
  {
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      required: [true, 'Update content is required'],
      maxlength: [3000, 'Update cannot exceed 3000 characters'],
    },
    images: {
      type: [String],
      validate: {
        validator: (val: string[]) => val.length <= 3,
        message: 'Maximum 3 images per update',
      },
    },
    videoUrl: {
      type: String,
      default: '',
    },
    type: {
      type: String,
      enum: ['update', 'milestone', 'thank_you', 'completion'],
      default: 'update',
    },
  },
  {
    timestamps: true,
  }
);

campaignUpdateSchema.index({ post: 1, createdAt: -1 });

const CampaignUpdate = mongoose.model<ICampaignUpdate>('CampaignUpdate', campaignUpdateSchema);
export default CampaignUpdate;

import mongoose, { Document, Schema } from 'mongoose';

export interface ISurgeryDetails {
  hospital: string;
  duration: string;
  sessions: number;
  description: string;
}

export interface IFundBreakdownItem {
  label: string;
  amount: number;
  spent: boolean;
}

export interface IBeneficiary {
  name: string;
  relationship: string;
  phone?: string;
  verified: boolean;
}

export interface ICoOrganizer {
  user: mongoose.Types.ObjectId;
  role: 'editor' | 'sharer';
  inviteStatus: 'pending' | 'accepted' | 'declined';
}

export interface IPost extends Document {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  title: string;
  description: string;
  purpose: string;
  targetAmount: number;
  amountRaised: number;
  images: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'medical' | 'education' | 'housing' | 'emergency' | 'funeral' | 'business' | 'other';
  isSurgery: boolean;
  surgeryDetails?: ISurgeryDetails;
  location: {
    city: string;
    region: string;
  };
  status: 'pending' | 'approved' | 'declined' | 'completed';
  viewCount: number;
  likes: mongoose.Types.ObjectId[];
  likesCount: number;
  commentsCount: number;
  donorsCount: number;
  isActive: boolean;
  adminNotes: string;
  declineReason: string;
  // v2.0 fields
  milestonesReached: number[];
  fundBreakdown: IFundBreakdownItem[];
  beneficiary?: IBeneficiary;
  coOrganizers: ICoOrganizer[];
  createdAt: Date;
  updatedAt: Date;
  progress: number;
}

const postSchema = new Schema<IPost>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },
    purpose: {
      type: String,
      required: [true, 'Purpose is required'],
      maxlength: [2000, 'Purpose cannot exceed 2000 characters'],
    },
    targetAmount: {
      type: Number,
      required: [true, 'Target amount is required'],
      min: [1, 'Target amount must be at least 1'],
    },
    amountRaised: {
      type: Number,
      default: 0,
      min: 0,
    },
    images: {
      type: [String],
      validate: {
        validator: (val: string[]) => val.length <= 5,
        message: 'Maximum 5 images allowed',
      },
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    category: {
      type: String,
      enum: ['medical', 'education', 'housing', 'emergency', 'funeral', 'business', 'other'],
      required: [true, 'Category is required'],
    },
    isSurgery: {
      type: Boolean,
      default: false,
    },
    surgeryDetails: {
      hospital: { type: String, default: '' },
      duration: { type: String, default: '' },
      sessions: { type: Number, default: 0 },
      description: { type: String, default: '' },
    },
    location: {
      city: { type: String, required: true },
      region: {
        type: String,
        required: true,
        enum: [
          'Greater Accra', 'Ashanti', 'Western', 'Central', 'Eastern',
          'Volta', 'Northern', 'Upper East', 'Upper West', 'Brong-Ahafo',
          'Oti', 'Bono East', 'Ahafo', 'Savannah', 'North East',
          'Western North',
        ],
      },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'declined', 'completed'],
      default: 'pending',
      index: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    likesCount: {
      type: Number,
      default: 0,
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    donorsCount: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    adminNotes: {
      type: String,
      default: '',
    },
    declineReason: {
      type: String,
      default: '',
    },
    // v2.0 — Milestones tracking (25, 50, 75, 100)
    milestonesReached: {
      type: [Number],
      default: [],
    },
    // v2.0 — "Where Your Money Goes" breakdown
    fundBreakdown: [
      {
        label: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
        spent: { type: Boolean, default: false },
      },
    ],
    // v2.0 — Beneficiary (raising money for someone else)
    beneficiary: {
      name: { type: String, default: '' },
      relationship: { type: String, default: '' },
      phone: { type: String, default: '' },
      verified: { type: Boolean, default: false },
    },
    // v2.0 — Co-organizers / Teams
    coOrganizers: [
      {
        user: { type: Schema.Types.ObjectId, ref: 'User' },
        role: { type: String, enum: ['editor', 'sharer'], default: 'sharer' },
        inviteStatus: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: progress percentage
postSchema.virtual('progress').get(function () {
  if (this.targetAmount === 0) return 0;
  return Math.min(100, Math.round((this.amountRaised / this.targetAmount) * 100));
});

// Indexes
postSchema.index({ status: 1, createdAt: -1 });
postSchema.index({ category: 1 });
postSchema.index({ severity: 1 });
postSchema.index({ 'location.region': 1 });
postSchema.index({ title: 'text', description: 'text' });

const Post = mongoose.model<IPost>('Post', postSchema);
export default Post;

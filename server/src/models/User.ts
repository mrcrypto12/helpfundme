import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IVerification {
  identity: boolean;
  phone: boolean;
  documents: boolean;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string;
  avatar: string;
  googleId?: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  totalDonated: number;
  bio: string;
  phone: string;
  location: string;
  refreshToken?: string;
  // v2.0
  badges: string[];
  campaignsSupported: number;
  peopleHelped: number;
  verification: IVerification;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    avatar: { type: String, default: '' },
    googleId: { type: String, sparse: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isVerified: { type: Boolean, default: false },
    totalDonated: { type: Number, default: 0 },
    bio: { type: String, maxlength: [500, 'Bio cannot exceed 500 characters'], default: '' },
    phone: { type: String, trim: true, sparse: true },
    location: { type: String, default: '' },
    refreshToken: { type: String, select: false },
    badges: { type: [String], default: [] },
    campaignsSupported: { type: Number, default: 0 },
    peopleHelped: { type: Number, default: 0 },
    verification: {
      identity: { type: Boolean, default: false },
      phone: { type: Boolean, default: false },
      documents: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

const User = mongoose.model<IUser>('User', userSchema);
export default User;
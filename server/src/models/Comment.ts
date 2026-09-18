import mongoose, { Document, Schema } from 'mongoose';

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  author: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  content: string;
  likes: mongoose.Types.ObjectId[];
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<IComment>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
      trim: true,
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
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ post: 1, createdAt: -1 });

const Comment = mongoose.model<IComment>('Comment', commentSchema);
export default Comment;

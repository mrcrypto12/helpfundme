import mongoose, { Document, Schema } from 'mongoose';

export interface IPostView extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  post: mongoose.Types.ObjectId;
  lastViewed: Date;
}

const postViewSchema = new Schema<IPostView>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    post: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      required: true,
    },
    lastViewed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Unique compound index — one record per user-post pair
postViewSchema.index({ user: 1, post: 1 }, { unique: true });
postViewSchema.index({ post: 1 });

const PostView = mongoose.model<IPostView>('PostView', postViewSchema);
export default PostView;

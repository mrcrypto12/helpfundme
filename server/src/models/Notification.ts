import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'donation_received'     // Fundraiser owner gets notified of a new donation
  | 'campaign_milestone'    // Donors notified when a campaign hits 25/50/75%
  | 'campaign_completed'    // All donors notified when campaign reaches goal
  | 'campaign_update'       // Donors notified when fundraiser posts an update
  | 'post_approved'         // Fundraiser owner notified when post is approved
  | 'post_declined'         // Fundraiser owner notified when post is declined
  | 'thank_you'             // Donor receives a thank-you from fundraiser
  | 'refund'                // Donor notified of a refund
  | 'platform_donation'     // Platform donation notification
  | 'co_organizer_invite'   // User invited as co-organizer
  | 'system';               // System announcements

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  relatedPost?: mongoose.Types.ObjectId;
  relatedDonation?: mongoose.Types.ObjectId;
  relatedUser?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        'donation_received', 'campaign_milestone', 'campaign_completed',
        'campaign_update', 'post_approved', 'post_declined',
        'thank_you', 'refund', 'platform_donation',
        'co_organizer_invite', 'system',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    relatedPost: {
      type: Schema.Types.ObjectId,
      ref: 'Post',
      default: null,
    },
    relatedDonation: {
      type: Schema.Types.ObjectId,
      ref: 'Donation',
      default: null,
    },
    relatedUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

const Notification = mongoose.model<INotification>('Notification', notificationSchema);
export default Notification;

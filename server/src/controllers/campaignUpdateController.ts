import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import CampaignUpdate from '../models/CampaignUpdate';
import Post from '../models/Post';
import Donation from '../models/Donation';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

// @desc    Add a campaign update
// @route   POST /api/posts/:id/updates
export const addCampaignUpdate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    // Only post author can add updates
    if (post.author.toString() !== req.user?._id.toString()) {
      res.status(403).json({ message: 'Only the campaign owner can post updates' });
      return;
    }

    const { content, type, videoUrl } = req.body;

    const update = await CampaignUpdate.create({
      post: post._id,
      author: req.user?._id,
      content,
      type: type || 'update',
      videoUrl: videoUrl || '',
      images: [],
    });

    await update.populate('author', 'name avatar');

    // Notify all donors of this post
    const donorIds = await Donation.distinct('donor', {
      post: post._id,
      paymentStatus: 'success',
    });

    if (donorIds.length > 0) {
      const notifications = donorIds.map((donorId: any) => ({
        recipient: donorId,
        type: type === 'thank_you' ? 'thank_you' : 'campaign_update',
        title: type === 'thank_you'
          ? `💚 ${req.user?.name} thanked you!`
          : `📢 Update on "${post.title}"`,
        message: content.substring(0, 200),
        relatedPost: post._id,
        relatedUser: req.user?._id,
      }));

      await Notification.insertMany(notifications);
    }

    res.status(201).json({ message: 'Update posted', update });
  } catch (error) {
    console.error('Add campaign update error:', error);
    res.status(500).json({ message: 'Error posting update' });
  }
};

// @desc    Get campaign updates (story timeline)
// @route   GET /api/posts/:id/updates
export const getCampaignUpdates = async (req: Request, res: Response): Promise<void> => {
  try {
    const updates = await CampaignUpdate.find({ post: req.params.id })
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({ updates });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching updates' });
  }
};

// @desc    Send thank-you to all donors
// @route   POST /api/posts/:id/thank-donors
export const thankDonors = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    if (post.author.toString() !== req.user?._id.toString()) {
      res.status(403).json({ message: 'Only the campaign owner can thank donors' });
      return;
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      res.status(400).json({ message: 'Thank-you message is required' });
      return;
    }

    // Create a thank-you campaign update
    const update = await CampaignUpdate.create({
      post: post._id,
      author: req.user?._id,
      content: message,
      type: 'thank_you',
      images: [],
    });

    // Get all unique donors
    const donorIds = await Donation.distinct('donor', {
      post: post._id,
      paymentStatus: 'success',
    });

    // Send notification to each donor
    if (donorIds.length > 0) {
      const notifications = donorIds.map((donorId: any) => ({
        recipient: donorId,
        type: 'thank_you' as const,
        title: `💚 ${req.user?.name} sent you a thank-you!`,
        message: message.substring(0, 200),
        relatedPost: post._id,
        relatedUser: req.user?._id,
      }));

      await Notification.insertMany(notifications);
    }

    res.json({
      message: `Thank-you sent to ${donorIds.length} donor(s)`,
      update,
      donorCount: donorIds.length,
    });
  } catch (error) {
    console.error('Thank donors error:', error);
    res.status(500).json({ message: 'Error sending thank-you' });
  }
};

import { Response } from 'express';
import HelpOffer from '../models/HelpOffer';
import Post from '../models/Post';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

// @desc    Offer non-monetary help on a post
// @route   POST /api/posts/:id/help-offers
export const createHelpOffer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const { type, message } = req.body;
    if (!['share', 'items', 'transport', 'professional', 'prayer'].includes(type)) {
      res.status(400).json({ message: 'Invalid help type' });
      return;
    }

    const offer = await HelpOffer.create({ user: req.user?._id, post: post._id, type, message: message || '' });
    await offer.populate('user', 'name avatar');

    await Notification.create({
      recipient: post.author,
      type: 'system',
      title: `🙋 ${req.user?.name} offered to help`,
      message: `Someone offered "${type}" support for "${post.title}"${message ? `: "${message}"` : ''}`,
      relatedPost: post._id,
      relatedUser: req.user?._id,
    });

    res.status(201).json({ message: 'Help offer submitted', offer });
  } catch (error) {
    console.error('Create help offer error:', error);
    res.status(500).json({ message: 'Error submitting help offer' });
  }
};

// @desc    Get help offers for a post (owner/admin only)
// @route   GET /api/posts/:id/help-offers
export const getHelpOffers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    if (post.author.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized to view help offers' });
      return;
    }

    const offers = await HelpOffer.find({ post: post._id }).populate('user', 'name avatar').sort({ createdAt: -1 });
    res.json({ offers });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching help offers' });
  }
};

// @desc    Update help offer status (owner only)
// @route   PUT /api/help-offers/:id/status
export const updateHelpOfferStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const offer = await HelpOffer.findById(req.params.id).populate('post');
    if (!offer) {
      res.status(404).json({ message: 'Help offer not found' });
      return;
    }
    const post: any = offer.post;
    if (post.author.toString() !== req.user?._id.toString()) {
      res.status(403).json({ message: 'Not authorized' });
      return;
    }

    const { status } = req.body;
    if (!['offered', 'accepted', 'completed'].includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    offer.status = status;
    await offer.save();

    res.json({ message: 'Help offer updated', offer });
  } catch (error) {
    res.status(500).json({ message: 'Error updating help offer' });
  }
};
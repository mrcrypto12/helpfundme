import { Response } from 'express';
import Post from '../models/Post';
import User from '../models/User';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

// @desc    Invite a co-organizer by email
// @route   POST /api/posts/:id/co-organizers
export const inviteCoOrganizer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, role } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    if (post.author.toString() !== req.user?._id.toString()) {
      res.status(403).json({ message: 'Only the campaign owner can invite co-organizers' });
      return;
    }

    const invitee = await User.findOne({ email });
    if (!invitee) {
      res.status(404).json({ message: 'No HelpFund GH user found with that email' });
      return;
    }
    if (invitee._id.toString() === post.author.toString()) {
      res.status(400).json({ message: 'You are already the campaign owner' });
      return;
    }
    const alreadyInvited = post.coOrganizers.some((co) => co.user.toString() === invitee._id.toString());
    if (alreadyInvited) {
      res.status(400).json({ message: 'This user has already been invited' });
      return;
    }

    post.coOrganizers.push({
      user: invitee._id,
      role: role === 'editor' ? 'editor' : 'sharer',
      inviteStatus: 'pending',
    });
    await post.save();

    await Notification.create({
      recipient: invitee._id,
      type: 'co_organizer_invite',
      title: `🤝 ${req.user?.name} invited you as a co-organizer`,
      message: `You've been invited to help manage "${post.title}" as a ${role === 'editor' ? 'editor' : 'sharer'}.`,
      relatedPost: post._id,
      relatedUser: req.user?._id,
    });

    res.json({ message: 'Invitation sent', post });
  } catch (error) {
    console.error('Invite co-organizer error:', error);
    res.status(500).json({ message: 'Error inviting co-organizer' });
  }
};

// @desc    Respond to a co-organizer invite
// @route   PUT /api/posts/:id/co-organizers/respond
export const respondToInvite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { accept } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const entry = post.coOrganizers.find((co) => co.user.toString() === req.user?._id.toString());
    if (!entry) {
      res.status(404).json({ message: 'No invitation found for you on this post' });
      return;
    }

    entry.inviteStatus = accept ? 'accepted' : 'declined';
    await post.save();

    res.json({ message: accept ? 'Invitation accepted' : 'Invitation declined', post });
  } catch (error) {
    res.status(500).json({ message: 'Error responding to invitation' });
  }
};

// @desc    Remove a co-organizer
// @route   DELETE /api/posts/:id/co-organizers/:userId
export const removeCoOrganizer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    if (post.author.toString() !== req.user?._id.toString()) {
      res.status(403).json({ message: 'Only the campaign owner can remove co-organizers' });
      return;
    }

    post.coOrganizers = post.coOrganizers.filter((co) => co.user.toString() !== req.params.userId);
    await post.save();

    res.json({ message: 'Co-organizer removed', post });
  } catch (error) {
    res.status(500).json({ message: 'Error removing co-organizer' });
  }
};
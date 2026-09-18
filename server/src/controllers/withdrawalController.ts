import { Response } from 'express';
import Withdrawal from '../models/Withdrawal';
import Post from '../models/Post';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

// @desc    Request a withdrawal for an approved/completed post's funds
// @route   POST /api/withdrawals
export const requestWithdrawal = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { postId, amount, method, bankInfo, mobileMoneyInfo } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }
    if (post.author.toString() !== req.user?._id.toString()) {
      res.status(403).json({ message: 'Only the campaign owner can request a withdrawal' });
      return;
    }
    if (!['approved', 'completed'].includes(post.status)) {
      res.status(400).json({ message: 'Only approved or completed campaigns can request withdrawals' });
      return;
    }
    if (!amount || amount <= 0 || amount > post.amountRaised) {
      res.status(400).json({ message: 'Invalid withdrawal amount' });
      return;
    }
    if (!['bank', 'mobile_money'].includes(method)) {
      res.status(400).json({ message: 'Invalid withdrawal method' });
      return;
    }

    const existing = await Withdrawal.find({
      post: postId,
      status: { $in: ['pending', 'approved', 'processing', 'completed'] },
    });
    const alreadyRequested = existing.reduce((sum, w) => sum + w.amount, 0);
    if (alreadyRequested + amount > post.amountRaised) {
      res.status(400).json({
        message: `You can only request up to GHS ${(post.amountRaised - alreadyRequested).toFixed(2)} more`,
      });
      return;
    }

    const withdrawal = await Withdrawal.create({
      post: postId,
      requestedBy: req.user?._id,
      amount,
      method,
      bankInfo: method === 'bank' ? bankInfo : undefined,
      mobileMoneyInfo: method === 'mobile_money' ? mobileMoneyInfo : undefined,
    });

    res.status(201).json({ message: 'Withdrawal request submitted for review', withdrawal });
  } catch (error) {
    console.error('Request withdrawal error:', error);
    res.status(500).json({ message: 'Error requesting withdrawal' });
  }
};

// @desc    Get current user's withdrawal requests
// @route   GET /api/withdrawals/my
export const getMyWithdrawals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const withdrawals = await Withdrawal.find({ requestedBy: req.user?._id })
      .populate('post', 'title')
      .sort({ createdAt: -1 });
    res.json({ withdrawals });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching withdrawals' });
  }
};

// @desc    Get all withdrawal requests (admin)
// @route   GET /api/withdrawals
export const getAllWithdrawals = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;

    const [withdrawals, total] = await Promise.all([
      Withdrawal.find(filter)
        .populate('post', 'title amountRaised')
        .populate('requestedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Withdrawal.countDocuments(filter),
    ]);

    res.json({ withdrawals, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching withdrawals' });
  }
};

// @desc    Update withdrawal status (admin)
// @route   PUT /api/withdrawals/:id/status
export const updateWithdrawalStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, adminNotes } = req.body;
    if (!['pending', 'approved', 'processing', 'completed', 'rejected'].includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const withdrawal = await Withdrawal.findById(req.params.id).populate('post');
    if (!withdrawal) {
      res.status(404).json({ message: 'Withdrawal not found' });
      return;
    }

    withdrawal.status = status;
    if (adminNotes) withdrawal.adminNotes = adminNotes;
    withdrawal.processedBy = req.user?._id;
    withdrawal.processedAt = new Date();
    await withdrawal.save();

    await Notification.create({
      recipient: withdrawal.requestedBy,
      type: 'system',
      title: `💸 Withdrawal request ${status}`,
      message: `Your withdrawal request for GHS ${withdrawal.amount.toFixed(2)} has been ${status}.${adminNotes ? ` Note: ${adminNotes}` : ''}`,
      relatedPost: (withdrawal.post as any)?._id,
    });

    res.json({ message: `Withdrawal ${status}`, withdrawal });
  } catch (error) {
    console.error('Update withdrawal status error:', error);
    res.status(500).json({ message: 'Error updating withdrawal' });
  }
};
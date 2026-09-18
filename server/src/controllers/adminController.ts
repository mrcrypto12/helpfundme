import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Post from '../models/Post';
import User from '../models/User';
import Donation from '../models/Donation';
import Comment from '../models/Comment';
import Withdrawal from '../models/Withdrawal';
import PlatformFund from '../models/PlatformFund';
import { AuthRequest } from '../middleware/auth';

// @desc    Get admin dashboard stats
// @route   GET /api/admin/stats
export const getAdminStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalPosts,
      pendingPosts,
      approvedPosts,
      totalDonations,
      donationStats,
      platformFund,
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Post.countDocuments({ status: 'pending' }),
      Post.countDocuments({ status: 'approved' }),
      Donation.countDocuments({ paymentStatus: 'success' }),
      Donation.aggregate([
        { $match: { paymentStatus: 'success' } },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            platformDonations: { $sum: { $cond: [{ $eq: ['$type', 'platform'] }, '$amount', 0] } },
            postDonations: { $sum: { $cond: [{ $eq: ['$type', 'post'] }, '$amount', 0] } },
          },
        },
      ]),
      PlatformFund.findOne(),
    ]);

    const stats = donationStats[0] || { totalAmount: 0, platformDonations: 0, postDonations: 0 };

    res.json({
      users: { total: totalUsers },
      posts: {
        total: totalPosts,
        pending: pendingPosts,
        approved: approvedPosts,
        declined: await Post.countDocuments({ status: 'declined' }),
        completed: await Post.countDocuments({ status: 'completed' }),
      },
      donations: {
        count: totalDonations,
        totalAmount: stats.totalAmount,
        platformDonations: stats.platformDonations,
        postDonations: stats.postDonations,
      },
      platformFund: {
        balance: platformFund?.totalBalance || 0,
        totalReceived: platformFund?.totalReceived || 0,
        totalAllocated: platformFund?.totalAllocated || 0,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Error fetching admin stats' });
  }
};

// @desc    Get all posts (admin - includes pending/declined)
// @route   GET /api/admin/posts
export const getAllPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status && req.query.status !== 'all') {
      filter.status = req.query.status;
    }

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate('author', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments(filter),
    ]);

    res.json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching posts' });
  }
};

// @desc    Get single post with full detail (donations, comments, withdrawals)
// @route   GET /api/admin/posts/:id
export const getPostDetailAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id).populate('author', 'name email avatar phone');
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const [donations, comments, withdrawals] = await Promise.all([
      Donation.find({ post: post._id, paymentStatus: 'success' })
        .populate('donor', 'name email avatar')
        .sort({ createdAt: -1 }),
      Comment.find({ post: post._id }).populate('author', 'name avatar').sort({ createdAt: -1 }),
      Withdrawal.find({ post: post._id }).sort({ createdAt: -1 }),
    ]);

    res.json({ post, donations, comments, withdrawals });
  } catch (error) {
    console.error('Get post detail (admin) error:', error);
    res.status(500).json({ message: 'Error fetching post detail' });
  }
};

// @desc    Update post status (approve/decline)
// @route   PUT /api/admin/posts/:id/status
export const updatePostStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, adminNotes, declineReason } = req.body;

    if (!['approved', 'declined', 'pending'].includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const update: any = { status };
    if (adminNotes) update.adminNotes = adminNotes;
    if (status === 'declined' && declineReason) update.declineReason = declineReason;

    const post = await Post.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('author', 'name email avatar');

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    res.json({ message: `Post ${status}`, post });
  } catch (error) {
    res.status(500).json({ message: 'Error updating post status' });
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
export const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    res.json({
      users,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users' });
  }
};

// @desc    Toggle a verification field on a user (identity / phone / documents)
// @route   PUT /api/admin/users/:id/verify
export const verifyUserIdentity = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { field } = req.body;
    if (!['identity', 'phone', 'documents'].includes(field)) {
      res.status(400).json({ message: 'Invalid verification field' });
      return;
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    user.verification = { ...(user.verification || { identity: false, phone: false, documents: false }), [field]: !user.verification?.[field as keyof typeof user.verification] };
    await user.save();
    res.json({ message: 'User verification updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Error updating verification' });
  }
};

// @desc    Get all donation transactions
// @route   GET /api/admin/donations
export const getAllDonations = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.type && req.query.type !== 'all') filter.type = req.query.type;
    if (req.query.status && req.query.status !== 'all') filter.paymentStatus = req.query.status;

    const [donations, total] = await Promise.all([
      Donation.find(filter)
        .populate('donor', 'name email avatar')
        .populate('post', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Donation.countDocuments(filter),
    ]);

    res.json({
      donations,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching donations' });
  }
};

// @desc    Get platform fund details
// @route   GET /api/admin/funds
export const getPlatformFund = async (_req: Request, res: Response): Promise<void> => {
  try {
    let fund = await PlatformFund.findOne()
      .populate('allocations.post', 'title')
      .populate('allocations.allocatedBy', 'name');

    if (!fund) {
      fund = await PlatformFund.create({ totalBalance: 0, totalReceived: 0, totalAllocated: 0 });
    }

    res.json({ fund });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching platform fund' });
  }
};

// @desc    Allocate platform funds to a post
// @route   POST /api/admin/funds/allocate
export const allocateFunds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    const { postId, amount, reason } = req.body;

    let fund = await PlatformFund.findOne();
    if (!fund) {
      res.status(400).json({ message: 'No platform funds available' });
      return;
    }

    if (fund.totalBalance < amount) {
      res.status(400).json({
        message: `Insufficient funds. Available balance: GHS ${fund.totalBalance.toFixed(2)}`,
      });
      return;
    }

    const post = await Post.findById(postId);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    fund.totalBalance -= amount;
    fund.totalAllocated += amount;
    fund.allocations.push({
      post: postId,
      amount,
      allocatedBy: req.user?._id!,
      reason,
      date: new Date(),
    });
    await fund.save();

    post.amountRaised += amount;
    if (post.amountRaised >= post.targetAmount) {
      post.status = 'completed';
    }
    await post.save();

    res.json({
      message: `GHS ${amount.toFixed(2)} allocated to "${post.title}"`,
      fund: { balance: fund.totalBalance, totalAllocated: fund.totalAllocated },
      post: { amountRaised: post.amountRaised, targetAmount: post.targetAmount },
    });
  } catch (error) {
    console.error('Allocate funds error:', error);
    res.status(500).json({ message: 'Error allocating funds' });
  }
};
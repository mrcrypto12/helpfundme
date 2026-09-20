import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Post from '../models/Post';
import PostView from '../models/PostView';
import Comment from '../models/Comment';
import { AuthRequest } from '../middleware/auth';
import { uploadToCloudinary } from '../utils/cloudinary';
import { uploadSecureDocument } from '../utils/cloudinary';
import User from '../models/User';
import CampaignReport from '../models/CampaignReport';

const safeParse = (value: any) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

const publicPost = (post: any) => {
  const value = typeof post?.toObject === 'function' ? post.toObject() : { ...post };
  delete value.applicantVerification;
  delete value.beneficiaryVerification;
  delete value.evidenceDocuments;
  delete value.reviewHistory;
  delete value.adminNotes;
  delete value.verificationNotes;
  if (value.beneficiary) value.beneficiary = { ...value.beneficiary, phone: undefined };
  return value;
};

// @desc    Create a new post
// @route   POST /api/posts
export const createPost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    const {
      title, description, purpose, targetAmount,
      severity, category, isSurgery, surgeryDetails,
      location, fundBreakdown, beneficiary, legalName, contactEmail, contactPhone,
      dateOfBirth, idType, idNumber, beneficiaryType, beneficiaryVerification,
      consentConfirmed, guardianConsent, evidenceSummary,
    } = req.body;

    const user = await User.findById(req.user?._id);
    const parsedBeneficiary = safeParse(beneficiary);
    const parsedBeneficiaryVerification = safeParse(beneficiaryVerification);
    const isForOther = beneficiaryType === 'other';
    const required = [legalName, contactEmail, contactPhone, dateOfBirth, idType, idNumber];
    if (required.some((value) => !String(value || '').trim())) {
      res.status(400).json({ message: 'Complete all campaign identity and contact fields' }); return;
    }
    if (String(consentConfirmed) !== 'true') {
      res.status(400).json({ message: 'Campaign publication and personal-data consent is required' }); return;
    }
    if (isForOther && (!parsedBeneficiary?.name || !parsedBeneficiaryVerification?.legalName || !parsedBeneficiaryVerification?.idNumber)) {
      res.status(400).json({ message: 'The beneficiary identity and relationship details are required' }); return;
    }

    const groupedFiles = (req.files || {}) as Record<string, Express.Multer.File[]>;
    const identityFiles = groupedFiles.identityDocuments || [];
    const existingIdentityDocuments = user?.verification?.documentsList || [];
    if (!identityFiles.length && !existingIdentityDocuments.length) {
      res.status(400).json({ message: 'Upload an identity document in your profile or campaign application' }); return;
    }
    const evidenceFiles = groupedFiles.evidence || [];
    if (!evidenceFiles.length) {
      res.status(400).json({ message: 'Supporting evidence is required for every campaign' }); return;
    }

    const images: string[] = [];
    if (groupedFiles.images) {
      for (const file of groupedFiles.images) {
        if (!file.mimetype.startsWith('image/')) continue;
        const result = await uploadToCloudinary(file.buffer, 'helpfund-gh/posts');
        images.push(result.url);
      }
    }
    if (!images.length) {
      res.status(400).json({ message: 'At least one campaign image is required' }); return;
    }
    const evidenceDocuments = [];
    for (const file of evidenceFiles) evidenceDocuments.push(await uploadSecureDocument(file, `helpfund-gh/verification/campaigns/${req.user?._id}`));
    const submittedIdentityDocuments = [];
    for (const file of identityFiles) submittedIdentityDocuments.push(await uploadSecureDocument(file, `helpfund-gh/verification/users/${req.user?._id}`));
    if (user && submittedIdentityDocuments.length) {
      user.verification = { ...(user.verification || {}), legalName, dateOfBirth, idType, idNumber, status: 'pending', documentsList: [...existingIdentityDocuments, ...submittedIdentityDocuments], identity: false, documents: false };
      user.phone = contactPhone;
      await user.save();
    }

    const post = await Post.create({
      author: req.user?._id,
      title,
      description,
      purpose,
      targetAmount: parseFloat(targetAmount),
      severity,
      category,
      isSurgery: isSurgery === 'true' || isSurgery === true,
      surgeryDetails: isSurgery ? safeParse(surgeryDetails) || {} : undefined,
      location: safeParse(location) || location,
      images,
      status: 'pending', reviewStatus: 'submitted', isActive: false,
      fundBreakdown: safeParse(fundBreakdown) || [],
      beneficiary: parsedBeneficiary || undefined,
      beneficiaryType: isForOther ? 'other' : 'self',
      applicantVerification: { legalName, contactEmail, contactPhone, dateOfBirth, idType, idNumber },
      beneficiaryVerification: isForOther ? parsedBeneficiaryVerification : undefined,
      evidenceDocuments, evidenceSummary: String(evidenceSummary || ''),
      consentConfirmed: true, guardianConsent: String(guardianConsent) === 'true',
    });

    await post.populate('author', 'name avatar');

    res.status(201).json({
      message: 'Post created successfully. It will be reviewed by our team.',
      post,
    });
  } catch (error: any) {
    console.error('Create post error:', error);
    res.status(500).json({ message: 'Error creating post' });
  }
};

export const reportCampaign = async (req: AuthRequest, res: Response): Promise<void> => {
  const post = await Post.findById(req.params.id);
  if (!post) { res.status(404).json({ message: 'Post not found' }); return; }
  const reason = String(req.body.reason || '').trim();
  if (reason.length < 10) { res.status(400).json({ message: 'Please provide a clear report reason' }); return; }
  await CampaignReport.create({ post: post._id, reporter: req.user?._id, reason, status: 'open' });
  post.reportsCount = Number(post.reportsCount || 0) + 1;
  await post.save();
  res.status(201).json({ message: 'Report received confidentially for review' });
};

// @desc    Get all approved posts (public)
// @route   GET /api/posts
export const getPosts = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;

    const filter: any = { status: 'approved', isActive: true };

    if (req.query.category && req.query.category !== 'all') {
      filter.category = req.query.category;
    }
    if (req.query.severity && req.query.severity !== 'all') {
      filter.severity = req.query.severity;
    }
    if (req.query.region && req.query.region !== 'all') {
      filter['location.region'] = req.query.region;
    }
    if (req.query.search) {
      filter.$text = { $search: req.query.search as string };
    }

    let sort: any = { createdAt: -1 };
    if (req.query.sort === 'urgent') {
      sort = { severity: -1, createdAt: -1 };
    } else if (req.query.sort === 'popular') {
      sort = { likesCount: -1, viewCount: -1 };
    } else if (req.query.sort === 'almost-funded') {
      sort = { amountRaised: -1 };
    }

    const [posts, total] = await Promise.all([
      Post.find(filter)
        .populate('author', 'name avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(filter),
    ]);

    res.json({
      posts: posts.map(publicPost),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Error fetching posts' });
  }
};

// @desc    Get post counts & totals grouped by region (for the Community Map)
// @route   GET /api/posts/stats/regions
export const getRegionStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await Post.aggregate([
      { $match: { status: 'approved' } },
      {
        $group: {
          _id: '$location.region',
          count: { $sum: 1 },
          totalRaised: { $sum: '$amountRaised' },
        },
      },
      { $sort: { count: -1 } },
    ]);

    res.json({
      stats: stats.map((s) => ({ region: s._id, count: s.count, totalRaised: s.totalRaised })),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching region stats' });
  }
};

// @desc    Get single post detail
// @route   GET /api/posts/:id
export const getPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('author', 'name avatar location')
      .populate('coOrganizers.user', 'name avatar email');

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const userId = (req as any).user?._id;
    if (userId) {
      const SIX_HOURS = 6 * 60 * 60 * 1000;
      const existingView = await PostView.findOne({ user: userId, post: post._id });

      if (!existingView) {
        await PostView.create({ user: userId, post: post._id, lastViewed: new Date() });
        post.viewCount += 1;
        await post.save();
      } else if (Date.now() - existingView.lastViewed.getTime() >= SIX_HOURS) {
        existingView.lastViewed = new Date();
        await existingView.save();
        post.viewCount += 1;
        await post.save();
      }
    } else {
      post.viewCount += 1;
      await post.save();
    }

    res.json({ post: publicPost(post) });
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Error fetching post' });
  }
};

// @desc    Update own post
// @route   PUT /api/posts/:id
export const updatePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const canEdit =
      post.author.toString() === req.user?._id.toString() ||
      req.user?.role === 'admin' ||
      post.coOrganizers.some(
        (co: any) => co.user.toString() === req.user?._id.toString() && co.role === 'editor' && co.inviteStatus === 'accepted'
      );

    if (!canEdit) {
      res.status(403).json({ message: 'Not authorized to update this post' });
      return;
    }

    const allowedUpdates = [
      'title', 'description', 'purpose', 'severity', 'category',
      'isSurgery', 'surgeryDetails', 'location', 'fundBreakdown', 'beneficiary',
    ];
    const updates: any = {};

    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        if (['surgeryDetails', 'location', 'fundBreakdown', 'beneficiary'].includes(field)) {
          updates[field] = safeParse(req.body[field]) ?? req.body[field];
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const newImages: string[] = [];
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.buffer, 'helpfund-gh/posts');
        newImages.push(result.url);
      }
      updates.images = [...(post.images || []), ...newImages].slice(0, 5);
    }

    if (req.user?.role !== 'admin') {
      updates.status = 'pending';
    }

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('author', 'name avatar');

    res.json({ message: 'Post updated', post: updatedPost });
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ message: 'Error updating post' });
  }
};

// @desc    Delete own post
// @route   DELETE /api/posts/:id
export const deletePost = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    if (post.author.toString() !== req.user?._id.toString() && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized to delete this post' });
      return;
    }

    await Post.findByIdAndDelete(req.params.id);
    await Comment.deleteMany({ post: req.params.id });

    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Error deleting post' });
  }
};

// @desc    Toggle like on post
// @route   POST /api/posts/:id/like
export const toggleLike = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const userId = req.user?._id;
    const isLiked = post.likes.some((id: any) => id.toString() === userId?.toString());

    if (isLiked) {
      post.likes = post.likes.filter((id: any) => id.toString() !== userId?.toString());
      post.likesCount = Math.max(0, post.likesCount - 1);
    } else {
      post.likes.push(userId!);
      post.likesCount += 1;
    }

    await post.save();

    res.json({
      message: isLiked ? 'Post unliked' : 'Post liked',
      likesCount: post.likesCount,
      isLiked: !isLiked,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling like' });
  }
};

// @desc    Get post comments
// @route   GET /api/posts/:id/comments
export const getComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      Comment.find({ post: req.params.id })
        .populate('author', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Comment.countDocuments({ post: req.params.id }),
    ]);

    res.json({
      comments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching comments' });
  }
};

// @desc    Add comment to post
// @route   POST /api/posts/:id/comments
export const addComment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      res.status(404).json({ message: 'Post not found' });
      return;
    }

    const comment = await Comment.create({
      author: req.user?._id,
      post: req.params.id,
      content: req.body.content,
    });

    post.commentsCount += 1;
    await post.save();

    await comment.populate('author', 'name avatar');

    res.status(201).json({ message: 'Comment added', comment });
  } catch (error) {
    res.status(500).json({ message: 'Error adding comment' });
  }
};

// @desc    Get user's own posts
// @route   GET /api/posts/my/posts
export const getMyPosts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Post.find({ author: req.user?._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Post.countDocuments({ author: req.user?._id }),
    ]);

    res.json({
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching your posts' });
  }
};

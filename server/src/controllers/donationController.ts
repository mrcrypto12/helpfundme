import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import crypto from 'crypto';
import Donation from '../models/Donation';
import Post from '../models/Post';
import User from '../models/User';
import PlatformFund from '../models/PlatformFund';
import Notification from '../models/Notification';
import CampaignUpdate from '../models/CampaignUpdate';
import RecurringDonation from '../models/RecurringDonation';
import { AuthRequest } from '../middleware/auth';

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data: {
    status: string;
    id: number;
    reference: string;
    amount: number;
    [key: string]: any;
  };
}

// ==================== Badges ====================

const BADGE_RULES: { id: string; label: string; check: (u: any) => boolean }[] = [
  { id: 'first_supporter', label: '❤️ First Supporter', check: (u) => u.totalDonated > 0 },
  { id: 'community_helper', label: '🤝 Community Helper', check: (u) => u.campaignsSupported >= 5 },
  { id: 'angel_supporter', label: '🌟 Angel Supporter', check: (u) => u.totalDonated >= 1000 },
  { id: 'campaign_booster', label: '🔥 Campaign Booster', check: (u) => u.campaignsSupported >= 10 },
];

const awardBadges = async (userId: any) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;
    const newBadges: string[] = [];
    for (const rule of BADGE_RULES) {
      if (rule.check(user) && !(user.badges || []).includes(rule.id)) {
        newBadges.push(rule.id);
      }
    }
    if (newBadges.length > 0) {
      user.badges = [...(user.badges || []), ...newBadges];
      await user.save();
      for (const badgeId of newBadges) {
        const rule = BADGE_RULES.find((r) => r.id === badgeId);
        await Notification.create({
          recipient: userId,
          type: 'system',
          title: '🏅 New badge earned!',
          message: `You've earned the "${rule?.label}" badge. Thank you for your generosity!`,
        });
      }
    }
  } catch (err) {
    console.error('Award badges error:', err);
  }
};

// Track distinct campaigns a donor has supported (post donations only)
const trackCampaignSupport = async (donorId: any, postId: any, excludeDonationId: any) => {
  const priorCount = await Donation.countDocuments({
    donor: donorId,
    post: postId,
    paymentStatus: 'success',
    _id: { $ne: excludeDonationId },
  });
  if (priorCount === 0) {
    await User.findByIdAndUpdate(donorId, { $inc: { campaignsSupported: 1 } });
  }
};

// Helper: check and trigger milestone notifications
const checkMilestones = async (post: any, donorName: string) => {
  const progress = post.targetAmount > 0
    ? Math.round((post.amountRaised / post.targetAmount) * 100)
    : 0;

  const milestones = [25, 50, 75, 100];
  const reached = post.milestonesReached || [];

  for (const milestone of milestones) {
    if (progress >= milestone && !reached.includes(milestone)) {
      post.milestonesReached.push(milestone);

      const donorIds = await Donation.distinct('donor', {
        post: post._id,
        paymentStatus: 'success',
      });

      const isComplete = milestone === 100;
      const notifType = isComplete ? 'campaign_completed' : 'campaign_milestone';
      const title = isComplete
        ? `🎉 "${post.title}" reached its goal!`
        : `"${post.title}" is now ${milestone}% funded!`;
      const message = isComplete
        ? `Amazing news! The fundraiser has reached its target of ₵${post.targetAmount.toLocaleString()}. Thank you for your support!`
        : `The campaign has reached ${milestone}% of its ₵${post.targetAmount.toLocaleString()} goal. Keep sharing!`;

      if (donorIds.length > 0) {
        const notifications = donorIds.map((donorId: any) => ({
          recipient: donorId,
          type: notifType,
          title,
          message,
          relatedPost: post._id,
        }));
        await Notification.insertMany(notifications);
      }

      await Notification.create({
        recipient: post.author,
        type: notifType,
        title: isComplete
          ? `🎉 Your fundraiser "${post.title}" reached its goal!`
          : `Your fundraiser is ${milestone}% funded!`,
        message,
        relatedPost: post._id,
      });

      await CampaignUpdate.create({
        post: post._id,
        author: post.author,
        content: isComplete
          ? `🎉 Campaign goal reached! ₵${post.amountRaised.toLocaleString()} raised from ${post.donorsCount} donors.`
          : `${milestone}% milestone reached! ₵${post.amountRaised.toLocaleString()} raised so far.`,
        type: isComplete ? 'completion' : 'milestone',
      });
    }
  }

  await post.save();
};

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// @desc    Initialize a donation payment
// @route   POST /api/donations/initialize
export const initializeDonation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    const { amount, type, postId, message, isAnonymous } = req.body;

    if (type === 'post') {
      if (!postId) {
        res.status(400).json({ message: 'Post ID is required for post donations' });
        return;
      }
      const post = await Post.findById(postId);
      if (!post || post.status !== 'approved') {
        res.status(404).json({ message: 'Post not found or not approved' });
        return;
      }
    }

    const reference = `HFG_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    const donation = await Donation.create({
      donor: req.user?._id,
      post: type === 'post' ? postId : undefined,
      amount,
      type,
      paymentRef: reference,
      paymentStatus: 'pending',
      message: message || '',
      isAnonymous: isAnonymous || false,
    });

    const paystackResponse = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: req.user?.email,
        amount: Math.round(amount * 100),
        reference,
        callback_url: `${process.env.CLIENT_URL}/donations?reference=${reference}`,
        metadata: {
          donationId: donation._id.toString(),
          type,
          postId: postId || null,
          donorId: req.user?._id?.toString(),
        },
      }),
    });

    const paystackData = (await paystackResponse.json()) as PaystackInitializeResponse;

    if (!paystackData.status) {
      await Donation.findByIdAndDelete(donation._id);
      res.status(400).json({ message: 'Payment initialization failed', error: paystackData.message });
      return;
    }

    res.json({
      message: 'Payment initialized',
      authorization_url: paystackData.data.authorization_url,
      reference,
      donationId: donation._id,
    });
  } catch (error: any) {
    console.error('Initialize donation error:', error);
    res.status(500).json({ message: 'Error initializing payment' });
  }
};

// @desc    Verify payment
// @route   GET /api/donations/verify/:reference
export const verifyDonation = async (req: Request, res: Response): Promise<void> => {
  try {
    const reference = String(req.params.reference);

    const paystackResponse = await fetch(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
    );

    const paystackData = (await paystackResponse.json()) as PaystackVerifyResponse;

    const donation = await Donation.findOne({ paymentRef: reference });
    if (!donation) {
      res.status(404).json({ message: 'Donation not found' });
      return;
    }

    if (donation.paymentStatus === 'success') {
      res.json({ message: 'Payment already verified', donation });
      return;
    }

    if (paystackData.status && paystackData.data.status === 'success') {
      donation.paymentStatus = 'success';
      donation.transactionId = paystackData.data.id.toString();
      await donation.save();

      if (donation.type === 'post' && donation.post) {
        const post = await Post.findById(donation.post);
        if (post) {
          post.amountRaised += donation.amount;
          post.donorsCount += 1;
          if (post.amountRaised >= post.targetAmount) {
            post.status = 'completed';
          }
          await post.save();

          await checkMilestones(post, 'A supporter');
          await trackCampaignSupport(donation.donor, donation.post, donation._id);

          const donor = await User.findById(donation.donor);
          const donorDisplay = donation.isAnonymous ? 'Anonymous' : (donor?.name || 'Someone');
          await Notification.create({
            recipient: post.author,
            type: 'donation_received',
            title: 'New donation received!',
            message: `${donorDisplay} donated ₵${donation.amount.toLocaleString()} to "${post.title}"${donation.message ? ` — "${donation.message}"` : ''}`,
            relatedPost: post._id,
            relatedDonation: donation._id,
            relatedUser: donation.isAnonymous ? undefined : donation.donor,
          });
        }
      }

      if (donation.type === 'platform') {
        let fund = await PlatformFund.findOne();
        if (!fund) {
          fund = await PlatformFund.create({ totalBalance: 0, totalReceived: 0, totalAllocated: 0 });
        }
        fund.totalBalance += donation.amount;
        fund.totalReceived += donation.amount;
        await fund.save();
      }

      await User.findByIdAndUpdate(donation.donor, { $inc: { totalDonated: donation.amount } });
      await awardBadges(donation.donor);

      res.json({ message: 'Payment verified successfully', donation });
    } else {
      donation.paymentStatus = 'failed';
      await donation.save();
      res.status(400).json({ message: 'Payment verification failed', donation });
    }
  } catch (error) {
    console.error('Verify donation error:', error);
    res.status(500).json({ message: 'Error verifying payment' });
  }
};

// @desc    Paystack webhook — handles one-off charges, recurring first-charge,
//          recurring renewal charges, and subscription lifecycle events.
// @route   POST /api/donations/webhook
export const paystackWebhook = async (req: Request, res: Response): Promise<void> => {
  try {
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY as string)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      res.status(401).json({ message: 'Invalid signature' });
      return;
    }

    const event = req.body;

    // ---- Subscription created: link the Paystack subscription to our record ----
    if (event.event === 'subscription.create') {
      const planCode = event.data?.plan?.plan_code;
      if (planCode) {
        await RecurringDonation.findOneAndUpdate(
          { paystackPlanCode: planCode },
          {
            paystackSubscriptionCode: event.data.subscription_code || '',
            paystackEmailToken: event.data.email_token || '',
            nextChargeDate: event.data.next_payment_date ? new Date(event.data.next_payment_date) : undefined,
          }
        );
      }
    }

    if (event.event === 'charge.success') {
      const reference = event.data.reference;
      const donation = await Donation.findOne({ paymentRef: reference });

      if (donation && donation.paymentStatus !== 'success') {
        // Normal one-off charge OR the FIRST charge of a recurring plan
        donation.paymentStatus = 'success';
        donation.transactionId = event.data.id.toString();
        await donation.save();

        if (donation.type === 'post' && donation.post) {
          const post = await Post.findById(donation.post);
          if (post) {
            post.amountRaised += donation.amount;
            post.donorsCount += 1;
            if (post.amountRaised >= post.targetAmount) {
              post.status = 'completed';
            }
            await post.save();
            await checkMilestones(post, 'A supporter');
            await trackCampaignSupport(donation.donor, donation.post, donation._id);

            await Notification.create({
              recipient: post.author,
              type: 'donation_received',
              title: 'New donation received!',
              message: `Someone donated ₵${donation.amount.toLocaleString()} to "${post.title}"`,
              relatedPost: post._id,
              relatedDonation: donation._id,
            });
          }
        }

        if (donation.type === 'platform') {
          await PlatformFund.findOneAndUpdate(
            {},
            { $inc: { totalBalance: donation.amount, totalReceived: donation.amount } },
            { upsert: true }
          );
        }

        await User.findByIdAndUpdate(donation.donor, { $inc: { totalDonated: donation.amount } });
        await awardBadges(donation.donor);
      } else if (!donation && event.data.plan && event.data.plan.plan_code) {
        // No local Donation for this reference — this is a RENEWAL charge
        // on an existing subscription (Paystack generates its own reference).
        const recurring = await RecurringDonation.findOne({
          paystackPlanCode: event.data.plan.plan_code,
          status: 'active',
        });

        if (recurring) {
          recurring.totalCharged += recurring.amount;
          recurring.chargeCount += 1;
          await recurring.save();

          if (recurring.type === 'post' && recurring.post) {
            const post = await Post.findById(recurring.post);
            if (post) {
              post.amountRaised += recurring.amount;
              post.donorsCount += 1;
              if (post.amountRaised >= post.targetAmount) post.status = 'completed';
              await post.save();
              await checkMilestones(post, 'A recurring supporter');
            }
          }
          if (recurring.type === 'platform') {
            await PlatformFund.findOneAndUpdate(
              {},
              { $inc: { totalBalance: recurring.amount, totalReceived: recurring.amount } },
              { upsert: true }
            );
          }

          await User.findByIdAndUpdate(recurring.donor, { $inc: { totalDonated: recurring.amount } });
          await awardBadges(recurring.donor);

          await Donation.create({
            donor: recurring.donor,
            post: recurring.type === 'post' ? recurring.post : undefined,
            amount: recurring.amount,
            type: recurring.type,
            paymentRef: event.data.reference,
            paymentStatus: 'success',
            transactionId: event.data.id?.toString() || '',
            message: `Recurring ${recurring.frequency} donation`,
          });
        }
      }
    }

    // ---- Subscription disabled/not renewed ----
    if (event.event === 'subscription.disable' || event.event === 'invoice.payment_failed') {
      const planCode = event.data?.plan?.plan_code || event.data?.subscription?.plan?.plan_code;
      if (planCode) {
        await RecurringDonation.findOneAndUpdate(
          { paystackPlanCode: planCode },
          { status: event.event === 'subscription.disable' ? 'cancelled' : 'paused' }
        );
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(200); // Always return 200 to Paystack
  }
};

// @desc    Get user's donation history
// @route   GET /api/donations/my
export const getMyDonations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [donations, total, totalDonated] = await Promise.all([
      Donation.find({ donor: req.user?._id, paymentStatus: 'success' })
        .populate('post', 'title images targetAmount amountRaised')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Donation.countDocuments({ donor: req.user?._id, paymentStatus: 'success' }),
      Donation.aggregate([
        { $match: { donor: req.user?._id, paymentStatus: 'success' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    res.json({
      donations,
      totalDonated: totalDonated[0]?.total || 0,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching donations' });
  }
};

// @desc    Get donations for a post
// @route   GET /api/donations/post/:postId
export const getPostDonations = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [donations, total] = await Promise.all([
      Donation.find({ post: req.params.postId, paymentStatus: 'success' })
        .populate('donor', 'name avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Donation.countDocuments({ post: req.params.postId, paymentStatus: 'success' }),
    ]);

    const sanitized = donations.map((d) => {
      const obj = d.toObject();
      if (obj.isAnonymous) {
        obj.donor = { name: 'Anonymous', avatar: '' } as any;
      }
      return obj;
    });

    res.json({
      donations: sanitized,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching donations' });
  }
};

// @desc    Get platform donation stats
// @route   GET /api/donations/stats
export const getDonationStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [stats] = await Donation.aggregate([
      { $match: { paymentStatus: 'success' } },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          totalDonations: { $sum: 1 },
          uniqueDonors: { $addToSet: '$donor' },
        },
      },
      {
        $project: {
          _id: 0,
          totalAmount: 1,
          totalDonations: 1,
          uniqueDonors: { $size: '$uniqueDonors' },
        },
      },
    ]);

    const recentDonations = await Donation.find({ paymentStatus: 'success' })
      .populate('donor', 'name avatar')
      .populate('post', 'title')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      stats: stats || { totalAmount: 0, totalDonations: 0, uniqueDonors: 0 },
      recentDonations,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stats' });
  }
};
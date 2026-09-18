import { Response } from 'express';
import crypto from 'crypto';
import RecurringDonation from '../models/RecurringDonation';
import Post from '../models/Post';
import { AuthRequest } from '../middleware/auth';

interface PaystackPlanResponse {
  status: boolean;
  message: string;
  data: {
    plan_code: string;
    [key: string]: any;
  };
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
    [key: string]: any;
  };
}

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// @desc    Start a recurring (weekly/monthly) donation
// @route   POST /api/recurring-donations/initialize
export const initializeRecurringDonation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { amount, type, postId, frequency } = req.body;

    if (!amount || amount < 0.5) {
      res.status(400).json({ message: 'Minimum recurring donation is GHS 0.50' });
      return;
    }
    if (!['post', 'platform'].includes(type)) {
      res.status(400).json({ message: 'Invalid donation type' });
      return;
    }

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

    const freq = frequency === 'weekly' ? 'weekly' : 'monthly';

    // 1. Create a Paystack Plan for this amount/frequency
    const planRes = await fetch(`${PAYSTACK_BASE_URL}/plan`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `HFG ${type === 'platform' ? 'Platform' : 'Post'} ${freq} GHS ${amount}`,
        amount: Math.round(amount * 100),
        interval: freq,
      }),
    });
    const planData = (await planRes.json()) as PaystackPlanResponse;

    if (!planData.status) {
      res.status(400).json({ message: 'Could not create recurring plan', error: planData.message });
      return;
    }

    const planCode = planData.data.plan_code;

    // 2. Create local recurring donation record
    const recurring = await RecurringDonation.create({
      donor: req.user?._id,
      post: type === 'post' ? postId : undefined,
      amount,
      type,
      frequency: freq,
      paystackPlanCode: planCode,
      status: 'active',
    });

    const reference = `HFG_REC_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

    // 3. Initialize the first transaction attached to the plan.
    //    Paystack auto-creates a subscription once this first charge succeeds.
    const txRes = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: req.user?.email,
        amount: Math.round(amount * 100),
        plan: planCode,
        reference,
        callback_url: `${process.env.CLIENT_URL}/donations?reference=${reference}`,
        metadata: {
          recurringDonationId: recurring._id.toString(),
          type,
          postId: postId || null,
          donorId: req.user?._id.toString(),
        },
      }),
    });
    const txData = (await txRes.json()) as PaystackInitializeResponse;

    if (!txData.status) {
      await RecurringDonation.findByIdAndDelete(recurring._id);
      res.status(400).json({ message: 'Payment initialization failed', error: txData.message });
      return;
    }

    res.json({
      message: 'Recurring donation initialized',
      authorization_url: txData.data.authorization_url,
      reference,
      recurringDonationId: recurring._id,
    });
  } catch (error) {
    console.error('Initialize recurring donation error:', error);
    res.status(500).json({ message: 'Error setting up recurring donation' });
  }
};

// @desc    Get current user's recurring donations
// @route   GET /api/recurring-donations/my
export const getMyRecurringDonations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const recurring = await RecurringDonation.find({ donor: req.user?._id })
      .populate('post', 'title images')
      .sort({ createdAt: -1 });
    res.json({ recurring });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching recurring donations' });
  }
};

// @desc    Cancel a recurring donation
// @route   PUT /api/recurring-donations/:id/cancel
export const cancelRecurringDonation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const recurring = await RecurringDonation.findOne({ _id: req.params.id, donor: req.user?._id });
    if (!recurring) {
      res.status(404).json({ message: 'Recurring donation not found' });
      return;
    }

    if (recurring.paystackSubscriptionCode) {
      await fetch(`${PAYSTACK_BASE_URL}/subscription/disable`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: recurring.paystackSubscriptionCode,
          token: recurring.paystackEmailToken,
        }),
      });
    }

    recurring.status = 'cancelled';
    await recurring.save();

    res.json({ message: 'Recurring donation cancelled', recurring });
  } catch (error) {
    console.error('Cancel recurring donation error:', error);
    res.status(500).json({ message: 'Error cancelling recurring donation' });
  }
};
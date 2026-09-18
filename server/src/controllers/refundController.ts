import { Response } from 'express';
import Refund from '../models/Refund';
import Donation from '../models/Donation';
import User from '../models/User';
import Post from '../models/Post';
import PlatformFund from '../models/PlatformFund';
import Notification from '../models/Notification';
import { AuthRequest } from '../middleware/auth';

interface PaystackRefundResponse {
  status: boolean;
  message: string;
  data?: {
    id: number;
    transaction: number | string;
    status: string;
    [key: string]: any;
  };
}

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// @desc    Request a refund for a donation
// @route   POST /api/refunds
export const requestRefund = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { donationId, reason } = req.body;
    if (!reason || !reason.trim()) {
      res.status(400).json({ message: 'A reason is required' });
      return;
    }

    const donation = await Donation.findById(donationId);
    if (!donation) {
      res.status(404).json({ message: 'Donation not found' });
      return;
    }
    if (donation.donor.toString() !== req.user?._id.toString()) {
      res.status(403).json({ message: 'You can only request a refund for your own donation' });
      return;
    }
    if (donation.paymentStatus !== 'success') {
      res.status(400).json({ message: 'Only successful donations can be refunded' });
      return;
    }

    const existing = await Refund.findOne({ donation: donationId, status: { $in: ['pending', 'approved'] } });
    if (existing) {
      res.status(400).json({ message: 'A refund request for this donation is already in progress' });
      return;
    }

    const refund = await Refund.create({ donation: donationId, requestedBy: req.user?._id, reason });

    res.status(201).json({ message: 'Refund request submitted for review', refund });
  } catch (error) {
    console.error('Request refund error:', error);
    res.status(500).json({ message: 'Error requesting refund' });
  }
};

// @desc    Get current user's refund requests
// @route   GET /api/refunds/my
export const getMyRefunds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const refunds = await Refund.find({ requestedBy: req.user?._id })
      .populate({ path: 'donation', populate: { path: 'post', select: 'title' } })
      .sort({ createdAt: -1 });
    res.json({ refunds });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching refunds' });
  }
};

// @desc    Get all refund requests (admin)
// @route   GET /api/refunds
export const getAllRefunds = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};
    if (req.query.status && req.query.status !== 'all') filter.status = req.query.status;

    const [refunds, total] = await Promise.all([
      Refund.find(filter)
        .populate({ path: 'donation', populate: { path: 'post', select: 'title' } })
        .populate('requestedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Refund.countDocuments(filter),
    ]);

    res.json({ refunds, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching refunds' });
  }
};

// @desc    Approve/reject/process a refund (admin)
// @route   PUT /api/refunds/:id/status
export const updateRefundStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, adminNotes } = req.body;
    if (!['pending', 'approved', 'processed', 'rejected'].includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const refund = await Refund.findById(req.params.id).populate('donation');
    if (!refund) {
      res.status(404).json({ message: 'Refund not found' });
      return;
    }
    const donation: any = refund.donation;

    if (status === 'processed' && refund.status !== 'processed') {
      const refundRes = await fetch(`${PAYSTACK_BASE_URL}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transaction: donation.paymentRef }),
      });
      const refundData = (await refundRes.json()) as PaystackRefundResponse;
      if (!refundData.status) {
        res.status(400).json({ message: 'Paystack refund failed', error: refundData.message });
        return;
      }

      if (donation.type === 'post' && donation.post) {
        await Post.findByIdAndUpdate(donation.post, {
          $inc: { amountRaised: -donation.amount, donorsCount: -1 },
        });
      }
      if (donation.type === 'platform') {
        await PlatformFund.findOneAndUpdate(
          {},
          { $inc: { totalBalance: -donation.amount, totalReceived: -donation.amount } }
        );
      }
      await User.findByIdAndUpdate(donation.donor, { $inc: { totalDonated: -donation.amount } });

      await Notification.create({
        recipient: donation.donor,
        type: 'refund',
        title: '↩️ Your refund has been processed',
        message: `GHS ${donation.amount.toFixed(2)} has been refunded to your original payment method.`,
      });
    }

    refund.status = status;
    if (adminNotes) refund.adminNotes = adminNotes;
    refund.processedBy = req.user?._id;
    refund.processedAt = new Date();
    await refund.save();

    res.json({ message: `Refund ${status}`, refund });
  } catch (error) {
    console.error('Update refund status error:', error);
    res.status(500).json({ message: 'Error updating refund' });
  }
};
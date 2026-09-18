import { Response } from 'express';
import Donation from '../models/Donation';
import { AuthRequest } from '../middleware/auth';

// @desc    Get a printable receipt for a donation
// @route   GET /api/donations/:id/receipt
export const getReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate('donor', 'name email')
      .populate('post', 'title');

    if (!donation) {
      res.status(404).json({ message: 'Donation not found' });
      return;
    }

    // Only the donor themselves (or an admin) can view the receipt
    const donorId = (donation.donor as any)?._id?.toString();
    if (donorId !== req.user?._id.toString() && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized to view this receipt' });
      return;
    }

    if (donation.paymentStatus !== 'success') {
      res.status(400).json({ message: 'Receipt is only available for successful donations' });
      return;
    }

    const receipt = {
      receiptNumber: `HFG-${donation._id.toString().slice(-8).toUpperCase()}`,
      donorName: donation.isAnonymous ? 'Anonymous Donor' : (donation.donor as any)?.name || 'Anonymous',
      donorEmail: donation.isAnonymous ? '' : (donation.donor as any)?.email || '',
      amount: donation.amount,
      currency: donation.currency,
      campaignTitle:
        donation.type === 'platform'
          ? 'HelpFund GH Platform Fund'
          : (donation.post as any)?.title || 'Help Post',
      type: donation.type,
      transactionId: donation.transactionId,
      paymentRef: donation.paymentRef,
      date: donation.createdAt,
      platformName: 'HelpFund GH',
    };

    res.json({ receipt });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({ message: 'Error generating receipt' });
  }
};
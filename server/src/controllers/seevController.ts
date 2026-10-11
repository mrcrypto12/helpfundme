import crypto from 'crypto';
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Donation from '../models/Donation';
import Post from '../models/Post';
import { pool } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { createSeevCheckout, settleSeevDonation, validSeevWebhook, verifySeevSession } from '../services/seev';

export const initializeSeevDonation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) { res.status(400).json({ message: 'Validation failed', errors: errors.array() }); return; }
    const { amount, type, postId, message, isAnonymous } = req.body;
    if (type === 'post') {
      const post = await Post.findById(postId);
      if (!post || post.status !== 'approved' || !post.isActive) {
        res.status(404).json({ message: 'Campaign is not approved for donations' }); return;
      }
    }
    const donation = await Donation.create({
      donor: req.user?._id, post: type === 'post' ? postId : undefined,
      amount, currency: 'GHS', type, paymentProvider: 'seev',
      paymentRef: `HFG_PENDING_${crypto.randomUUID()}`, paymentStatus: 'pending',
      message: message || '', isAnonymous: isAnonymous === true,
    });
    try {
      const session = await createSeevCheckout(donation, req.user);
      donation.paymentRef = session.reference;
      await donation.save();
      res.json({ message: 'Payment initialized', authorization_url: session.checkout_url, reference: session.reference, donationId: donation._id });
    } catch (error) {
      // Leave an uncertain checkout pending for reconciliation. Do not delete a
      // payment record when an upstream timeout might still have created it.
      console.error('Seev checkout error:', error);
      res.status(502).json({ message: 'Could not start checkout. Please wait before retrying.' });
    }
  } catch (error) {
    console.error('Initialize Seev donation error:', error);
    res.status(500).json({ message: 'Error initializing donation' });
  }
};

export const verifySeevDonation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const reference = String(req.params.reference);
    const donation = await Donation.findOne({ paymentRef: reference, paymentProvider: 'seev' });
    if (!donation) { res.status(404).json({ message: 'Donation not found' }); return; }
    if (String(donation.donor) !== String(req.user?._id) && req.user?.role !== 'admin') {
      res.status(403).json({ message: 'Not authorized to verify this donation' }); return;
    }
    if (donation.paymentStatus === 'success') { res.json({ message: 'Already verified', donation }); return; }
    const session = await verifySeevSession(reference);
    if (['completed', 'success'].includes(session.status)) {
      const paid = await settleSeevDonation(session);
      res.json({ message: 'Payment verified', donation: paid });
    } else {
      res.status(202).json({ message: 'Payment has not been confirmed', status: session.status, donation });
    }
  } catch (error) {
    console.error('Verify Seev donation error:', error);
    res.status(502).json({ message: 'Payment status is unknown. Please check again shortly.' });
  }
};

export const seevWebhook = async (req: Request, res: Response): Promise<void> => {
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!validSeevWebhook(rawBody, req.get('x-seev-timestamp') || '', req.get('x-seev-signature') || '')) {
    res.status(401).json({ message: 'Invalid webhook signature' }); return;
  }
  const event = req.body;
  const tx = event?.data?.transaction;
  if (event.env !== process.env.SEEV_ENV || tx?.env !== process.env.SEEV_ENV || tx?.currency !== 'GHS' ||
      !tx?.reference || !['payment.succeeded', 'payment.failed'].includes(event.event)) {
    res.status(400).json({ message: 'Invalid webhook event' }); return;
  }
  try {
    if (event.event === 'payment.succeeded' && tx.status === 'completed') {
      await settleSeevDonation({
        reference: tx.reference, status: tx.status, amount: Math.round(tx.amount * 100),
        final_amount: Math.round(tx.amount * 100), currency: tx.currency, id: tx.id,
      });
    } else if (event.event === 'payment.failed' && ['failed', 'cancelled'].includes(tx.status)) {
      await pool.query(
        "UPDATE app_records SET data=jsonb_set(data,'{paymentStatus}','\"failed\"'::jsonb),updated_at=NOW() WHERE collection='donations' AND data->>'paymentRef'=$1 AND data->>'paymentProvider'='seev' AND data->>'paymentStatus'='pending'",
        [tx.reference]
      );
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('Seev webhook processing error:', error);
    res.sendStatus(503);
  }
};

import { Router, Request, Response } from 'express';
import { protect } from '../middleware/auth';
import { donationLimiter } from '../middleware/rateLimiter';
import { donationValidation } from '../middleware/validate';
import {
  initializeDonation,
  verifyDonation,
  paystackWebhook,
  getMyDonations,
  getPostDonations,
  getDonationStats,
} from '../controllers/donationController';
import { getReceipt } from '../controllers/receiptController';
import { initializeSeevDonation, verifySeevDonation, seevWebhook } from '../controllers/seevController';

const router = Router();

// Paystack webhook — no auth (verified by signature)
router.post('/webhook', (req, res) => process.env.PAYMENT_PROVIDER === 'paystack' ? paystackWebhook(req, res) : res.sendStatus(404));
router.post('/seev-webhook', (req, res) => process.env.PAYMENT_PROVIDER !== 'paystack' ? seevWebhook(req, res) : res.sendStatus(404));

// Public routes
router.get('/stats', getDonationStats);
router.get('/post/:postId', getPostDonations);
router.post('/verify/:reference', protect, donationLimiter, (req, res) =>
  process.env.PAYMENT_PROVIDER === 'paystack' ? verifyDonation(req, res) : verifySeevDonation(req, res));

// Protected routes
router.post('/initialize', protect, donationLimiter, donationValidation, (req: Request, res: Response) =>
  process.env.PAYMENT_PROVIDER === 'paystack' ? initializeDonation(req, res) : initializeSeevDonation(req, res));
router.get('/my', protect, getMyDonations);
router.get('/:id/receipt', protect, getReceipt);

export default router;

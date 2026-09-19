import { Router } from 'express';
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

const router = Router();

// Paystack webhook — no auth (verified by signature)
router.post('/webhook', paystackWebhook);

// Public routes
router.get('/stats', getDonationStats);
router.get('/post/:postId', getPostDonations);
router.post('/verify/:reference', protect, donationLimiter, verifyDonation);

// Protected routes
router.post('/initialize', protect, donationLimiter, donationValidation, initializeDonation);
router.get('/my', protect, getMyDonations);
router.get('/:id/receipt', protect, getReceipt);

export default router;

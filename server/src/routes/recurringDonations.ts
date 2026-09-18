import { Router } from 'express';
import { protect } from '../middleware/auth';
import { donationLimiter } from '../middleware/rateLimiter';
import {
  initializeRecurringDonation,
  getMyRecurringDonations,
  cancelRecurringDonation,
} from '../controllers/recurringDonationController';

const router = Router();

router.post('/initialize', protect, donationLimiter, initializeRecurringDonation);
router.get('/my', protect, getMyRecurringDonations);
router.put('/:id/cancel', protect, cancelRecurringDonation);

export default router;
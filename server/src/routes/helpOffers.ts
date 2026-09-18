import { Router } from 'express';
import { protect } from '../middleware/auth';
import { updateHelpOfferStatus } from '../controllers/helpOfferController';

const router = Router();

router.put('/:id/status', protect, updateHelpOfferStatus);

export default router;
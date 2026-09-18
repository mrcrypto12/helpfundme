import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  requestRefund,
  getMyRefunds,
  getAllRefunds,
  updateRefundStatus,
} from '../controllers/refundController';

const router = Router();

router.post('/', protect, requestRefund);
router.get('/my', protect, getMyRefunds);
router.get('/', protect, authorize('admin'), getAllRefunds);
router.put('/:id/status', protect, authorize('admin'), updateRefundStatus);

export default router;
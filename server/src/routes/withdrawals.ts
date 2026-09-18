import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import {
  requestWithdrawal,
  getMyWithdrawals,
  getAllWithdrawals,
  updateWithdrawalStatus,
} from '../controllers/withdrawalController';

const router = Router();

router.post('/', protect, requestWithdrawal);
router.get('/my', protect, getMyWithdrawals);
router.get('/', protect, authorize('admin'), getAllWithdrawals);
router.put('/:id/status', protect, authorize('admin'), updateWithdrawalStatus);

export default router;
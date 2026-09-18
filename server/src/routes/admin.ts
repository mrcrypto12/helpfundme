import { Router } from 'express';
import { protect, authorize } from '../middleware/auth';
import { allocateFundsValidation } from '../middleware/validate';
import {
  getAdminStats,
  getAllPosts,
  getPostDetailAdmin,
  updatePostStatus,
  getAllUsers,
  verifyUserIdentity,
  getAllDonations,
  getPlatformFund,
  allocateFunds,
} from '../controllers/adminController';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/posts', getAllPosts);
router.get('/posts/:id', getPostDetailAdmin);
router.put('/posts/:id/status', updatePostStatus);
router.get('/users', getAllUsers);
router.put('/users/:id/verify', verifyUserIdentity);
router.get('/donations', getAllDonations);
router.get('/funds', getPlatformFund);
router.post('/funds/allocate', allocateFundsValidation, allocateFunds);

export default router;
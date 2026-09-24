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
  getUserDetail,
  downloadUserDocument,
  downloadPostEvidence,
  getCampaignReports,
  toggleUserAccount,
} from '../controllers/adminController';

const router = Router();

router.use(protect, authorize('admin'));

router.get('/stats', getAdminStats);
router.get('/posts', getAllPosts);
router.get('/posts/:id', getPostDetailAdmin);
router.get('/posts/:id/evidence/:index', downloadPostEvidence);
router.put('/posts/:id/status', updatePostStatus);
router.get('/users', getAllUsers);
router.get('/users/:id', getUserDetail);
router.get('/users/:id/documents/:index', downloadUserDocument);
router.put('/users/:id/verify', verifyUserIdentity);
router.put('/users/:id/account-status', toggleUserAccount);
router.get('/donations', getAllDonations);
router.get('/funds', getPlatformFund);
router.post('/funds/allocate', allocateFundsValidation, allocateFunds);
router.get('/reports', getCampaignReports);

export default router;

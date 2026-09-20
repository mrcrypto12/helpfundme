import { Router } from 'express';
import { protect, optionalAuth } from '../middleware/auth';
import { postCreationLimiter, uploadLimiter } from '../middleware/rateLimiter';
import { createPostValidation, commentValidation } from '../middleware/validate';
import upload from '../middleware/upload';
import verificationUpload from '../middleware/verificationUpload';
import {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  toggleLike,
  getComments,
  addComment,
  getMyPosts,
  getRegionStats,
  reportCampaign,
} from '../controllers/postController';
import {
  addCampaignUpdate,
  getCampaignUpdates,
  thankDonors,
} from '../controllers/campaignUpdateController';
import {
  inviteCoOrganizer,
  respondToInvite,
  removeCoOrganizer,
} from '../controllers/coOrganizerController';
import {
  createHelpOffer,
  getHelpOffers,
} from '../controllers/helpOfferController';

const router = Router();

// Public routes — specific paths BEFORE the /:id catch-all
router.get('/stats/regions', getRegionStats);
router.get('/my/posts', protect, getMyPosts);
router.get('/', optionalAuth, getPosts);
router.get('/:id', optionalAuth, getPost);
router.get('/:id/comments', getComments);
router.get('/:id/updates', getCampaignUpdates);

// Protected routes
router.post(
  '/',
  protect,
  postCreationLimiter,
  verificationUpload.fields([{ name: 'images', maxCount: 5 }, { name: 'evidence', maxCount: 8 }, { name: 'identityDocuments', maxCount: 4 }]),
  createPostValidation,
  createPost
);

router.put(
  '/:id',
  protect,
  uploadLimiter,
  upload.array('images', 5),
  updatePost
);

router.delete('/:id', protect, deletePost);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/comments', protect, commentValidation, addComment);
router.post('/:id/updates', protect, addCampaignUpdate);
router.post('/:id/thank-donors', protect, thankDonors);
router.post('/:id/report', protect, reportCampaign);

// Co-organizers
router.post('/:id/co-organizers', protect, inviteCoOrganizer);
router.put('/:id/co-organizers/respond', protect, respondToInvite);
router.delete('/:id/co-organizers/:userId', protect, removeCoOrganizer);

// Help offers
router.post('/:id/help-offers', protect, createHelpOffer);
router.get('/:id/help-offers', protect, getHelpOffers);

export default router;

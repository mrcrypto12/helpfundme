import { Router } from 'express';
import passport from '../config/passport';
import { protect } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { registerValidation, loginValidation } from '../middleware/validate';
import {
  register,
  login,
  refreshAccessToken,
  googleCallback,
  getMe,
  updateProfile,
  logout,
} from '../controllers/authController';

const router = Router();

// Public auth routes (rate limited)
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/refresh', refreshAccessToken);

// Google OAuth routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  googleCallback
);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/logout', protect, logout);

export default router;

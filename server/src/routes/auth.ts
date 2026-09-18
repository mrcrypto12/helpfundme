import { Router } from 'express';
import { randomBytes, timingSafeEqual } from 'crypto';
import passport from '../config/passport';
import { optionalAuth, protect } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimiter';
import { registerValidation, loginValidation } from '../middleware/validate';
import {
  register,
  login,
  refreshAccessToken,
  googleCallback,
  getMe,
  getSession,
  updateProfile,
  logout,
} from '../controllers/authController';

const router = Router();
const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
const oauthStateCookie = 'googleOAuthState';
const oauthStateCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 10 * 60 * 1000,
  path: '/api/auth/google/callback',
};

// Public auth routes (rate limited)
router.post('/register', authLimiter, registerValidation, register);
router.post('/login', authLimiter, loginValidation, login);
router.post('/refresh', refreshAccessToken);
router.get('/session', optionalAuth, getSession);

// Google OAuth routes
router.get(
  '/google',
  (req, res, next) => {
    const state = randomBytes(32).toString('hex');
    res.cookie(oauthStateCookie, state, oauthStateCookieOptions);
    passport.authenticate('google', { scope: ['profile', 'email'], state })(req, res, next);
  }
);

router.get(
  '/google/callback',
  (req, res, next) => {
    const expected = req.cookies?.[oauthStateCookie];
    const received = typeof req.query.state === 'string' ? req.query.state : '';
    res.clearCookie(oauthStateCookie, oauthStateCookieOptions);

    const valid =
      typeof expected === 'string' &&
      expected.length === received.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(received));
    if (!valid) {
      res.redirect(`${clientUrl}/login?error=invalid_oauth_state`);
      return;
    }
    next();
  },
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${clientUrl}/login?error=google_auth_failed`,
  }),
  googleCallback
);

// Protected routes
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/logout', protect, logout);

export default router;

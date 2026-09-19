import { createHash } from 'crypto';
import { CookieOptions, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token';

const isProduction = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';
const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
};
const accessCookieOptions: CookieOptions = { ...baseCookieOptions, maxAge: 15 * 60 * 1000 };
const refreshCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth/refresh',
};
const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

// @desc    Register new user
// @route   POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'An account with this email already exists' });
      return;
    }

    // Create user
    const user = await User.create({ name, email, password });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    user.refreshToken = hashToken(refreshToken);
    await user.save();

    // Set cookies
    res.cookie('accessToken', accessToken, accessCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    res.status(201).json({
      message: 'Account created successfully',
      user: user.toJSON(),
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    const { email, password } = req.body;

    // Find user with password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Check if user has a password (might be Google-only user)
    if (!user.password) {
      res.status(401).json({
        message: 'This account uses Google Sign-In. Please sign in with Google.',
      });
      return;
    }

    // Verify password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid email or password' });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    user.refreshToken = hashToken(refreshToken);
    await user.save();

    // Set cookies
    res.cookie('accessToken', accessToken, accessCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const token = req.cookies?.refreshToken;

    if (!token) {
      res.status(401).json({ message: 'No refresh token provided' });
      return;
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== hashToken(token)) {
      res.status(401).json({ message: 'Invalid refresh token' });
      return;
    }

    // Generate new tokens (rotation)
    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    // Update stored refresh token
    user.refreshToken = hashToken(newRefreshToken);
    await user.save();

    res.cookie('accessToken', accessToken, accessCookieOptions);
    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions);

    res.status(204).send();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired refresh token' });
  }
};

// @desc    Google OAuth callback handler
// @route   GET /api/auth/google/callback
export const googleCallback = async (req: AuthRequest, res: Response): Promise<void> => {
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');

  try {
    const user = req.user;
    if (!user) {
      res.redirect(`${clientUrl}/login?error=google_auth_failed`);
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Save refresh token
    user.refreshToken = hashToken(refreshToken);
    await user.save();

    // Set cookies
    res.cookie('accessToken', accessToken, accessCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions);

    // Authentication remains in HTTP-only cookies. No credential is exposed
    // in the URL, browser storage, or client-side JavaScript.
    res.redirect(`${clientUrl}/auth/callback`);
  } catch (error) {
    console.error('Google callback error:', error);
    res.redirect(`${clientUrl}/login?error=server_error`);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, bio, phone, location } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      { name, bio, phone, location },
      { new: true, runValidators: true }
    );

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user) {
      await User.findByIdAndUpdate(req.user._id, { refreshToken: '' });
    }

    res.clearCookie('accessToken', baseCookieOptions);
    res.clearCookie('refreshToken', { ...baseCookieOptions, path: '/api/auth/refresh' });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during logout' });
  }
};

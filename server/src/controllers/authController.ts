import { createHash, randomInt } from 'crypto';
import { CookieOptions, Request, Response } from 'express';
import { validationResult } from 'express-validator';
import User from '../models/User';
import { AuthRequest } from '../middleware/auth';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/token';
import { uploadSecureDocument } from '../utils/cloudinary';
import { addAudienceContact, isResendEnabled, sendVerificationEmail } from '../services/resend';
import Notification from '../models/Notification';

export const TERMS_VERSION = '2026-09-20';

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
const createEmailOtp = () => String(randomInt(100000, 1000000));
const setAndSendEmailOtp = async (user: any): Promise<string | undefined> => {
  if (!isResendEnabled()) return undefined;
  const code = createEmailOtp();
  user.emailVerificationCodeHash = hashToken(`${user._id}:${code}`);
  user.emailVerificationExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
  user.emailVerificationAttempts = 0;
  await user.save();
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'production') {
    console.log(`[DEV EMAIL OTP] ${user.email}: ${code}`);
    return process.env.EMAIL_DEV_SHOW_OTP === 'true' ? code : undefined;
  }
  await sendVerificationEmail(user.email, user.name, code);
  return undefined;
};

// @desc    Register new user
// @route   POST /api/auth/register
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: 'Validation failed', errors: errors.array() });
      return;
    }

    const { name, email, password, acceptedTerms } = req.body;
    if (acceptedTerms !== true) {
      res.status(400).json({ message: 'You must accept the Terms of Service and Privacy Notice' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'An account with this email already exists' });
      return;
    }

    // Create user
    const emailVerificationRequired = isResendEnabled();
    const user = await User.create({ name, email, password, acceptedTermsVersion: TERMS_VERSION, acceptedTermsAt: new Date(), emailVerified: !emailVerificationRequired });
    let devOtp: string | undefined;
    let emailSent = true;
    try { devOtp = await setAndSendEmailOtp(user); }
    catch (error) { emailSent = false; console.error('Initial verification email failed:', error); }
    if (emailVerificationRequired) addAudienceContact(user.email, String(user.name).split(' ')[0]).catch((error) => console.warn('Resend audience sync failed:', error.message));

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
      message: !emailVerificationRequired ? 'Account created successfully.' : emailSent ? 'Account created. Check your email for the verification code.' : 'Account created, but the verification email could not be sent. Use resend to try again.',
      user: user.toJSON(),
      emailVerificationRequired,
      ...(devOtp ? { devOtp } : {}),
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
    if (user.accountStatus === 'deactivated') {
      res.status(403).json({ message: 'This account has been deactivated. Contact support.' });
      return;
    }
    if (!isResendEnabled() && !user.emailVerified) user.emailVerified = true;

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

    if (!user || user.accountStatus === 'deactivated' || user.refreshToken !== hashToken(token)) {
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
    if (!isResendEnabled() && !user.emailVerified) {
      user.emailVerified = true;
      await user.save();
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

export const acceptTerms = async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findByIdAndUpdate(req.user?._id, { acceptedTermsVersion: TERMS_VERSION, acceptedTermsAt: new Date() }, { new: true });
  res.json({ message: 'Terms accepted', user });
};

export const resendEmailOtp = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!isResendEnabled()) { res.status(503).json({ message: 'Email verification is temporarily disabled' }); return; }
    const user = await User.findById(req.user?._id);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    if (user.emailVerified) { res.status(400).json({ message: 'Email is already verified' }); return; }
    const devOtp = await setAndSendEmailOtp(user);
    res.json({ message: 'A new verification code has been sent', ...(devOtp ? { devOtp } : {}) });
  } catch (error: any) { console.error(error); res.status(503).json({ message: 'Unable to send verification email right now' }); }
};

export const verifyEmailOtp = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isResendEnabled()) { res.status(503).json({ message: 'Email verification is temporarily disabled' }); return; }
  const user = await User.findById(req.user?._id);
  if (!user) { res.status(404).json({ message: 'User not found' }); return; }
  if (user.emailVerified) { res.json({ message: 'Email already verified', user }); return; }
  if (!/^\d{6}$/.test(String(req.body.code || ''))) { res.status(400).json({ message: 'Enter the six-digit code' }); return; }
  if (!user.emailVerificationExpiresAt || new Date(user.emailVerificationExpiresAt).getTime() < Date.now()) { res.status(400).json({ message: 'Code expired. Request a new code.' }); return; }
  user.emailVerificationAttempts = Number(user.emailVerificationAttempts || 0) + 1;
  if (user.emailVerificationAttempts > 5) { await user.save(); res.status(429).json({ message: 'Too many attempts. Request a new code.' }); return; }
  if (user.emailVerificationCodeHash !== hashToken(`${user._id}:${req.body.code}`)) { await user.save(); res.status(400).json({ message: 'Incorrect verification code' }); return; }
  user.emailVerified = true; user.emailVerificationCodeHash = ''; user.emailVerificationExpiresAt = undefined; user.emailVerificationAttempts = 0;
  await user.save();
  res.json({ message: 'Email verified successfully', user: user.toJSON() });
};

// Reserved integration point for a future SMS provider. The UI remains
// disabled until a provider is selected and credentials are configured.
export const requestPhoneOtp = async (_req: AuthRequest, res: Response): Promise<void> => {
  res.status(503).json({ message: 'SMS verification is not configured yet', code: 'SMS_PROVIDER_NOT_CONFIGURED' });
};

export const submitVerification = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    if (user.verification?.identity) {
      res.status(409).json({ message: 'Verified identity details are locked. Report an issue if a correction is required.' }); return;
    }
    const { legalName, dateOfBirth, idType, idNumber, phone } = req.body;
    if (![legalName, dateOfBirth, idType, idNumber, phone].every((v) => String(v || '').trim())) {
      res.status(400).json({ message: 'Legal name, date of birth, ID type, ID number, and phone are required' }); return;
    }
    const files = (req.files as Express.Multer.File[]) || [];
    if (!files.length && !(user.verification?.documentsList || []).length) {
      res.status(400).json({ message: 'At least one identity document is required' }); return;
    }
    const documents = [];
    for (const file of files) documents.push(await uploadSecureDocument(file, `helpfund-gh/verification/users/${user._id}`));
    user.phone = phone;
    user.verification = {
      ...(user.verification || {}), identity: false, documents: false, status: 'pending',
      legalName, dateOfBirth, idType, idNumber,
      documentsList: [...(user.verification?.documentsList || []), ...documents], adminNotes: '',
    };
    await user.save();
    res.json({ message: 'Verification submitted for review', user: user.toJSON() });
  } catch (error) { console.error(error); res.status(500).json({ message: 'Unable to submit verification' }); }
};

export const reportVerificationIssue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?._id);
    if (!user) { res.status(404).json({ message: 'User not found' }); return; }
    if (!user.verification?.identity) { res.status(400).json({ message: 'Only verified identity details can be reported here' }); return; }
    if (user.verification?.issueReportedAt) { res.status(409).json({ message: 'This issue has already been reported' }); return; }

    const admins = await User.find({ role: 'admin', accountStatus: { $ne: 'deactivated' } });
    if (!admins.length) { res.status(503).json({ message: 'No active administrator is currently available' }); return; }

    const reportedAt = new Date();
    await Notification.insertMany(admins.map((admin: any) => ({
      recipient: admin._id,
      type: 'identity_issue_reported',
      title: 'Verified identity issue reported',
      message: `${user.name} (${user.email}) reported a problem with their locked identity details. Contact the user and review their verification record.`,
      relatedUser: user._id,
      isRead: false,
    })));
    user.verification = { ...(user.verification || {}), issueReportedAt: reportedAt };
    await user.save();
    res.json({ message: 'Issue reported. An administrator has been notified.', user: user.toJSON() });
  } catch (error) {
    console.error('Report verification issue error:', error);
    res.status(500).json({ message: 'Unable to report the issue' });
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

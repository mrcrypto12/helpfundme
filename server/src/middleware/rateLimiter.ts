import rateLimit from 'express-rate-limit';

// Global rate limiter: 100 requests per 15 minutes
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth endpoints: 5 attempts per 15 minutes (brute-force protection)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message: 'Too many login attempts, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Donation endpoints: 10 per 15 minutes
export const donationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message: 'Too many donation requests, please slow down',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload: 5 per hour
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    message: 'Upload limit reached, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Post creation: 3 per hour
export const postCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    message: 'Too many posts created, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

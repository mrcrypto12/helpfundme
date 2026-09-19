import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import dotenv from 'dotenv';

import connectDB from './config/db';
import { validateEnvironment } from './config/env';
import './config/passport';

import { globalLimiter } from './middleware/rateLimiter';

import authRoutes from './routes/auth';
import postRoutes from './routes/posts';
import donationRoutes from './routes/donations';
import adminRoutes from './routes/admin';
import notificationRoutes from './routes/notifications';
import recurringDonationRoutes from './routes/recurringDonations';
import withdrawalRoutes from './routes/withdrawals';
import refundRoutes from './routes/refunds';
import helpOfferRoutes from './routes/helpOffers';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

const CLIENT_URL = (
  process.env.CLIENT_URL || 'http://localhost:5173'
).replace(/\/$/, '');

// ==================== Security Middleware ====================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'no-referrer' },
}));

// Optional origin lock. In Cloudflare add a Transform Rule that sets this
// secret header, then block direct-origin traffic at the host/firewall too.
app.use((req, res, next) => {
  const expected = process.env.CLOUDFLARE_ORIGIN_SECRET;
  if (process.env.NODE_ENV === 'production' && expected && req.get('x-origin-verify') !== expected) {
    res.status(403).json({ message: 'Direct origin access is not allowed' });
    return;
  }
  if (process.env.NODE_ENV === 'production' && process.env.CLOUDFLARE_REQUIRE_RAY === 'true' && !req.get('cf-ray')) {
    res.status(403).json({ message: 'Requests must pass through Cloudflare' });
    return;
  }
  next();
});

app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

// IMPORTANT: must be before routes
app.use(cookieParser());

app.use(globalLimiter);

app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buffer) => {
    (req as express.Request & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 100 }));

// ==================== API Security ====================

app.use('/api', (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  next();
});

// Validate browser origin for state-changing requests
app.use('/api', (req, res, next) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Paystack is server-to-server and authenticates with an HMAC signature.
  if (req.path === '/donations/webhook') return next();

  const origin = req.get('origin');

  if (
    !origin || origin.replace(/\/$/, '') !== CLIENT_URL
  ) {
    res.status(403).json({
      message: 'Invalid request origin',
    });
    return;
  }

  next();
});

app.use(hpp());

// ==================== API Routes ====================

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/recurring-donations', recurringDonationRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/help-offers', helpOfferRoutes);

// ==================== Health Check ====================

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    message: 'HelpFundMe API is running',
    timestamp: new Date().toISOString(),
  });
});

// ==================== 404 ====================

app.use((_req, res) => {
  res.status(404).json({
    message: 'Route not found',
  });
});

// ==================== Error Handler ====================

app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);

    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        message: 'File size too large. Maximum is 5MB.',
      });
      return;
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      res.status(400).json({
        message: 'Too many files. Maximum is 5.',
      });
      return;
    }

    if (err.code === '23505') {
      res.status(400).json({
        message: 'Duplicate field value',
      });
      return;
    }

    res.status(500).json({
      message:
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err.message,
    });
  }
);

// ==================== Start Server ====================

const startServer = async () => {
  try {
    validateEnvironment();
    await connectDB();

    app.listen(PORT, () => {
      console.log(
        `HelpFundMe API running on port ${PORT} | Environment: ${
          process.env.NODE_ENV || 'development'
        }`
      );
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;

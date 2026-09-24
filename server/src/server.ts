import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import hpp from 'hpp';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

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
import resendRoutes from './routes/resend';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 1));

const CLIENT_URL = (
  process.env.CLIENT_URL || 'http://localhost:5173'
).replace(/\/$/, '');

const escapeHtmlAttribute = (value: unknown): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const buildSocialImageUrl = (imageUrl: string): string => {
  const uploadMarker = '/image/upload/';
  try {
    const parsed = new URL(imageUrl);
    if (parsed.hostname !== 'res.cloudinary.com') return imageUrl;
    const markerIndex = imageUrl.indexOf(uploadMarker);
    if (markerIndex < 0) return imageUrl;

    const transform = [
      'c_fill,g_auto,w_1200,h_630,q_auto,f_auto',
      'l_text:Arial_34_bold:Forgex%20Company%20Limited,co_white,bo_2px_solid_black,g_south_east,x_30,y_24',
    ].join('/');
    const insertAt = markerIndex + uploadMarker.length;
    return `${imageUrl.slice(0, insertAt)}${transform}/${imageUrl.slice(insertAt)}`;
  } catch {
    return imageUrl;
  }
};

// ==================== Security Middleware ====================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      fontSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
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
  if (req.path === '/donations/webhook' || req.path === '/resend/webhook') return next();

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
app.use('/api/resend', resendRoutes);

// ==================== Health Check ====================

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    message: 'HelpFundMe API is running',
    timestamp: new Date().toISOString(),
  });
});

// Unknown API paths must remain JSON responses and must never fall through to
// the React application shell.
app.use('/api', (_req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// In production the same Render Web Service serves React and the API. Keeping
// both on one origin makes HTTP-only authentication cookies reliable on mobile.
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  const indexHtmlPath = path.join(clientDist, 'index.html');
  if (!fs.existsSync(indexHtmlPath)) {
    throw new Error(`Client build not found at ${clientDist}`);
  }
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
  app.use(express.static(clientDist, {
    index: false,
    maxAge: '1d',
    setHeaders: (res, filePath) => {
      if (filePath.includes(`${path.sep}assets${path.sep}`)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    },
  }));

  // Social crawlers generally do not execute the React application. Serve
  // campaign-specific Open Graph metadata from the server for shared links.
  app.get('/posts/:id', async (req, res, next) => {
    try {
      const post = await (await import('./models/Post')).default.findById(req.params.id);
      if (!post || !post.isActive || post.status !== 'approved') return next();

      const title = escapeHtmlAttribute(post.title || 'HelpFundMe campaign');
      const description = escapeHtmlAttribute(
        String(post.description || 'Support this campaign on HelpFundMe')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 200)
      );
      const campaignUrl = `${CLIENT_URL}/posts/${encodeURIComponent(req.params.id)}`;
      const firstImage = post.images?.[0]
        ? buildSocialImageUrl(String(post.images[0]))
        : `${CLIENT_URL}/logos.png`;
      const metadata = `
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="HelpFundMe · Forgex Company Limited" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${escapeHtmlAttribute(firstImage)}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="${escapeHtmlAttribute(campaignUrl)}" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${escapeHtmlAttribute(firstImage)}" />
        <link rel="canonical" href="${escapeHtmlAttribute(campaignUrl)}" />`;

      res.setHeader('Cache-Control', 'public, max-age=300');
      res.type('html').send(indexHtml.replace('</head>', `${metadata}\n</head>`));
    } catch (error) {
      next(error);
    }
  });

  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(indexHtmlPath);
  });
}

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

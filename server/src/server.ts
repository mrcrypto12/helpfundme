import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import dotenv from 'dotenv';

import connectDB from './config/db';
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

// ==================== Security Middleware ====================

app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(globalLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(cookieParser());

app.use(mongoSanitize());

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

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'HelpFund GH API is running', timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    res.status(400).json({ message: 'File size too large. Maximum is 5MB.' });
    return;
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    res.status(400).json({ message: 'Too many files. Maximum is 5.' });
    return;
  }
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e: any) => e.message);
    res.status(400).json({ message: 'Validation error', errors: messages });
    return;
  }
  if (err.code === 11000) {
    res.status(400).json({ message: 'Duplicate field value' });
    return;
  }

  res.status(500).json({
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// ==================== Start Server ====================

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║          HelpFund GH API Server              ║
║   Running on http://localhost:${PORT}            ║
║   Environment: ${process.env.NODE_ENV || 'development'}              ║
╚══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
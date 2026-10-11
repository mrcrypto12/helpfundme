const required = [
  'DATABASE_URL',
  'CLIENT_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_PUBLIC_BUCKET',
  'R2_PRIVATE_BUCKET',
  'R2_PUBLIC_BASE_URL',
] as const;

export const validateEnvironment = (): void => {
  const missing = required.filter((key) => !process.env[key]?.trim());
  if (missing.length) throw new Error(`Missing required environment variables: ${missing.join(', ')}`);

  const accessSecret = process.env.JWT_ACCESS_SECRET!;
  const refreshSecret = process.env.JWT_REFRESH_SECRET!;
  if (accessSecret.length < 64 || refreshSecret.length < 64) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must each be at least 64 characters');
    }
    console.warn('JWT secrets should each be at least 64 characters before production deployment');
  }
  if (accessSecret === refreshSecret) throw new Error('JWT access and refresh secrets must be different');

  const provider = process.env.PAYMENT_PROVIDER || 'seev';
  if (!['seev', 'paystack'].includes(provider)) throw new Error('Invalid PAYMENT_PROVIDER');
  if (provider === 'seev' && !process.env.SEEV_CHECKOUT_API_KEY) throw new Error('SEEV_CHECKOUT_API_KEY is required');
  if (provider === 'seev' && !process.env.SEEV_WEBHOOK_SECRET) throw new Error('SEEV_WEBHOOK_SECRET is required');
  if (provider === 'seev' && process.env.SEEV_ENV !== 'sandbox' && process.env.SEEV_ENV !== 'production') {
    throw new Error('SEEV_ENV must explicitly be sandbox or production');
  }
  if (provider === 'seev' && process.env.SEEV_ENV === 'production' && process.env.SEEV_LIVE_ENABLED !== 'true') {
    throw new Error('Live Seev payments require SEEV_LIVE_ENABLED=true after launch review');
  }
  if (provider === 'paystack' && !process.env.PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY is required');
  if (process.env.R2_PUBLIC_BUCKET === process.env.R2_PRIVATE_BUCKET) throw new Error('R2 public and private buckets must be different');
  const mediaUrl = new URL(process.env.R2_PUBLIC_BASE_URL!);
  if (mediaUrl.protocol !== 'https:' && process.env.NODE_ENV === 'production') throw new Error('R2_PUBLIC_BASE_URL must use HTTPS');

  const googleValues = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET];
  if (googleValues.some(Boolean) && !googleValues.every(Boolean)) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together');
  }

  if (process.env.NODE_ENV === 'production') {
    if (process.env.RESEND_ENABLED === 'true' && (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL)) {
      throw new Error('RESEND_API_KEY and RESEND_FROM_EMAIL are required in production');
    }
    const clientUrl = new URL(process.env.CLIENT_URL!);
    if (clientUrl.protocol !== 'https:') throw new Error('CLIENT_URL must use HTTPS in production');
    if (process.env.SERVE_CLIENT === 'false' && !process.env.API_URL?.startsWith('https://')) throw new Error('API_URL must use HTTPS in split deployment');
    if (!process.env.GOOGLE_CALLBACK_URL?.startsWith('https://') && googleValues.every(Boolean)) {
      throw new Error('GOOGLE_CALLBACK_URL must use HTTPS in production');
    }
  }
};

const required = [
  'DATABASE_URL',
  'CLIENT_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'PAYSTACK_SECRET_KEY',
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

  const googleValues = [process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET];
  if (googleValues.some(Boolean) && !googleValues.every(Boolean)) {
    throw new Error('GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together');
  }

  if (process.env.NODE_ENV === 'production') {
    const clientUrl = new URL(process.env.CLIENT_URL!);
    if (clientUrl.protocol !== 'https:') throw new Error('CLIENT_URL must use HTTPS in production');
    if (!process.env.GOOGLE_CALLBACK_URL?.startsWith('https://') && googleValues.every(Boolean)) {
      throw new Error('GOOGLE_CALLBACK_URL must use HTTPS in production');
    }
  }
};

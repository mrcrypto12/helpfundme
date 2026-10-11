import { S3Client } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const r2PublicBucket = process.env.R2_PUBLIC_BUCKET || '';
export const r2PrivateBucket = process.env.R2_PRIVATE_BUCKET || '';
export const r2PublicBaseUrl = (process.env.R2_PUBLIC_BASE_URL || '').replace(/\/+$/, '');

export const r2 = new S3Client({
  region: 'auto',
  endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
  credentials: {
    accessKeyId: accessKeyId || '',
    secretAccessKey: secretAccessKey || '',
  },
});

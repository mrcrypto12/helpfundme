import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required (PostgreSQL connection string)');

const useSsl =
  process.env.DATABASE_SSL === 'true' ||
  (process.env.DATABASE_SSL !== 'false' && process.env.NODE_ENV === 'production');

export const pool = new Pool({
  connectionString,
  ssl: useSsl ? { rejectUnauthorized: true } : false,
  max: Number(process.env.DATABASE_POOL_SIZE || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// Neon recommends a direct connection for startup schema work. Runtime queries
// continue using the pooled DATABASE_URL; local setups may omit this variable.
const schemaPool = process.env.DATABASE_DIRECT_URL ? new Pool({
  connectionString: process.env.DATABASE_DIRECT_URL,
  ssl: useSsl ? { rejectUnauthorized: true } : false,
  max: 1,
  connectionTimeoutMillis: 10_000,
}) : pool;

const connectDB = async (): Promise<void> => {
  const client = await schemaPool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_records (
        collection TEXT NOT NULL, id UUID NOT NULL, data JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (collection, id)
      );
      CREATE INDEX IF NOT EXISTS app_records_collection_created_idx ON app_records (collection, created_at DESC);
      CREATE INDEX IF NOT EXISTS app_records_data_gin_idx ON app_records USING GIN (data jsonb_path_ops);
      CREATE UNIQUE INDEX IF NOT EXISTS app_users_email_unique ON app_records (LOWER(data->>'email')) WHERE collection = 'users';
      CREATE UNIQUE INDEX IF NOT EXISTS app_donations_payment_ref_unique ON app_records ((data->>'paymentRef')) WHERE collection = 'donations';
      CREATE UNIQUE INDEX IF NOT EXISTS app_post_views_user_post_unique ON app_records ((data->>'user'), (data->>'post')) WHERE collection = 'post_views';
    `);
    console.log('PostgreSQL connected');
  } finally {
    client.release();
    if (schemaPool !== pool) await schemaPool.end();
  }
};

export default connectDB;

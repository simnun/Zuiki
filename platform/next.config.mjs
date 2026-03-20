/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET || 'zuiki-catalogo-ai-secret-key-2024',
    AUTH_TRUST_HOST: 'true',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres.hhvgwgzzhtsvzljnfiuu:-%25v-CDg2NN7zg9A@aws-1-eu-central-1.pooler.supabase.com:6543/postgres',
  },
};

export default nextConfig;

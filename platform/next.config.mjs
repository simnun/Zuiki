/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET || 'zuiki-catalogo-ai-secret-key-2024',
    AUTH_TRUST_HOST: 'true',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres.hhvgwgzzhtsvzljnfiuu:-%25v-CDg2NN7zg9A@aws-1-eu-central-1.pooler.supabase.com:6543/postgres',
    NEXT_PUBLIC_BUILD_TIME: new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'onnxruntime-node': false,
        sharp: false,
      };
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
      };
    }
    return config;
  },
};

export default nextConfig;

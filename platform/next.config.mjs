/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    AUTH_SECRET: process.env.AUTH_SECRET || 'zuiki-catalogo-ai-secret-key-2024',
    AUTH_TRUST_HOST: 'true',
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // AUTH_SECRET signs the session tokens. The hardcoded fallback below is a
    // liability — anyone reading this repository could forge a valid session.
    // Remove it as soon as AUTH_SECRET is confirmed set in the hosting env.
    AUTH_SECRET: process.env.AUTH_SECRET || 'zuiki-catalogo-ai-secret-key-2024',
    AUTH_TRUST_HOST: 'true',
    // No hardcoded connection string: it used to carry the database password in
    // clear text in the repository. Missing value now fails loudly in db.ts.
    DATABASE_URL: process.env.DATABASE_URL,
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

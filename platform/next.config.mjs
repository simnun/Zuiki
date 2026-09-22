/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    // Secrets are NOT declared here on purpose. Listing them in `env` bakes
    // their value into the build output, and the previous hardcoded fallbacks
    // put the database password and the session-signing secret in clear text
    // in the repository. Server code reads AUTH_SECRET and DATABASE_URL
    // straight from the runtime environment; if one is missing the app now
    // fails loudly instead of silently using a public value.
    AUTH_TRUST_HOST: 'true',
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

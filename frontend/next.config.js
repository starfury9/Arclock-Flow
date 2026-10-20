// Next.js only reads .env files from its own folder (frontend/). The project
// keeps a single .env at the repo root, so load it explicitly. Values already
// set in the environment (e.g. on Vercel) take precedence.
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // wagmi/connectors' baseAccount connector (Coinbase Smart Wallet) pulls
    // in @coinbase/cdp-sdk, which has optional @x402/* peer deps we don't
    // install because we only use the injected + walletConnect connectors.
    // Alias the unresolved subpaths to false so webpack skips them instead
    // of failing the build.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/core/client": false,
      "@x402/evm/exact/client": false,
      "@x402/evm/upto/client": false,
      "@x402/evm": false,
      "@x402/svm/exact/client": false,
    };
    return config;
  },
};

module.exports = nextConfig;

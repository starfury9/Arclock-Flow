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

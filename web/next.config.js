/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // API_INTERNAL_URL is for server-side proxy (internal Docker network)
    // Falls back to localhost for local development
    const internalApiUrl = process.env.API_INTERNAL_URL || 'http://localhost:3001';

    return [
      {
        source: '/api/:path*',
        destination: `${internalApiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

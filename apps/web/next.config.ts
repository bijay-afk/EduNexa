import type { NextConfig } from 'next';

// Public base URL of the NestJS API. When set, /api/v1/* requests from the
// browser are proxied server-side (same-origin), avoiding CORS entirely since
// the API disables CORS in production. Leave unset to keep the fallback
// http://localhost:3000 during local development.
const apiUpstream = process.env.API_UPSTREAM;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    if (!apiUpstream) return [];
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUpstream}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
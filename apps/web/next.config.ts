import type { NextConfig } from 'next';

// Public base URL of the NestJS API, proxied server-side for every /api/v1/*
// request (same-origin, so no CORS and no absolute localhost URLs in the
// browser). Local dev proxies to the API on port 3100; production proxies to
// the live Railway API. Override with API_UPSTREAM when needed.
const productionApiUpstream = 'https://api-production-836b.up.railway.app';
const devApiUpstream = 'http://localhost:3100';
const apiUpstream =
  process.env.API_UPSTREAM ??
  (process.env.NODE_ENV === 'production' ? productionApiUpstream : devApiUpstream);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiUpstream}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
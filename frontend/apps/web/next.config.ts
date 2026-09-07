import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BACKEND_HOST = BACKEND_URL.endsWith('/v1') ? BACKEND_URL.slice(0, -3) : BACKEND_URL;

const SITES_URL = process.env.NEXT_PUBLIC_LANDING_BASE_URL || 'http://localhost:3005';

const nextConfig: NextConfig = {
  transpilePackages: ['@psi/image-utils', '@psi/ui'],
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: `${BACKEND_HOST}/v1/:path*`,
      },
      {
        source: '/rest/v1/:path*',
        destination: `${BACKEND_HOST}/rest/v1/:path*`,
      },
      {
        source: '/auth/v1/:path*',
        destination: `${BACKEND_HOST}/auth/v1/:path*`,
      },
      {
        source: '/p/:path*',
        destination: `${SITES_URL}/p/:path*`,
      },
      {
        source: '/sites/:path*',
        destination: `${SITES_URL}/sites/:path*`,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const BACKEND_HOST = BACKEND_URL.endsWith('/v1') ? BACKEND_URL.slice(0, -3) : BACKEND_URL;

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
    ];
  },
};

export default nextConfig;

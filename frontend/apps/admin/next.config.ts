import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@psi/image-utils', '@psi/ui'],
};

export default nextConfig;

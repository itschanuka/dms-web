import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stop ESLint from breaking production builds.
  // Run `npm run lint` separately when you want.
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Allow images from Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
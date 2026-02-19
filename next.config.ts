import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker/Coolify deployment
  output: "standalone",

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;

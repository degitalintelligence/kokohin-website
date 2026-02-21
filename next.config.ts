import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker/Coolify deployment
  output: "standalone",

  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },

  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        // Unsplash — untuk placeholder sementara, hapus setelah pakai foto asli
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        // Supabase Storage — ganti 'your-supabase-project.supabase.co' dengan domain aktual
        // Atau gunakan domain Coolify self-hosted Supabase Anda
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "supabase.kokohin.com",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
    ],
  },
};

export default nextConfig;

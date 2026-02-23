import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker/Coolify deployment
  output: "standalone",
  compress: true,
  poweredByHeader: false,

  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  images: {
    formats: ['image/avif', 'image/webp'],
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
        protocol: "http",
        hostname: "supabase.kokohin.com",
      },
      {
        protocol: "https",
        hostname: "*.kokohin.com",
      },
      {
        protocol: "http",
        hostname: "*.kokohin.com",
      },
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
      { protocol: "http", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
    ],
  },
  async rewrites() {
    return [
      { source: '/kebijakan-privasi', destination: '/privacy.html' },
      { source: '/privacy', destination: '/privacy.html' },
    ]
  },
};

export default nextConfig;

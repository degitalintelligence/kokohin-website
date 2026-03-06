import type { NextConfig } from "next";

const cspDirectives = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "connect-src 'self' https: wss: data:",
  "frame-src 'self' https:",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
]

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
    qualities: [75, 70],
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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;

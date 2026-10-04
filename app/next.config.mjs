/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'clsx',
      'tailwind-merge',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'jspdf',
      'jspdf-autotable',
      'xlsx',
      'zod',
      'dexie',
    ],
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|png|webp|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/backend/healthz',
        destination: 'http://127.0.0.1:8000/healthz',
      },
      {
        source: '/api/backend/health',
        destination: 'http://127.0.0.1:8000/healthz',
      },
      {
        source: '/api/backend/api/v1/:path*',
        destination: 'http://127.0.0.1:8000/api/v1/:path*',
      },
      {
        source: '/api/backend/:path*',
        destination: 'http://127.0.0.1:8000/api/v1/:path*',
      },
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:8000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;

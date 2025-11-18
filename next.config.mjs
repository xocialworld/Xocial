/** @type {import('next').NextConfig} */

const nextConfig = {
  // React strict mode for detecting issues
  reactStrictMode: true,

  // Disable production source maps for better performance and smaller bundle size
  productionBrowserSourceMaps: false,

  // Logging configuration
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    qualities: [75, 85],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      'framer-motion',
    ],
  },

  // Compiler options
  compiler: {
    // Remove console logs in production (except error and warn)
    removeConsole: process.env.NODE_ENV === 'production' 
      ? { exclude: ['error', 'warn'] }
      : false,
  },

  // Build configuration
  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;


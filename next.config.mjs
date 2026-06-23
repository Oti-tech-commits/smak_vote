import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb'
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**'
      }
    ]
  }
};

export default nextConfig;

if (process.env.NODE_ENV === 'development') {
  initOpenNextCloudflareForDev();
}

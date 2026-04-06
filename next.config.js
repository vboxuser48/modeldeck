/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  assetPrefix: './',
  trailingSlash: true,
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  typedRoutes: true,
  images: {
    unoptimized: true
  }
};

export default nextConfig;

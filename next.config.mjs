/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Always fetch fresh data on client-side navigation so titles/shares are current.
    staleTimes: { dynamic: 0 },
    // File uploads (up to 5 MB) travel through a server action.
    serverActions: { bodySizeLimit: "6mb" },
  },
};
export default nextConfig;

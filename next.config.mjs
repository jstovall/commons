/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // Supabase Storage public bucket URLs — replace with your project ref
        hostname: "*.supabase.co",
      },
    ],
  },
  // PWA (manifest + service worker + push) is wired up in the next build step.
};

export default nextConfig;

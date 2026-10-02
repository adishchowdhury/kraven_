import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  serverExternalPackages: [
    "node-llama-cpp",
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
  ],
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;

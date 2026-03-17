import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Ensure Next doesn't walk up to unrelated parent lockfiles when inferring the workspace root.
    root: process.cwd(),
  },
};

export default nextConfig;

import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so a stray lockfile in the repo root
  // (e.g. the Vercel CLI's package-lock.json) can't make Turbopack resolve
  // modules from the wrong node_modules tree and 500 the whole app.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

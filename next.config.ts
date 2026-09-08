import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
};

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default nextConfig;

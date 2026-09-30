import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  output: "standalone",
  // 開発中に左下へ出る丸い「N」印が、スマホ幅で下のタブに重なるため出さない
  devIndicators: false,
  turbopack: {
    root: __dirname,
  },
};

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default nextConfig;

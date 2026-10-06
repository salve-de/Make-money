import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import { securityHeaderRules } from "./src/lib/security/headers";

const nextConfig: NextConfig = {
  output: "standalone",
  // 開発中に左下へ出る丸い「N」印が、スマホ幅で下のタブに重なるため出さない
  devIndicators: false,
  turbopack: {
    root: __dirname,
  },
  // セキュリティヘッダー（設計と根拠は docs/launch/SECURITY_REVIEW.md と src/lib/security/headers.ts）
  async headers() {
    return securityHeaderRules({
      production: process.env.NODE_ENV === "production",
      firebaseAuthDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    });
  },
};

if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default nextConfig;

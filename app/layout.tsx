import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "GOLDMINE RADAR｜次の事業機会を探す",
  description: "実際に金が動いた証拠、伸びる需要、既存サービスを接続し、まだ残る事業機会を発見する。",
  applicationName: "GOLDMINE RADAR",
  robots: {
    index: process.env.NEXT_PUBLIC_DATA_MODE === "production",
    follow: process.env.NEXT_PUBLIC_DATA_MODE === "production"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: "#070906"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

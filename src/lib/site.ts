export const siteConfig = {
  name: "GOLDMINE RADAR",
  shortName: "GMR",
  description:
    "実際に金が動いた証拠から、次に大きくなる市場と自分が入れる事業機会を発見するデータベース。",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export const primaryNav = [
  { href: "/", label: "発見する" },
  { href: "/opportunities", label: "金脈" },
  { href: "/signals", label: "金の動き" },
  { href: "/products", label: "サービス" },
  { href: "/demand", label: "需要" },
  { href: "/rankings", label: "ランキング" },
];

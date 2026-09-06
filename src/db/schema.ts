import { pgTable, text, timestamp, integer, boolean, jsonb, serial } from "drizzle-orm/pg-core";

// ユーザー・購読管理（Firebase Auth & Stripe連携）
export const users = pgTable("users", {
  id: text("id").primaryKey(), // Firebase Auth UID
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  role: text("role").default("member").notNull(), // 'member' | 'admin'
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  isPro: boolean("is_pro").default(false).notNull(),
  proExpiresAt: timestamp("pro_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 実在企業・高収益ビジネス財務台帳（22社等の実在P&Lデータ）
export const businesses = pgTable("businesses", {
  id: text("id").primaryKey(), // 例: 'levelsio', 'outbid', 'keyence'
  name: text("name").notNull(),
  founder: text("founder"),
  category: text("category").notNull(), // 'SaaS' | 'EC' | 'Media' | 'B2B' | etc.
  scale: text("scale").notNull(), // 'solo' | 'micro' | 'mid' | 'enterprise'
  teamSize: text("team_size").notNull(), // '完全1人', '4人体制', '10,500人'
  monthlyRevenue: integer("monthly_revenue").notNull(), // 円換算
  monthlyProfit: integer("monthly_profit").notNull(), // 円換算
  profitMargin: integer("profit_margin").notNull(), // % (0-100)
  annualRevenue: text("annual_revenue"),
  moatType: text("moat_type"), // 'スイッチングコスト', 'ネットワーク効果', etc.
  summary: text("summary").notNull(),
  // 生々しい財務内訳（ウォーターフォール・原価・API費等）
  financials: jsonb("financials").$type<{
    grossMargin?: number;
    operatingMargin?: number;
    cogs?: number;
    infrastructureCost?: number;
    marketingCost?: number;
    waterfallBreakdown?: Array<{ label: string; amount: number; percentage: number }>;
  }>(),
  // 稼働インフラ・武器庫ツール
  tools: jsonb("tools").$type<Array<{ name: string; category: string; monthlyCost: number }>>(),
  // 初動集客手順と泥臭い実録
  initialTraction: jsonb("initial_traction").$type<{
    first100UsersMethod: string;
    keyChannel: string;
    pitfalls: string;
  }>(),
  verified: boolean("verified").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 実践ビジネス機会台帳（アイデア台帳）
export const businessIdeas = pgTable("business_ideas", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  targetIndustry: text("target_industry").notNull(),
  potentialMonthlyProfit: text("potential_monthly_profit").notNull(),
  initialCapital: text("initial_capital").notNull(),
  difficulty: text("difficulty").notNull(), // '低' | '中' | '高'
  timeToFirstCashDays: integer("time_to_first_cash_days"),
  structuralArbitrage: text("structural_arbitrage").notNull(),
  actionSteps: jsonb("action_steps").$type<string[]>(),
  recommendedTools: jsonb("recommended_tools").$type<string[]>(),
  isProOnly: boolean("is_pro_only").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 未開拓市場シグナル速報
export const marketSignals = pgTable("market_signals", {
  id: serial("id").primaryKey(),
  industry: text("industry").notNull(),
  growthRate: text("growth_rate").notNull(), // '+45% YoY'
  structuralDefect: text("structural_defect").notNull(),
  timeToMonetization: text("time_to_monetization").notNull(),
  evidenceUrl: text("evidence_url"),
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
});

// ユーザー保存・ブックマーク
export const savedItems = pgTable("saved_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  itemType: text("item_type").notNull(), // 'business' | 'idea' | 'signal'
  itemId: text("item_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 自走型掲載申請（Starter Story型）
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id),
  businessName: text("business_name").notNull(),
  url: text("url").notNull(),
  monthlyRevenue: integer("monthly_revenue").notNull(),
  monthlyProfit: integer("monthly_profit").notNull(),
  toolsUsed: text("tools_used"),
  acquisitionChannel: text("acquisition_channel"),
  proofScreenshotUrl: text("proof_screenshot_url"),
  status: text("status").default("pending").notNull(), // 'pending' | 'approved' | 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
});

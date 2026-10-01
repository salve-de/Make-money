import {
  Banknote, BookOpen, Building2, Calculator, CalendarClock, Castle, CircleAlert, CircleX, FileCheck, Flag, Gauge,
  Handshake, Layers, Lightbulb, Link2, Lock, Megaphone, Newspaper, Receipt, Shuffle, Swords, Tag, TrendingUp, Trophy,
  UserRound, Users, Wallet, Wrench, Zap, type LucideIcon,
} from 'lucide-react';
import type { AnalysisItem, MetricOrigin } from '@/shared/reader-case';

/** 推測の項目ごとの印。見出しを目で探しやすくするためだけに使い、意味は必ず文字の見出しで伝える。 */
export const ANALYSIS_ICONS: Record<AnalysisItem, LucideIcon> = {
  HEADLINE: Zap,
  STORY: BookOpen,
  BUSINESS_MODEL: Layers,
  PRICING: Tag,
  CUSTOMER: Users,
  CUSTOMER_PAIN: CircleAlert,
  FIRST_CUSTOMERS: Flag,
  CHANNELS: Megaphone,
  REVENUE_ESTIMATE: TrendingUp,
  COST_STRUCTURE: Receipt,
  TAKE_HOME: Wallet,
  CAPITAL_AND_TEAM: Building2,
  TOOLS: Wrench,
  DEPENDENCIES: Link2,
  LOCK_IN: Lock,
  UPFRONT_CASH: Banknote,
  REFERRAL: Handshake,
  INCUMBENT_BLINDSPOT: Castle,
  COMPETITION: Swords,
  TIMELINE: CalendarClock,
  WHY_IT_WORKED: Trophy,
  VIABILITY: Gauge,
  PIVOTS: Shuffle,
  FAILURE_CAUSE: CircleX,
  LESSON: Lightbulb,
};

/** 数字の情報源ごとの印（提出書類・本人申告・記事・第三者・推定）。文字のラベルと必ず一緒に出す。 */
export const ORIGIN_ICONS: Record<MetricOrigin, LucideIcon> = {
  FILED: FileCheck,
  SELF_REPORTED: UserRound,
  ARTICLE: Newspaper,
  THIRD_PARTY: Users,
  ESTIMATED: Calculator,
};

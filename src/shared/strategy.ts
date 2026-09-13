import type { SynthesizedIdea } from './terminal';

interface StrategyNote {
  /** @maxLength 8000 */
  content: string;
  /** @maxLength 64 */
  updatedAt: string;
}

interface StrategyMessage {
  role: 'user' | 'assistant';
  /** @maxLength 8000 */
  content: string;
}

export interface UserProfilePayload {
  /** @minimum 0 @maximum 100000 */
  bookmarkedCount?: number;
  /** @minimum 0 @maximum 100000 */
  viewedCount?: number;
  /** @maxItems 20 */
  preferredSectors?: string[];
  /** @maxItems 20 */
  preferredScales?: string[];
  /** @minimum 0 @maximum 100 */
  averageProfitMargin?: number;
  /** @maxItems 50 */
  topTools?: string[];
  /** @maxItems 50 */
  topMoats?: string[];
  /** @maxLength 2000 */
  profileSummary?: string;
}

interface SynthesisPayload {
  action: 'SYNTHESIZE';
  /** @maxItems 50 */
  selectedEntityIds: string[];
  /** @maxProperties 50 */
  notes: Record<string, StrategyNote>;
  userProfile?: UserProfilePayload;
}

interface ChatPayload {
  action: 'CHAT';
  /** @maxLength 128 */
  conversationId?: string;
  /** @maxItems 50 */
  messages: StrategyMessage[];
  /** @maxLength 128 */
  contextEntityId?: string;
  /** @maxItems 20 */
  synthesizedIdeas?: SynthesizedIdea[];
  /** @maxProperties 50 */
  notes?: Record<string, StrategyNote>;
  userProfile?: UserProfilePayload;
}

export type StrategyRequest = SynthesisPayload | ChatPayload;
export type SynthesizedIdeas = SynthesizedIdea[];

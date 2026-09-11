import type { SynthesizedIdea } from './terminal';

export interface UserProfilePayload {
  bookmarkedCount?: number;
  viewedCount?: number;
  preferredSectors?: string[];
  preferredScales?: string[];
  averageProfitMargin?: number;
  topTools?: string[];
  topMoats?: string[];
  profileSummary?: string;
}

interface SynthesisPayload {
  action: 'SYNTHESIZE';
  selectedEntityIds: string[];
  notes: Record<string, { content: string; updatedAt: string }>;
  userProfile?: UserProfilePayload;
}

interface ChatPayload {
  action: 'CHAT';
  conversationId?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  contextEntityId?: string;
  synthesizedIdeas?: SynthesizedIdea[];
  notes?: Record<string, { content: string; updatedAt: string }>;
  userProfile?: UserProfilePayload;
}

export type StrategyRequest = SynthesisPayload | ChatPayload;
export type SynthesizedIdeas = SynthesizedIdea[];

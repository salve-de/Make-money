import type { ScreenCase } from '../../e2e/support/reader-view-collect';

export type Hit = { id: string; where: string; rule: string; text: string };
export const RULES: Record<string, string>;
export const PENDING: Record<string, string>;
export const KNOWN_ACRONYMS: Set<string>;
export const LABEL_TABLE: Array<{ label: RegExp; must?: RegExp; mustNot?: RegExp; why: string }>;
export function originTags(text: string): string[];
export function unitNumbers(text: string): Array<{ key: string; raw: string }>;
export function missingYen(text: string): string[];
export function priceExtras(text: string): string[];
export function auditScreen(screen: ScreenCase, opts?: { checkImages?: boolean }): Hit[];
export function hitKey(hit: Hit): string;

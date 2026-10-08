import type { ScreenCase } from '../../e2e/support/reader-view-collect';
import type { Hit } from './rules.mjs';

export const STRUCTURE_RULES: Record<'YEN_VARIANT' | 'YEN_DOUBLE' | 'MAKER_WORDS', string>;
export const MAKER_HEADINGS: Set<string>;
export const MAKER_NOTES: RegExp;
export function foreignKey(raw: string): string;
export function yenVariants(texts: string[]): Array<{ foreign: string; yens: string[] }>;
export function yenDoubles(text: string): string[];
export function auditStructure(screen: ScreenCase): Hit[];

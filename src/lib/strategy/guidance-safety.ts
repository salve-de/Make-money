import type { SynthesizedIdea } from '@/shared/terminal';

// Historical source data can mention abusive or terms-violating growth tactics.
// Those descriptions may remain in the research ledger, but generated advice
// must never turn them into instructions.
const PROHIBITED_GUIDANCE_PATTERNS = [
  /自演|なりすまし|別人を装/iu,
  /dm爆撃|迷惑dm|スパム(?:送信|dm)/iu,
  /不正(?:な)?スクレイピング|無断(?:取得|転載|連絡)/iu,
  /規約(?:の)?(?:隙間|抜け道|回避)|terms?.{0,12}(?:bypass|evasion)/iu,
  /直取引(?:を)?(?:封鎖|妨害|禁止)/iu,
  /sockpuppet|fake\s*account|spam\s*dm|unauthorized\s*scrap/iu,
];

export function containsProhibitedGuidance(value: unknown): boolean {
  if (typeof value === 'string') {
    const normalized = value.replace(/[\s　]+/gu, '');
    return PROHIBITED_GUIDANCE_PATTERNS.some((pattern) => pattern.test(value) || pattern.test(normalized));
  }
  if (Array.isArray(value)) return value.some(containsProhibitedGuidance);
  if (value && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some(containsProhibitedGuidance);
  }
  return false;
}

export function sanitizeGeneratedText(value: string): string {
  return containsProhibitedGuidance(value)
    ? '公開事例に規約・法令違反につながる記述が含まれるため、許可を得た正規の手段へ置き換えて検証します。'
    : value;
}

export function sanitizeSynthesizedIdeas(ideas: SynthesizedIdea[]): SynthesizedIdea[] {
  return ideas.map((idea) => ({
    ...idea,
    dimensionLabel: sanitizeGeneratedText(idea.dimensionLabel),
    title: sanitizeGeneratedText(idea.title),
    targetPainWallet: sanitizeGeneratedText(idea.targetPainWallet),
    structuralArbitrage: sanitizeGeneratedText(idea.structuralArbitrage),
    requiredTools: idea.requiredTools.map((tool) => ({
      ...tool,
      name: sanitizeGeneratedText(tool.name),
      purpose: sanitizeGeneratedText(tool.purpose),
    })),
    first100TractionPlaybook: idea.first100TractionPlaybook.map(sanitizeGeneratedText),
    userNoteInspiration: sanitizeGeneratedText(idea.userNoteInspiration),
  }));
}

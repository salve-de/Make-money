import { describe, expect, it } from 'vitest';
import { createBuildSpec, renderBuildPrompt } from './spec';
import type { SynthesizedIdea } from '@/shared/terminal';

const idea: SynthesizedIdea = {
  id: 'idea-1',
  dimension: 'META_ARCHITECT',
  dimensionLabel: '構造型',
  title: '  Dental AI Reminder  ',
  targetPainWallet: ' 無断キャンセルで売上が抜ける歯科医院 ',
  structuralArbitrage: ' 高価な基幹システムを入れず予約リマインドだけ切り出す ',
  projectedMonthlyProfitJpy: 250000,
  operatingMargin: 82,
  requiredTools: [
    { name: 'Stripe', monthlyCostJpy: 0, purpose: 'billing' },
    { name: 'Supabase', monthlyCostJpy: 0, purpose: 'database' },
  ],
  first100TractionPlaybook: ['正規の紹介経路で検証'],
  sourceEntityIds: ['entity-1'],
  userNoteInspiration: 'small vertical SaaS',
};

describe('builder spec', () => {
  it('turns a synthesized idea into a bounded implementation contract', () => {
    const spec = createBuildSpec(idea);
    expect(spec.sourceIdeaId).toBe('idea-1');
    expect(spec.productName).toBe('Dental AI Reminder');
    expect(spec.suggestedStack).toContain('Stripe');
    expect(spec.mvpFeatures.length).toBeGreaterThan(4);
    expect(spec.constraints.join(' ')).toContain('秘密鍵');
    expect(spec.businessModel.monthlyProfitHypothesisJpy).toBe(250000);
    expect(spec.businessModel.note).toContain('仮説');
  });

  it('renders a provider prompt that preserves the evidence and safety boundary', () => {
    const prompt = renderBuildPrompt(createBuildSpec(idea));
    expect(prompt).toContain('BUILD SPEC');
    expect(prompt).toContain('実際に触れる最小のWebサービスMVP');
    expect(prompt).toContain('秘密情報');
    expect(prompt).not.toContain('必ず儲かる');
  });
});

import { describe, expect, it } from 'vitest';
import { aggregateMacroIntelligence } from './macro-aggregator';

describe('curated Playbook provenance', () => {
  it('does not represent static chart examples as observed company measurements', () => {
    const data = aggregateMacroIntelligence([]);
    expect(data.weeklyMeta.provenance).toBe('reference_sample');
    expect(data.weeklyMeta.observedDate).toBeNull();
    expect(data.weeklyMeta.sampleSizeLabel).toContain('未確認');
    for (const category of Object.values(data.toolCategoryRadars)) {
      expect(JSON.stringify(category)).not.toContain('検証済');
    }
    expect(data.currentWaves.length).toBeGreaterThan(0);
    expect(data.genesisTactics.length).toBeGreaterThan(0);
  });
});

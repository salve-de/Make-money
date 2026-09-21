import { queryD1 } from '@/lib/storage/d1';
import { parseSynthesizedIdeas } from '@/shared/strategy-schema';
import type { SynthesizedIdea } from '@/shared/terminal';

export async function loadOwnedIdea(userId: string, ideaId: string): Promise<SynthesizedIdea | null> {
  const rows = await queryD1<{ payload: string }>(
    'SELECT payload FROM synthesized_ideas WHERE user_id=? AND id=? LIMIT 1',
    [userId, ideaId],
    (raw) => {
      const row = raw as Record<string, unknown>;
      if (typeof row.payload !== 'string') throw new Error('Invalid synthesized idea row');
      return { payload: row.payload };
    },
  );
  if (!rows[0]) return null;

  const parsed: unknown = JSON.parse(rows[0].payload);
  return parseSynthesizedIdeas([parsed])[0] ?? null;
}

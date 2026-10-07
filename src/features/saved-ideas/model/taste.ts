import { PRICE_TYPE_LABELS, WIN_LABELS, toPatternCase, type PriceType, type WinKey } from '@/lib/company-access/case-patterns';
import { genreLabel } from '@/shared/display-text';
import type { FinancialEntity } from '@/shared/terminal';

/**
 * 保存した事例から「好み」を数え、近い事例と事業の案の組み合わせを出す（純関数）。
 * 材料は、事例に記録されている分野（ジャンル）・タグ・料金の型・勝ち方だけ。作文で足さない。
 * 数えた件数は事実、「好み」と案の組み合わせは推測。手順（やり方）は出さない。
 */

export type TraitDim = 'genre' | 'price' | 'tag' | 'win';

export const DIM_LABELS: Record<TraitDim, string> = { genre: '分野', price: '料金', tag: '形', win: '勝ち方' };
const DIM_ORDER: TraitDim[] = ['genre', 'price', 'tag', 'win'];
/** 好みと呼ぶ最小の件数（2件以上の事例に共通するものだけ） */
export const MIN_TRAIT_CASES = 2;
export const MAX_IDEAS = 3;
export const MAX_SIMILAR = 3;

export interface TasteInput {
  id: string;
  name: string;
  genre: string | null;
  tags: string[];
  priceTypes: PriceType[];
  wins: WinKey[];
}

export interface TasteTrait {
  dim: TraitDim;
  key: string;
  label: string;
  count: number;
  caseIds: string[];
}

export interface Taste {
  /** 保存した事例の件数（好みを数えた母数） */
  saved: number;
  /** 2件以上に共通する特徴。件数の多い順 */
  traits: TasteTrait[];
}

export interface IdeaCombo {
  id: string;
  traits: TasteTrait[];
  /** 組み合わせに最も多く当てはまる保存事例（「作る」へ渡す材料） */
  anchorId: string;
}

export interface SimilarCase {
  id: string;
  name: string;
  shared: Array<{ dim: TraitDim; label: string }>;
}

export function toTasteInput(entity: Pick<FinancialEntity, 'id' | 'name' | 'tagline' | 'tags' | 'sector' | 'reader'>): TasteInput {
  const pattern = toPatternCase({ id: entity.id, name: entity.name, sector: entity.sector, tags: entity.tags, reader: entity.reader });
  return {
    id: entity.id,
    name: entity.name,
    genre: genreLabel(entity.tagline),
    tags: [...new Set((entity.tags ?? []).map((tag) => tag.trim()).filter(Boolean))],
    priceTypes: pattern.priceTypes,
    wins: Object.keys(pattern.wins) as WinKey[],
  };
}

function traitsOf(input: TasteInput): Array<Omit<TasteTrait, 'count' | 'caseIds'>> {
  return [
    ...(input.genre ? [{ dim: 'genre' as const, key: input.genre, label: input.genre }] : []),
    ...input.priceTypes.map((key) => ({ dim: 'price' as const, key, label: PRICE_TYPE_LABELS[key] })),
    ...input.tags.map((tag) => ({ dim: 'tag' as const, key: tag, label: tag })),
    ...input.wins.map((key) => ({ dim: 'win' as const, key, label: WIN_LABELS[key] })),
  ];
}

export function buildTaste(saved: readonly TasteInput[]): Taste {
  const map = new Map<string, TasteTrait>();
  for (const input of saved) {
    for (const trait of traitsOf(input)) {
      const id = `${trait.dim}:${trait.key}`;
      const found = map.get(id);
      if (found) {
        found.count += 1;
        found.caseIds.push(input.id);
      } else {
        map.set(id, { ...trait, count: 1, caseIds: [input.id] });
      }
    }
  }
  const traits = [...map.values()]
    .filter((trait) => trait.count >= MIN_TRAIT_CASES)
    .sort((a, b) => b.count - a.count || DIM_ORDER.indexOf(a.dim) - DIM_ORDER.indexOf(b.dim) || a.label.localeCompare(b.label, 'ja'));
  return { saved: saved.length, traits };
}

/** 好みを1行で。件数は数えた事実のまま。 */
export function summaryLine(taste: Taste): string | null {
  if (taste.traits.length === 0) return null;
  const parts = DIM_ORDER.flatMap((dim) => {
    const top = taste.traits.find((trait) => trait.dim === dim);
    return top ? [`${DIM_LABELS[dim]}は「${top.label}」${top.count}件`] : [];
  });
  return `保存${taste.saved}件のうち、${parts.slice(0, 3).join('、')}`;
}

/** 保存していない事例のうち、好みの特徴を2つ以上持つものを近い順に。 */
export function similarCases(taste: Taste, candidates: readonly TasteInput[], savedIds: ReadonlySet<string>): SimilarCase[] {
  const weight = new Map(taste.traits.map((trait) => [`${trait.dim}:${trait.key}`, trait.count]));
  return candidates
    .filter((candidate) => !savedIds.has(candidate.id))
    .map((candidate) => {
      const shared = traitsOf(candidate).filter((trait) => weight.has(`${trait.dim}:${trait.key}`));
      const score = shared.reduce((sum, trait) => sum + (weight.get(`${trait.dim}:${trait.key}`) ?? 0), 0);
      return { id: candidate.id, name: candidate.name, shared: shared.map(({ dim, label }) => ({ dim, label })), score };
    })
    .filter((row) => row.shared.length >= 2)
    .sort((a, b) => b.score - a.score || b.shared.length - a.shared.length || a.name.localeCompare(b.name, 'ja'))
    .slice(0, MAX_SIMILAR)
    .map(({ id, name, shared }) => ({ id, name, shared }));
}

const COMBO_DIMS: TraitDim[] = ['genre', 'price', 'tag', 'win'];

/** 好みの特徴を組み合わせた事業の案（推測）。最有力の組み合わせと、1か所だけ差し替えた案。 */
export function composeIdeas(taste: Taste): IdeaCombo[] {
  const byDim = (dim: TraitDim) => taste.traits.filter((trait) => trait.dim === dim);
  const base = COMBO_DIMS.flatMap((dim) => byDim(dim).slice(0, 1)).slice(0, 3);
  if (base.length < 2) return [];
  const combos: TasteTrait[][] = [base];
  const swaps = base
    .map((trait, index) => ({ index, alt: byDim(trait.dim)[1] }))
    .filter((row): row is { index: number; alt: TasteTrait } => Boolean(row.alt))
    .sort((a, b) => b.alt.count - a.alt.count);
  for (const { index, alt } of swaps) combos.push(base.map((trait, i) => (i === index ? alt : trait)));
  const seen = new Set<string>();
  return combos
    .filter((traits) => {
      const key = traits.map((trait) => `${trait.dim}:${trait.key}`).join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_IDEAS)
    .map((traits, i) => {
      const tally = new Map<string, number>();
      for (const trait of traits) for (const id of trait.caseIds) tally.set(id, (tally.get(id) ?? 0) + 1);
      const anchorId = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
      return { id: `idea-${i + 1}`, traits, anchorId };
    });
}

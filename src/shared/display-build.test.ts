import { describe, expect, it } from 'vitest';
import {
  applyRepairs, repairRows, assembleDisplay, buildMaterial, liveSuccessPoints, displayGaps, dropFlagged, reviewRows, extractNumbers, mergeEntity, newProblems, numberProblems, outputSchema, parseCheckOutput, structuralProblems, unsupportedNumbers, lostNumbers, blameRows, droppableNumbers,
  type AiOutput, type DisplayFiles, type DisplayNeed, type LiveReader,
} from './display-build';
import { textFingerprint } from './list-lines';

const reader: LiveReader = {
  summaryFactId: 'f1',
  sources: [{ id: 's1', url: 'https://example.com/a' }, { id: 's2', url: 'https://example.com/b' }],
  facts: [
    { id: 'f1', kind: 'DESCRIPTION', text: '開発者向けの道具。待ち時間を減らす。', sourceId: 's1', attribution: 'OFFICIAL' },
    { id: 'f2', kind: 'EVENT', text: '2019年4月に有料版を出し、月500ドルになった。', sourceId: 's2', attribution: 'SELF_REPORTED' },
  ],
  metrics: [{ id: 'm1', measure: 'USERS', period: '2025-05', amount: 200000, unit: '人', sourceId: 's1' }],
  analysis: [
    { id: 'a-headline', item: 'HEADLINE', text: '見出し', basis: ['f1'] },
    { id: 'a-story', item: 'STORY', text: '苛立ちから始めた。', basis: ['f2'] },
    { id: 'a-viability', item: 'VIABILITY', text: '今も有効', basis: ['f1'] },
  ],
};
const h1 = textFingerprint(reader.facts[0].text);
const empty = (): DisplayFiles => ({ 'list-lines': [], 'summary-lines': [], 'detail-lines': [], 'success-points': [], 'case-chapters': [] });
const fullNeed: DisplayNeed = { list: true, summary: true, success: true, chapters: true, detail: ['a-story'] };
const out = (over: Partial<AiOutput> = {}): AiOutput => ({
  list: '開発者向けの道具',
  summary: '待ち時間を減らす。',
  detail: [{ analysisId: 'a-story', answer: '苛立ちから始めた（本人申告）', note: '', hidden: false }],
  success: [{ head: '有料版を出した', body: '2019年4月に有料版。月500ドル（約7.5万円、本人申告）。', factId: 'f2' }],
  chapters: { practice: [{ text: '有料版を出した（本人）', factId: 'f2' }], turning: [], timeline: [{ text: '2019年4月: 有料版（本人）', factId: 'f2' }], core: [], start: [], price: [], voices: [] },
  ...over,
});

describe('displayGaps', () => {
  it('全部無い事例は全層を作る。HEADLINE・VIABILITY の文は作らない', () => {
    const gaps = displayGaps(['e1'], empty(), new Map([['e1', reader]]));
    expect(gaps).toEqual([{ entityId: 'e1', need: { list: true, summary: true, success: true, chapters: true, detail: ['a-story'] } }]);
  });
  it('紐付いた層は作らない。古い指紋の分析欄の文は作り直す', () => {
    const anchor = { entityId: 'e1', factId: 'f1', factHash: h1 };
    const files: DisplayFiles = {
      'list-lines': [{ ...anchor, text: '一覧' }],
      'summary-lines': [{ ...anchor, text: '続き' }],
      'detail-lines': [{ entityId: 'e1', analysisId: 'a-story', textHash: 'old', answer: '旧' }],
      'success-points': [{ entityId: 'e1', points: ['f1', 'f2', 'f1'].map((id) => ({ head: 'h', body: 'b', factId: id, factHash: textFingerprint(reader.facts.find((f) => f.id === id)!.text) })) }],
      'case-chapters': [{ ...anchor, chapters: {} }],
    };
    expect(displayGaps(['e1'], files, new Map([['e1', reader]]))).toEqual([{ entityId: 'e1', need: { list: false, summary: false, success: false, chapters: false, detail: ['a-story'] } }]);
  });
  it('照合済みの reader が無い事例は対象にしない', () => {
    expect(displayGaps(['e1'], empty(), new Map())).toEqual([]);
  });
});

describe('buildMaterial', () => {
  it('指紋をAIに見せず、出典URLと項目の問いを付ける', () => {
    const m = buildMaterial('e1', reader, fullNeed, { contract: { STORY: { must: '始め', question: 'なぜ始めたか' } }, files: empty(), exampleIds: [] });
    expect(JSON.stringify(m)).not.toContain(h1);
    expect(m.facts[1]).toMatchObject({ id: 'f2', sourceUrl: 'https://example.com/b', who: 'SELF_REPORTED' });
    expect(m.analysis.map((a) => a.id)).toEqual(['a-story']);
    expect(m.analysis[0]).toMatchObject({ question: 'なぜ始めたか', mustWords: '始め' });
    expect(m.needed.chapters).toContain('turning');
  });
  it('作り直さない層は existing に入れ、見本から対象の事例を除く', () => {
    const files = empty();
    files['list-lines'].push({ entityId: 'e1', factId: 'f1', factHash: h1, text: '既存の一覧' });
    const m = buildMaterial('e1', reader, { ...fullNeed, list: false }, { contract: {}, files, exampleIds: ['e1', 'e2'] });
    expect(m.existing.list).toBe('既存の一覧');
    expect(m.examples.map((e) => e.entityId)).toEqual(['e2']);
  });
});

describe('outputSchema', () => {
  it('全ての欄が必須で、追加の欄を許さない（codex の構造化出力の制約）', () => {
    const walk = (s: Record<string, unknown>): void => {
      if (s.type === 'object') {
        expect(s.additionalProperties).toBe(false);
        expect(s.required).toEqual(Object.keys(s.properties as object));
        Object.values(s.properties as Record<string, Record<string, unknown>>).forEach(walk);
      }
      if (s.type === 'array') walk(s.items as Record<string, unknown>);
    };
    walk(outputSchema());
  });
});

describe('assembleDisplay', () => {
  it('紐付けの指紋と出典URLを機械で付ける', () => {
    const { display, problems } = assembleDisplay('e1', reader, fullNeed, out());
    expect(problems).toEqual([]);
    expect(display.list).toEqual({ entityId: 'e1', factId: 'f1', factHash: h1, text: '開発者向けの道具' });
    expect(display.detail[0]).toEqual({ entityId: 'e1', analysisId: 'a-story', textHash: textFingerprint('苛立ちから始めた。'), answer: '苛立ちから始めた（本人申告）' });
    expect(display.success?.points[0].factHash).toBe(textFingerprint(reader.facts[1].text));
    expect(display.chapters?.chapters.practice).toEqual([{ text: '有料版を出した（本人）', source: 'https://example.com/b' }]);
    expect(display.chapters?.chapters.turning).toBeUndefined();
  });
  it('数字（metrics）の id でも出典を付けられる', () => {
    const { display } = assembleDisplay('e1', reader, fullNeed, out({ chapters: { practice: [{ text: '利用者20万人', factId: 'm1' }] } }));
    expect(display.chapters?.chapters.practice?.[0].source).toBe('https://example.com/a');
  });
  it('材料に無い id の行は落とし、理由を返す。足りない分析欄も指摘する', () => {
    const { display, problems } = assembleDisplay('e1', reader, fullNeed, out({ detail: [{ analysisId: 'a-headline', answer: 'x', note: '', hidden: false }], success: [{ head: 'h', body: 'b', factId: 'f9' }], chapters: { practice: [{ text: '作り話', factId: 'f9' }] } }));
    expect(display.detail).toEqual([]);
    expect(display.success?.points).toEqual([]);
    expect(display.chapters?.chapters).toEqual({});
    expect(problems).toHaveLength(4);
  });
  it('要らない層は作らない', () => {
    const { display } = assembleDisplay('e1', reader, { list: false, summary: false, success: false, chapters: false, detail: [] }, out({ detail: [] }));
    expect(display).toEqual({ detail: [] });
  });
});

describe('structuralProblems', () => {
  it('概要が一覧の文を繰り返す・年表が年で始まらない・古い順でない・同じ文の重複を指摘する', () => {
    const { display } = assembleDisplay('e1', reader, fullNeed, out({
      summary: '開発者向けの道具。待ち時間を減らす。',
      chapters: { practice: [{ text: '同じ', factId: 'f2' }], core: [{ text: '同じ', factId: 'f2' }], timeline: [{ text: '2020年: 後', factId: 'f2' }, { text: '2019年: 前', factId: 'f2' }, { text: '有料版', factId: 'f2' }] },
    }));
    const p = structuralProblems(display);
    expect(p.some((x) => x.startsWith('summary'))).toBe(true);
    expect(p.some((x) => x.includes('年（'))).toBe(true);
    expect(p.some((x) => x.includes('古い順'))).toBe(true);
    expect(p.some((x) => x.includes('同じ文'))).toBe(true);
  });
});

describe('数字の突き合わせ', () => {
  it('万・億・桁区切り・全角を値にする', () => {
    expect(extractNumbers('17.5万人、2,000人、約2.4億円、１２３')).toEqual([175000, 2000, 240000000, 123]);
  });
  it('材料の数字・円換算の概算・12以下は通し、材料に無い数字だけを返す', () => {
    const nums = [500, 2019, 160e4, 12e5 / 1e5];
    expect(unsupportedNumbers('2019年に月500ドル（約7.5万円）', nums)).toEqual([]);
    expect(unsupportedNumbers('160万ドル（約2.4億円）', nums)).toEqual([]);
    expect(unsupportedNumbers('12ラック（120万ルピー、約210万円）', nums)).toEqual([]);
    expect(unsupportedNumbers('3か月で月800ドル', nums)).toEqual([800]);
  });

  it('言い回しの直しで消えた数字を見つけ、他の行に残る数字は消えたと数えない', () => {
    expect(lostNumbers('再販制度を作り、事業の約20%がそこから来た', '他の人が再販売する制度を作った', '')).toEqual([20]);
    expect(lostNumbers('新規契約の報酬35%を3か月払う', '紹介すると3か月間報酬を払う', '')).toEqual([35]);
    expect(lostNumbers('新規契約の報酬35%を3か月払う', 'その契約の料金の35%を3か月間払う', '')).toEqual([]);
    expect(lostNumbers('資金あたりの定期収入が約2.7倍', '資金を効率よく使えた', '定期売上の1年換算額は調達資金の約2.7倍')).toEqual([]);
    expect(lostNumbers('月500ドル（約7.5万円）', '1か月に500ドル（約7.5万円）', '')).toEqual([]);
  });

  it('確かめられない数字を落とす時は、その年の月・日と、その数字の円換算だけが一緒に消えてよい', () => {
    const before = '2016年12月: 月9ドル（約1,350円）で5本、年190ドル（約2.85万円）';
    const ok = droppableNumbers(before, [2016, 190]);
    expect(ok).toEqual(expect.arrayContaining([2016, 12, 190, 28500]));
    // 確かめられた小さい数（9ドル・5本）と、その円換算は消えてよい数に入らない
    expect(ok).not.toContain(9);
    expect(ok).not.toContain(5);
    expect(ok).not.toContain(1350);
    expect(lostNumbers(before, '月9ドル（約1,350円）で', '').filter((n) => !ok.includes(n))).toEqual([5]);
  });

  it('機械の検査の指摘を、直した行の id に戻す（戻せない指摘があれば null）', () => {
    const files = { ...empty(), 'success-points': [{ entityId: 'e1', points: [{ head: 'h', body: 'b', factId: 'f1', factHash: 'x' }, { head: 'h2', body: 'b2', factId: 'f9', factHash: 'y' }] }] };
    const ids = ['list', 'detail.a-channels.answer', 'detail.a-channels.note', 'success.1.head', 'chapters.core.1', 'chapters.core.3', 'chapters.price.0'];
    expect([...blameRows(['detail-lines e1/a-channels answer: 61字（上限60）'], ids, files, 'e1')!]).toEqual(['detail.a-channels.answer']);
    expect([...blameRows(['success-points e1/f9 head: 意味が取れない言い方'], ids, files, 'e1')!]).toEqual(['success.1.head']);
    expect([...blameRows(['case-chapters e1/core text: 同じ話'], ids, files, 'e1')!].sort()).toEqual(['chapters.core.1', 'chapters.core.3']);
    expect([...blameRows(['list-lines e1 text: 46字', 'chapters.price.0: 元の文の数字 35 が消えた', 'detail.a-x.answer: 直した文が返っていない'], ids, files, 'e1')!].sort()).toEqual(['chapters.price.0', 'list']);
    expect(blameRows(['case-chapters e1: 元の事実との紐付けが合っていない'], ids, files, 'e1')).toBeNull();
    expect(blameRows(['detail-lines e2/a-channels answer: 61字'], ids, files, 'e1')).toBeNull();
    // 同じ事実から作った点が2つある時は、どちらも戻す（後ろの点だけを直した時も戻せる）
    const twin = { ...empty(), 'success-points': [{ entityId: 'e1', points: [{ head: 'a', body: 'a', factId: 'f6', factHash: 'x' }, { head: 'b', body: 'b', factId: 'f6', factHash: 'x' }] }] };
    expect([...blameRows(['success-points e1/f6 body: 61字'], ['success.0.body', 'success.1.body'], twin, 'e1')!].sort()).toEqual(['success.0.body', 'success.1.body']);
    expect([...blameRows(['success-points e1/f6 body: 61字'], ['success.1.body'], twin, 'e1')!]).toEqual(['success.1.body']);
  });
  it('どの文の数字が材料に無いかを場所つきで返す', () => {
    const { display } = assembleDisplay('e1', reader, fullNeed, out({ list: '利用者30万人の道具' }));
    const p = numberProblems(display, [500, 2019, 4, 200000]);
    expect(p).toEqual(['list: 材料に無い数字 300000（材料の数字だけを使う。円換算は 1ドル=150円 などの固定の概算で）']);
  });
});

describe('検査の落ち理由', () => {
  it('違反の行だけを取り出し、差し替え前からあった違反は除く', () => {
    const output = '[case-text] 2件の違反（docs/CASE_TEXT_STANDARD.md）:\ndetail-lines e0/a-story answer: 空\nlist-lines e1 text: 50字（上限45）\n';
    const lines = parseCheckOutput(output);
    expect(lines).toEqual(['detail-lines e0/a-story answer: 空', 'list-lines e1 text: 50字（上限45）']);
    expect(newProblems(['detail-lines e0/a-story answer: 空'], lines)).toEqual(['list-lines e1 text: 50字（上限45）']);
  });
  it('「分析欄」で始まる違反の行も取り出す（読めずに0回で止まらない）', () => {
    const output = '[case-text] 1件の違反（docs/CASE_TEXT_STANDARD.md）:\n分析欄 X（ent_x）の「物語」（a-story）: 編集文が無い\n';
    expect(parseCheckOutput(output)).toEqual(['分析欄 X（ent_x）の「物語」（a-story）: 編集文が無い']);
  });
});

describe('mergeEntity', () => {
  const files = (): DisplayFiles => ({
    'list-lines': [{ entityId: 'a', factId: 'f1', factHash: 'x', text: 'A' }, { entityId: 'e1', factId: 'f1', factHash: 'old', text: '旧' }, { entityId: 'b', factId: 'f1', factHash: 'y', text: 'B' }],
    'summary-lines': [],
    'detail-lines': [
      { entityId: 'a', analysisId: 'a-story', textHash: '1', answer: 'A' },
      { entityId: 'e1', analysisId: 'a-story', textHash: 'old', answer: '旧' },
      { entityId: 'e1', analysisId: 'a-channels', textHash: 'keep', answer: '残す' },
      { entityId: 'b', analysisId: 'a-story', textHash: '2', answer: 'B' },
    ],
    'success-points': [],
    'case-chapters': [],
  });
  it('その事例の分だけを置換・追加し、他の事例は順番も中身も変えない。元の配列は変えない', () => {
    const before = files();
    const snapshot = JSON.stringify(before);
    const { display } = assembleDisplay('e1', reader, fullNeed, out());
    const merged = mergeEntity(before, 'e1', display);
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(merged['list-lines'].map((l) => l.text)).toEqual(['A', '開発者向けの道具', 'B']);
    expect(merged['detail-lines'].map((l) => `${l.entityId}:${l.answer}`)).toEqual(['a:A', 'e1:残す', 'e1:苛立ちから始めた（本人申告）', 'b:B']);
    expect(merged['summary-lines']).toHaveLength(1);
    expect(merged['success-points'][0].entityId).toBe('e1');
    expect(merged['case-chapters'][0].factHash).toBe(h1);
  });
  it('事例の分析欄の文を全部差し替える時は、元の位置に置く', () => {
    const base = files();
    base['detail-lines'] = base['detail-lines'].filter((l) => l.analysisId !== 'a-channels');
    const { display } = assembleDisplay('e1', reader, fullNeed, out());
    expect(mergeEntity(base, 'e1', display)['detail-lines'].map((l) => l.entityId)).toEqual(['a', 'e1', 'b']);
  });
});

describe('確認役の行と、指摘行の外し', () => {
  const four = out({
    success: ['f1', 'f2', 'f1', 'f2'].map((factId, i) => ({ head: `秘訣${i}`, body: '本文', factId })),
    chapters: { practice: [{ text: '行0', factId: 'f2' }, { text: '行1', factId: 'f2' }], voices: [{ text: '声', factId: 'f1' }] },
  });
  const { display } = assembleDisplay('e1', reader, fullNeed, four);
  it('行ごとに id を付ける', () => {
    expect(reviewRows(display).map((r) => r.id)).toEqual(['list', 'summary', 'detail.a-story', 'success.0', 'success.1', 'success.2', 'success.3', 'chapters.practice.0', 'chapters.practice.1', 'chapters.voices.0']);
  });
  it('章の行と、3点以上残る成功の秘訣は外す。行が無くなった章は消す', () => {
    const r = dropFlagged(display, ['chapters.practice.0', 'chapters.voices.0', 'success.3']);
    expect(r.blocked).toEqual([]);
    expect(r.display.chapters?.chapters).toEqual({ practice: [{ text: '行1', source: 'https://example.com/b' }] });
    expect(r.display.success?.points.map((p) => p.head)).toEqual(['秘訣0', '秘訣1', '秘訣2']);
    expect(display.chapters?.chapters.practice).toHaveLength(2);
  });
  it('一覧・概要・分析欄の文や、3点を割る成功の秘訣は外さない', () => {
    expect(dropFlagged(display, ['summary']).blocked).toEqual(['summary']);
    expect(dropFlagged(display, ['success.0', 'success.1']).blocked).toEqual(['success.0', 'success.1']);
    expect(dropFlagged(display, ['detail.a-story', 'chapters.practice.0']).dropped).toEqual([]);
  });
});

describe('言い回しだけの直し（repairRows / applyRepairs）', () => {
  const anchor = { entityId: 'e1', factId: 'f1', factHash: 'h' };
  const files = (): DisplayFiles => ({
    'list-lines': [{ ...anchor, text: '一覧' }],
    'summary-lines': [{ ...anchor, text: '続き' }],
    'detail-lines': [{ entityId: 'e1', analysisId: 'a-pricing', textHash: 'x', answer: '月10ドル', note: '30日間の返金' }],
    'success-points': [{ entityId: 'e1', points: [{ head: '非公開版で回した', body: 'b', factId: 'f2', factHash: 'y' }, { head: 'h2', body: 'b2', factId: 'f1', factHash: 'z' }] }],
    'case-chapters': [{ ...anchor, chapters: { practice: [{ text: 'HNに投稿した', source: 'https://a' }, { text: '残す行', source: 'https://b' }] } }],
  });
  const check = (text: string, ctx: { price: boolean }) => [
    ...(text.includes('回した') ? ['回し'] : []), ...(text.includes('HN') ? ['HN'] : []), ...(ctx.price && text.includes('返金') ? ['返金'] : []),
  ];
  it('落ちる行だけを、確認役と同じ id で取り出す。料金の欄だけ料金の検査をかける', () => {
    expect(repairRows('e1', files(), check).map((r) => r.id)).toEqual(['detail.a-pricing.note', 'success.0.head', 'chapters.practice.0']);
  });
  it('同じ位置の文だけを差し替え、紐付け・出典・他の行は変えない。知らない id は差し替えない', () => {
    const before = files();
    const { files: after, problems } = applyRepairs(before, 'e1', [
      { id: 'success.0.head', text: '非公開版で運営した' }, { id: 'chapters.practice.0', text: 'Hacker Newsに投稿した' }, { id: 'detail.a-pricing.note', text: ' 年払いのみ ' }, { id: 'success.9.head', text: 'x' },
    ]);
    expect(problems).toEqual(['success.9.head: 直す対象の行ではない（rows の id だけを返す）']);
    expect(after['success-points'][0].points[0]).toEqual({ head: '非公開版で運営した', body: 'b', factId: 'f2', factHash: 'y' });
    expect(after['case-chapters'][0].chapters.practice).toEqual([{ text: 'Hacker Newsに投稿した', source: 'https://a' }, { text: '残す行', source: 'https://b' }]);
    expect(after['detail-lines'][0].note).toBe('年払いのみ');
    expect(before['success-points'][0].points[0].head).toBe('非公開版で回した'); // 元は変えない
    expect(repairRows('e1', after, check)).toEqual([]);
  });
});

describe('成功の秘訣の保持', () => {
  it('有効な点が1つある時は、その点を残し、足りない分だけを足す', () => {
    const live = { head: '残す点', body: 'b', factId: 'f1', factHash: textFingerprint(reader.facts.find((f) => f.id === 'f1')!.text) };
    const stale = { head: '古い点', body: 'b', factId: 'f2', factHash: 'x' };
    const files = { ...empty(), 'success-points': [{ entityId: 'e1', points: [live, stale] }] };
    expect(liveSuccessPoints('e1', reader, files)).toEqual([live]);
    const m = buildMaterial('e1', reader, { ...fullNeed, success: true }, { contract: {}, files, exampleIds: [] });
    expect(m.existing.success).toEqual([{ head: '残す点', body: 'b' }]);
    const { display } = assembleDisplay('e1', reader, fullNeed, out({ success: [{ head: '足す点', body: 'b2', factId: 'f2' }] }), [live]);
    expect(display.success?.points.map((p) => p.head)).toEqual(['残す点', '足す点']);
  });
});

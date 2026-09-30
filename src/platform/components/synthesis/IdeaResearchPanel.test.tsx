import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { IdeaResearchCase, IdeaResearchResponse } from '@/shared/idea-research';
import type { SynthesizedIdea } from '@/shared/terminal';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({ token: null, user: null, refreshAuthToken: async () => null, signInWithGoogle: async () => undefined }),
}));

import { formatYen } from '../../utils/moneyDisplay';
import { IdeaResearchPanel, IdeaResearchPanelView, type IdeaResearchPanelViewProps } from './IdeaResearchPanel';
import { StrategySynthesisView } from './StrategySynthesisView';

const IDEA_TEXT = '町工場の紙図面をLINEで受け付けてデータ化する月額サービス';

const cases: IdeaResearchCase[] = [
  { id: 'ent_success', name: 'Zukan Cloud', tagline: '町工場の紙図面をLINEで受け付ける', sector: 'NICHE_SAAS', outcome: 'success', monthlyRevenueLabel: '¥150万円', score: 41.2 },
  { id: 'ent_failure', name: 'Paper Trail', tagline: '資金が尽きて撤退した図面サービス', sector: 'AI_AUTOMATION', outcome: 'failure', monthlyRevenueLabel: '月商¥500万円（月間赤字¥5,000万円）', score: 30 },
  { id: 'ent_unknown', name: 'Quiet Drawings', tagline: '売上を公開していない図面サービス', sector: 'LOCAL_SERVICES', outcome: 'unknown', monthlyRevenueLabel: null, score: 20 },
];

const summary: SynthesizedIdea = {
  id: 'idea_research_1',
  dimension: 'CONTRARIAN_BLINDSPOT',
  dimensionLabel: '大手の隙を突く案（高額・多機能への不満）',
  title: '図面LINE受付サービス',
  targetPainWallet: '紙図面を探し回る現場責任者',
  structuralArbitrage: '大手の基幹システムは高額で、LINE受付だけの軽い形が空いている',
  projectedMonthlyProfitJpy: 300_000,
  operatingMargin: 60,
  requiredTools: [
    { name: 'LINE公式アカウント', monthlyCostJpy: 5000, purpose: '図面画像の受付' },
    { name: '無料の表計算', monthlyCostJpy: 0, purpose: '案件の管理' },
  ],
  first100TractionPlaybook: ['地域の商工会に、同意を得たうえで紹介を依頼する', '最初の3社に料金と解約条件を書いた案内を出す'],
  sourceEntityIds: ['ent_success', 'ent_unknown', 'ent_not_shown'],
  userNoteInspiration: IDEA_TEXT,
};

function props(overrides: Partial<IdeaResearchPanelViewProps> = {}): IdeaResearchPanelViewProps {
  return {
    text: '',
    onChangeText: () => undefined,
    phase: 'idle',
    data: null,
    problem: null,
    signedIn: false,
    building: false,
    buildProblem: null,
    loginFailed: false,
    formatMoney: formatYen,
    onSubmit: () => undefined,
    onClose: () => undefined,
    onOpenCase: () => undefined,
    onBuild: () => undefined,
    onLogin: () => undefined,
    ...overrides,
  };
}

const render = (overrides: Partial<IdeaResearchPanelViewProps> = {}) => renderToStaticMarkup(<IdeaResearchPanelView {...props(overrides)} />);
const ready = (data: IdeaResearchResponse, overrides: Partial<IdeaResearchPanelViewProps> = {}) => render({ phase: 'ready', data, ...overrides });
const DISABLED = /\sdisabled=""/;
const button = (html: string, label: string) => html.match(new RegExp(`<button[^>]*>(?:(?!</button>)[\\s\\S])*${label}(?:(?!</button>)[\\s\\S])*</button>`))?.[0];

describe('input row', () => {
  it('shows a one-line input with a label and a search button, and no results yet', () => {
    const html = render();
    expect(html).toContain('自分のアイデアを調べる');
    expect(html).toMatch(/<input[^>]*type="text"[^>]*aria-label="自分のアイデア"/);
    expect(html).toContain('maxLength="1000"');
    expect(html).toContain('placeholder="例: 町工場の紙図面をLINEで受け付けてデータ化する月額サービス"');
    expect(button(html, '調べる')).toBeDefined();
    expect(button(html, '調べる')).not.toMatch(DISABLED);
    expect(html).toContain('0 / 1000');
    expect(html).not.toContain('aria-label="似た事例"');
    expect(html).not.toContain('aria-label="AIのまとめ"');
    expect(html).not.toContain('結果を閉じる');
    expect(html).not.toContain('role="alert"');
  });

  it('shows the typed text and its length', () => {
    const html = render({ text: IDEA_TEXT });
    expect(html).toContain(`value="${IDEA_TEXT}"`);
    expect(html).toContain(`${Array.from(IDEA_TEXT).length} / 1000`);
  });

  it('disables the button while searching', () => {
    const html = render({ text: IDEA_TEXT, phase: 'loading' });
    expect(button(html, '調べています…')).toMatch(DISABLED);
  });

  it('explains a problem with the request in an alert, with a way to close it', () => {
    const html = render({ text: '短い', phase: 'error', problem: 'TOO_SHORT' });
    expect(html).toMatch(/<div role="alert"[^>]*>アイデアは10文字以上で入力してください。<\/div>/);
    expect(html).toContain('結果を閉じる');
    expect(render({ phase: 'error', problem: 'RATE_LIMITED' })).toContain('短い時間に調べすぎています');
    expect(render({ phase: 'error', problem: 'UNAVAILABLE' })).toContain('現在、調べられません');
  });
});

describe('similar cases', () => {
  const html = ready({ cases, ai: null, aiUnavailableReason: 'LOGIN_REQUIRED' });

  it('lists every case as a row that can be pressed, with its outcome and name, without guessed sectors', () => {
    expect(html).toContain('似た事例');
    expect(html).toContain('3件');
    for (const item of cases) {
      expect(button(html, item.name)).toBeDefined();
      expect(html).toContain(item.tagline);
    }
    expect(html.match(/<li /g)).toHaveLength(3);
    expect(html).toContain('>成功<');
    expect(html).toContain('>失敗<');
    expect(html).toContain('>不明<');
    // 事例要約は分類の根拠（SEC_SIC）を持たないため、キーワード推測の分野名は出さない
    expect(html).not.toContain('AI・ソフトウェア');
    expect(html).not.toContain('地域サービス');
  });

  it('shows revenue only where the ledger confirms it, and a dash otherwise, never an invented number', () => {
    expect(html).toContain('¥150万円');
    expect(html).toContain('月商¥500万円（月間赤字¥5,000万円）');
    const unknownRow = button(html, 'Quiet Drawings') ?? '';
    expect(unknownRow).toContain('—');
    expect(unknownRow).not.toMatch(/[0-9]+万円/);
    expect(unknownRow).toContain('text-term-dim');
  });

  it('explains what success, failure and unknown mean', () => {
    expect(html).toContain('成功＝売上が確認できた事例');
    expect(html).toContain('失敗＝撤退・破綻の記録がある事例');
    expect(html).toContain('不明＝どちらも確認できていない事例');
  });

  it('says so, and how to search better, when nothing similar was found', () => {
    const empty = ready({ cases: [], ai: null, aiUnavailableReason: 'FAILED' });
    expect(empty).toContain('似た事例は見つかりませんでした');
    expect(empty).toContain('誰の何をどう解決するかを具体的に書くと、見つかりやすくなります');
    expect(empty).toContain('0件');
    expect(empty).not.toContain('<li ');
    expect(empty).toContain('AIのまとめは現在使えません。似た事例だけ表示しています');
  });

  it('escapes text that came from the catalog', () => {
    const dangerous = ready({ cases: [{ ...cases[0], name: '<script>alert(1)</script>', tagline: '<img src=x onerror=alert(1)>' }], ai: null, aiUnavailableReason: 'FAILED' });
    expect(dangerous).not.toContain('<script>');
    expect(dangerous).not.toContain('<img');
    expect(dangerous).toContain('&lt;script&gt;');
  });
});

describe('AI summary', () => {
  const html = ready({ cases, ai: summary }, { signedIn: true });

  it('marks the whole summary as an AI estimate and shows the five items', () => {
    expect(html).toContain('AIのまとめ');
    expect(html).toContain('AIの推定');
    expect(html).toContain('実績ではなく');
    for (const text of [summary.title, summary.targetPainWallet, summary.structuralArbitrage, 'LINE公式アカウント', '図面画像の受付', ...summary.first100TractionPlaybook]) {
      expect(html).toContain(text);
    }
    for (const label of ['対象の痛み', '突く歪み', '必要ツール', '初動の手順']) expect(html).toContain(label);
  });

  it('puts 推定 on every number it shows', () => {
    expect(html).toContain('約30万円');
    expect(html).toContain('約60%');
    expect(html).toMatch(/月間利益の目安<span[^>]*>推定<\/span>/);
    expect(html).toMatch(/利益率の目安<span[^>]*>推定<\/span>/);
    expect(html).toContain('推定 </span>月約5,000円');
    expect(html).not.toMatch(/月約0円/);
  });

  it('shows 未確認, not 0円, when the AI had no confirmed revenue to base a number on', () => {
    const unconfirmed = ready({ cases, ai: { ...summary, projectedMonthlyProfitJpy: 0, operatingMargin: 0 } });
    expect(unconfirmed).toContain('未確認');
    expect(unconfirmed).not.toMatch(/(?<![0-9,])0円/);
    expect(unconfirmed).not.toContain('約0');
    expect(unconfirmed).not.toMatch(/月間利益の目安<span/);
  });

  it('uses the caller money format (for example USD) instead of a fixed one', () => {
    const usd = ready({ cases, ai: summary }, { formatMoney: (yen) => `$${Math.round(yen / 150)}` });
    expect(usd).toContain('約$2000');
    expect(usd).not.toContain('約30万円');
  });

  it('lists the source cases it drew on, only those actually shown', () => {
    expect(html).toContain('着想元');
    expect(html).toMatch(/着想元<\/span><button[^>]*underline[^>]*>Zukan Cloud<\/button>/);
    expect(html).toMatch(/<button[^>]*underline[^>]*>Quiet Drawings<\/button>/);
    expect(html).not.toContain('ent_not_shown');
    const withoutSources = ready({ cases, ai: { ...summary, sourceEntityIds: [] } });
    expect(withoutSources).not.toContain('着想元');
  });

  it('offers to build with Builder, and only when there is a summary to build from', () => {
    expect(button(html, 'Builderで作る')).toBeDefined();
    expect(button(html, 'Builderで作る')).toContain('border-term-accent');
    expect(button(html, 'Builderで作る')).not.toMatch(DISABLED);
    expect(render({ phase: 'ready', data: { cases, ai: null, aiUnavailableReason: 'FAILED' } })).not.toContain('Builderで作る');
    expect(render({ phase: 'ready', data: { cases, ai: null, aiUnavailableReason: 'LOGIN_REQUIRED' } })).not.toContain('Builderで作る');
  });

  it('disables the Builder button while preparing', () => {
    const preparing = ready({ cases, ai: summary }, { building: true });
    expect(button(preparing, '準備しています…')).toMatch(DISABLED);
  });

  it.each([
    ['FAILED', 'Builderの準備に失敗しました'],
    ['RATE_LIMITED', '短い時間に準備しすぎています'],
    ['LOGIN_REQUIRED', 'Builderで作るにはログインが必要です'],
  ] as const)('explains why Builder could not start (%s)', (buildProblem, message) => {
    const failed = ready({ cases, ai: summary }, { buildProblem });
    expect(failed).toContain(message);
    expect(failed).toContain('role="alert"');
    expect(failed.includes('Googleでログイン')).toBe(buildProblem === 'LOGIN_REQUIRED');
  });

  it('hides tool and step sections when the AI gave none', () => {
    const bare = ready({ cases, ai: { ...summary, requiredTools: [], first100TractionPlaybook: [] } });
    expect(bare).not.toContain('必要ツール');
    expect(bare).not.toContain('初動の手順');
  });
});

describe('when the AI summary is not shown', () => {
  it('invites a signed-out user to log in', () => {
    const html = ready({ cases, ai: null, aiUnavailableReason: 'LOGIN_REQUIRED' });
    expect(html).toContain('ログインするとAIのまとめも出ます');
    expect(button(html, 'Googleでログイン')).toBeDefined();
    expect(html).not.toContain('AIの推定');
    expect(html).not.toContain('Builderで作る');
  });

  it('does not ask a signed-in user to log in again', () => {
    const html = ready({ cases, ai: null, aiUnavailableReason: 'LOGIN_REQUIRED' }, { signedIn: true });
    expect(html).not.toContain('ログインするとAIのまとめも出ます');
    expect(html).not.toContain('Googleでログイン');
    expect(html).toContain('もう一度「調べる」を押すと、AIのまとめも出ます');
  });

  it.each(['NOT_CONFIGURED', 'FAILED'] as const)('says the AI summary is unavailable for %s and still shows the cases', (reason) => {
    const html = ready({ cases, ai: null, aiUnavailableReason: reason });
    expect(html).toContain('AIのまとめは現在使えません。似た事例だけ表示しています');
    expect(html).not.toContain('Googleでログイン');
    expect(html).toContain('Zukan Cloud');
  });

  it('tells the user when the login attempt itself failed', () => {
    const html = ready({ cases, ai: null, aiUnavailableReason: 'LOGIN_REQUIRED' }, { loginFailed: true });
    expect(html).toContain('ログインできませんでした。もう一度お試しください。');
  });
});

describe('terminal UI rules and wording', () => {
  const states = [
    render({ text: IDEA_TEXT }),
    render({ phase: 'loading', text: IDEA_TEXT }),
    render({ phase: 'error', problem: 'NETWORK' }),
    ready({ cases, ai: summary }, { signedIn: true, buildProblem: 'LOGIN_REQUIRED', loginFailed: true }),
    ready({ cases, ai: null, aiUnavailableReason: 'LOGIN_REQUIRED' }),
    ready({ cases: [], ai: null, aiUnavailableReason: 'NOT_CONFIGURED' }),
  ].join('\n');

  it('uses only theme tokens and shapes allowed by docs/design/TERMINAL_UI.md', () => {
    expect(states).not.toMatch(/text-\[(?:9|10|11)px\]/);
    expect(states).not.toContain('rounded-full');
    expect(states).not.toContain('rounded-lg');
    expect(states).not.toContain('rounded-xl');
    expect(states).not.toMatch(/(?:bg|text|border)-\[#/);
    expect(states).not.toMatch(/white\/\[/);
    expect(states).not.toMatch(/uppercase|tracking-widest/);
    expect(states).not.toMatch(/shadow-(?:sm|md|lg|xl)|gradient/);
    expect(states).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('never promises results and avoids consulting jargon', () => {
    expect(states).not.toMatch(/必ず|確実|絶対|保証|100%|儲かる/u);
    expect(states).not.toMatch(/MVP|ピボット|リーン|ロックイン|アービトラージ/u);
  });

  it('keeps touch targets tall on phones and compact on desktop', () => {
    expect(states).toContain('min-h-11');
    expect(states).toContain('lg:min-h-8');
  });
});

describe('the panel as mounted in the synthesis screen', () => {
  it('renders the connected panel empty, ready to type in', () => {
    const html = renderToStaticMarkup(<IdeaResearchPanel />);
    expect(html).toContain('自分のアイデアを調べる');
    expect(html).toContain('0 / 1000');
    expect(html).not.toContain('aria-label="似た事例"');
  });

  it('sits above the existing sources sidebar and workspace, which are left in place', () => {
    const html = renderToStaticMarkup(
      <StrategySynthesisView allEntities={[]} bookmarkedIds={new Set()} notes={{}} onSaveNote={() => undefined} currency="JPY" />,
    );
    const panel = html.indexOf('自分のアイデアを調べる');
    const sidebar = html.indexOf('検討に使う事例とメモ');
    const workspace = html.indexOf('企画案（');
    expect(panel).toBeGreaterThanOrEqual(0);
    expect(sidebar).toBeGreaterThan(panel);
    expect(workspace).toBeGreaterThan(sidebar);
    expect(html).toContain('事例とメモ');
    expect(html).toContain('企画案・相談');
  });
});

import type { SynthesizedIdea } from '@/shared/terminal';

export interface BuildSpec {
  version: 1;
  sourceIdeaId: string;
  productName: string;
  summary: string;
  targetCustomer: string;
  problemToSolve: string;
  businessModel: {
    type: 'subscription-first';
    monthlyProfitHypothesisJpy: number;
    operatingMarginHypothesis: number;
    note: string;
  };
  mvpFeatures: string[];
  pages: string[];
  suggestedStack: string[];
  constraints: string[];
  acceptanceCriteria: string[];
}

function compact(value: string, max = 1200): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max);
}

export function createBuildSpec(idea: SynthesizedIdea): BuildSpec {
  const tools = idea.requiredTools
    .map((tool) => compact(tool.name, 120))
    .filter(Boolean)
    .slice(0, 8);

  return {
    version: 1,
    sourceIdeaId: idea.id,
    productName: compact(idea.title, 180) || 'New product',
    summary: compact(idea.structuralArbitrage, 1500),
    targetCustomer: compact(idea.targetPainWallet, 1200),
    problemToSolve: compact(idea.targetPainWallet, 1200),
    businessModel: {
      type: 'subscription-first',
      monthlyProfitHypothesisJpy: Math.max(0, Math.round(idea.projectedMonthlyProfitJpy)),
      operatingMarginHypothesis: Math.max(0, Math.min(100, Math.round(idea.operatingMargin))),
      note: '売上・利益は機会データからの仮説値。画面上では実績値と誤認させず、検証前の想定として扱う。',
    },
    mvpFeatures: [
      '価値が1画面で分かるランディングページ',
      'メールまたはソーシャルログイン',
      '対象顧客が主要作業を完了できる1本のコアワークフロー',
      '利用状況を確認できるシンプルなダッシュボード',
      '料金プランと請求導線。実決済キーが無い環境では安全なデモ状態にする',
      'アカウント設定・解約導線・データ削除導線',
      '最低限のエラー状態、空状態、ローディング状態',
    ],
    pages: ['/', '/login', '/dashboard', '/billing', '/settings'],
    suggestedStack: [
      'Next.js 16 App Router',
      'TypeScript',
      'Tailwind CSS 4',
      ...tools,
    ].slice(0, 12),
    constraints: [
      '秘密鍵・APIキーをクライアントコードへ埋め込まない',
      '外部APIの認証情報が無い場合は、壊れた画面ではなくデモデータで主要体験を確認できるようにする',
      '架空の顧客数・売上・成功率を実績として表示しない',
      'スパム、自演、なりすまし、不正取得などを機能または成長施策として実装しない',
      'モバイルとデスクトップの両方で操作可能にする',
      '最初から巨大な管理画面を作らず、主要な購入理由に直結する機能だけを優先する',
    ],
    acceptanceCriteria: [
      '初回表示で何のサービスか、誰向けか、何が解決されるかが分かる',
      'ログイン後、ユーザーが主要ワークフローを最後まで試せる',
      'エラーで白画面にならず、再試行可能な状態を表示する',
      '料金・解約条件が確認できる',
      'ビルドが成功し、プレビュー上で主要画面を移動できる',
    ],
  };
}

export function renderBuildPrompt(spec: BuildSpec): string {
  return [
    '以下の事業機会を、実際に触れる最小のWebサービスMVPとして実装してください。',
    '見た目だけのモックではなく、主要導線がつながるところまで作ってください。',
    'ただし外部サービスの秘密鍵は要求せず、鍵が無い機能は安全なデモ状態で動かしてください。',
    '',
    'BUILD SPEC:',
    JSON.stringify(spec, null, 2),
    '',
    '実装方針:',
    '- Next.js App Router + TypeScriptを基本とする。',
    '- UIはAI生成テンプレート感を避け、情報密度は高くしつつ直感的にする。',
    '- 主要CTAは1つに絞り、ユーザーが次に何をすべきか迷わない画面にする。',
    '- 本番用の秘密情報は環境変数から読む設計にし、値をコードへ直書きしない。',
    '- 生成後に自分でビルドエラーを確認し、直せるものは修正してから完了する。',
  ].join('\n');
}

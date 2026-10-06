import { describe, expect, it } from 'vitest';
import { checkLead } from './lead-standard';
import { numbersIn, numbersMissingFrom } from './number-evidence';

const evidence = {
  facts: [{ id: 'f1', text: '1年目は読者約65万人。直接の支払いは321件で3,676ドル。2014年7月まで。' }, { id: 'f2', text: '月額は29ドル。' }],
  metrics: [{ id: 'm1', amount: 3676, period: '公開1年目' }],
};

describe('数字の読み取り', () => {
  it('単位と全角を値に直す', () => {
    expect(numbersIn('65万人')).toEqual([650000]);
    expect(numbersIn('$10K と ２．９％')).toEqual([10000, 2.9]);
    expect(numbersIn('3,676ドル')).toEqual([3676]);
  });
  it('材料に無い数字だけ返す。1桁の件数は数えない', () => {
    expect(numbersMissingFrom('65万人が3つのサイトから321件払った', [650000, 321])).toEqual([]);
    expect(numbersMissingFrom('月$5万を払った', [650000])).toEqual([50000]);
  });
});

describe('リードの機械検査', () => {
  const ok = (text: string, basis = ['f1']) => checkLead({ text, basis }, evidence);
  it('人・行動・出典にある数字のリードは通る', () => {
    expect(ok('広告を置かず、65万人に無料で読ませた組版の本で、フォントを売って元を取った弁護士。').ok).toBe(true);
  });
  it('出どころの断り書き・推計の語は不可', () => {
    expect(ok('1年目の支払いは3,676ドル（本人公表）。').problems).toContain('disclaimer');
    expect(ok('1年目に3,676ドルを推計で稼いだ。').problems).toContain('disclaimer');
  });
  it('basis の事実に無い数字・幅は不可', () => {
    expect(ok('1年目に9,999ドルを稼いだ。').problems).toContain('number-without-source');
    expect(ok('1年目に3,676ドルを稼いだ。', ['f2']).problems).toContain('number-without-source');
    expect(ok('1年目に3,000ドル〜4,000ドルを稼いだ。').problems).toContain('number-range');
  });
  it('具体物の無い製品説明と、3文以上は不可', () => {
    expect(ok('請求をまとめるツールを提供する。').problems).toContain('product-description');
    expect(ok('組版の本を公開した。フォントを売った。弁護士だ。').problems).toContain('too-many-sentences');
    expect(ok('').problems).toEqual(['empty']);
  });
  it('字数は基準にしない（長くても他に問題が無ければ通る）', () => {
    expect(ok('広告も有料の壁も置かず、65万人に無料で読ませた組版の本を入口に、自作フォントを買わせて元を取った弁護士兼書体デザイナーの、2014年から続く商売。').ok).toBe(true);
  });
});

/**
 * リード基準の fixture 表。悪い例は独立レビュー M2 の再現文と、20件版の採点（reports/spec-scoring.md 表B）の原文。
 * 良い例は「人・行動・結果が1〜2文で浮かぶ」文。数字の出どころ検査は別で見るので、ここでは文自体を材料に渡す。
 */
const BAD_LEADS: Array<[string, string]> = [
  ['M2 料金の説明', '月額29ドルで請求書を自動作成するクラウド型の経理ソフト。'],
  ['M2 業界初', '業界初の、請求書作成を自動化するAI経理プラットフォーム。'],
  ['M2 業務基盤', '中小企業向けにプロジェクト管理を一元化するクラウド型の業務基盤。'],
  ['M2 公開年だけ', '2024年に公開された、請求をまとめるツール。'],
  ['M2 短文', '請求をまとめるツールを提供する。'],
  ['M2 会社の説明', '請求業務を代行する会社。'],
  ['TalentExAfrica', 'アフリカの求人を、応募者は無料で探せる。TalentExAfricaは求人を出す企業に、投稿前の確認を求める。'],
  ['Hostman 料金', '新規AIエージェントは月0.10ドル＋トークン従量。従量方式の料金は残高から毎時引く。'],
  ['Sender 制度', '紹介者には継続30%の報酬を掲げる、メール配信のSender。'],
  ['Attio 自称数字', '顧客3万超を掲げるCRM。'],
  ['Cleanvoice 枠', '月ごとの処理枠を有料プランで提供する音声編集AI。'],
  ['EmailJS', 'メール送信用のサーバーコードを書く手間を省くEmailJSは、月ごとのリクエスト枠を有料で提供する。'],
  ['HazeOver 製品+価格', '背景の窓を暗くする道具を4.99ドルで売るMaxim Ananov。'],
  ['Clop 機能', '画像をコピーするたび、軽くしてそのまま貼り付ける。'],
  ['Contexts 製品+価格', '9.99ドルの窓切り替えソフトContextsは、同居家族6人まで共有できる。'],
  ['Litur 機能', 'カメラで拾った色を、SwiftUIの色コードへ。'],
  ['Blip 料金体系', '仕事で使う人は年払いで1人300ドル、一緒に作業する顧客は契約不要。'],
  ['Ice 収益の置き方', 'メニューバー整理ツールIceは無料で配り、開発支援をGitHub SponsorsとBuyMeACoffeeで募る。'],
  ['Presentify 実績+説明', '発売時のProduct Hunt7位を掲げる、画面に矢印を描くPresentify。'],
  ['合成 サブスク', '月額980円で全機能が使い放題になるサブスクリプションのサービス。'],
  ['合成 ソリューション', '現場の課題を解決するクラウド型の業務ソリューション。'],
];
const GOOD_LEADS: Array<[string, string]> = [
  ['オーナー例', '7年・5作超で累計売上$100だった副業開発者が、価格を上げて1年足らずに月$7,500へ。'],
  ['Practical Typography', '広告を置かず、65万人に無料で読ませた組版の本で、フォントを売って元を取った弁護士。'],
  ['ITProfiles 転機', '2025年、スポンサー掲載を廃止したITProfiles。'],
  ['NCache 転換', '2003年に受託開発をやめ、キャッシュ製品の会社へ転換した2人組。'],
  ['Requestly 加入', '2025年5月、個人開発から始めたRequestlyがBrowserStackに加わった。'],
  ['合成 売却', '3人で作った家計簿アプリを、創業4年目に買い手へ売却した。'],
  ['合成 撤退', '月20ドルの有料プランを廃止し、買い切り1本に絞った開発者。'],
  ['合成 最初の客', '最初の客は、創業者が前の職場の元同僚に直接声をかけて獲得した。'],
  ['合成 ピボット', '3回のピボットで貯金を使い切った創業者が、4作目で月$3,000を超えた。'],
  ['合成 値上げ', '値上げを3回断念した末に、月額を2倍にして解約が増えなかった店主。'],
];
describe('リード基準の fixture 表（良い例と悪い例）', () => {
  it('悪い例は20件以上あり、すべて落ちる', () => {
    expect(BAD_LEADS.length).toBeGreaterThanOrEqual(20);
    for (const [name, text] of BAD_LEADS) {
      const v = checkLead({ text, basis: ['f'] }, { facts: [{ id: 'f', text }], metrics: [] });
      expect({ name, ok: v.ok }).toEqual({ name, ok: false });
    }
  });
  it('悪い例のうち製品説明の型は product-description で落ちる', () => {
    for (const [name, text] of BAD_LEADS.filter(([n]) => !n.startsWith('TalentExAfrica') && !n.startsWith('Hostman'))) {
      const v = checkLead({ text, basis: ['f'] }, { facts: [{ id: 'f', text }], metrics: [] });
      expect({ name, problems: v.problems }).toEqual({ name, problems: expect.arrayContaining(['product-description']) });
    }
  });
  it('良い例は10件、すべて通る', () => {
    expect(GOOD_LEADS.length).toBeGreaterThanOrEqual(10);
    for (const [name, text] of GOOD_LEADS) {
      const v = checkLead({ text, basis: ['f'] }, { facts: [{ id: 'f', text }], metrics: [] });
      expect({ name, problems: v.problems }).toEqual({ name, problems: [] });
    }
  });
});

describe('「約」の丸め', () => {
  it('約が付いた数字は材料の値と10%以内なら通り、桁違いは通さない', () => {
    expect(numbersMissingFrom('約6万ドルを売った', [61392])).toEqual([]);
    expect(numbersMissingFrom('約3万ドルを売った', [61392])).toEqual([30000]);
    expect(numbersMissingFrom('6万ドルを売った', [61392])).toEqual([60000]);
  });
});

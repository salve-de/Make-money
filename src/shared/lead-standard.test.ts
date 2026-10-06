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

describe('「約」の丸め', () => {
  it('約が付いた数字は材料の値と10%以内なら通り、桁違いは通さない', () => {
    expect(numbersMissingFrom('約6万ドルを売った', [61392])).toEqual([]);
    expect(numbersMissingFrom('約3万ドルを売った', [61392])).toEqual([30000]);
    expect(numbersMissingFrom('6万ドルを売った', [61392])).toEqual([60000]);
  });
});

import { ImageResponse } from 'next/og';
import { OG_IMAGE_ALT } from '@/lib/site/metadata';

export const alt = OG_IMAGE_ALT;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// 色は src/app/globals.css の端末トークンと同じ値（画像生成では CSS 変数が使えない）。
const BG = '#0a0b0c';
const PANEL = '#111214';
const HEAD = '#16171a';
const LINE = '#26282c';
const FG = '#ffffff';
const SUB = '#b4b8be';
const ACCENT = '#ff9f1a';

/**
 * サイト共通の共有画像。外部フォントを取りに行かず（Workers でも通信なしで動く）、
 * 同梱の欧文書体だけで描く。このため画像内の文字は英数字のみ。日本語の説明は共有時のタイトル・説明文が受け持つ。
 * 事例ごとの画像は、第三者の画像を使わない方針（docs/MEDIA_THUMBNAIL_AND_LIKENESS_POLICY.md）のため作らない。
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', background: BG, border: `2px solid ${LINE}` }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 56, padding: '0 40px', background: HEAD, borderBottom: `2px solid ${LINE}`, color: ACCENT, fontSize: 26, fontWeight: 700, letterSpacing: 2 }}>
          MAKE MONEY
        </div>
        <div style={{ display: 'flex', flex: 1, flexDirection: 'column', justifyContent: 'center', padding: '0 80px' }}>
          <div style={{ display: 'flex', fontSize: 132, fontWeight: 700, color: FG, lineHeight: 1.05 }}>MAKE MONEY</div>
          <div style={{ display: 'flex', width: 160, height: 6, background: ACCENT, margin: '36px 0' }} />
          <div style={{ display: 'flex', fontSize: 40, color: SUB }}>Business case database</div>
        </div>
        <div style={{ display: 'flex', height: 48, alignItems: 'center', padding: '0 40px', background: PANEL, borderTop: `2px solid ${LINE}`, color: SUB, fontSize: 22 }}>
          SOURCED  /  DATED  /  CHECKED
        </div>
      </div>
    ),
    size,
  );
}

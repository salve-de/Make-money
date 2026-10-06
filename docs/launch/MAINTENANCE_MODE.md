# メンテナンスモード（設計案）

状態: `src/proxy.ts` に組み込み済み（Stripe の通知口 `/api/webhooks/stripe` は除外）。実際の切り替え動作の確認は未実施。表示画面は `src/app/maintenance/page.tsx`。

## 切り替え
- 環境変数 `MAINTENANCE_MODE=1` のときだけメンテナンス表示に切り替える。それ以外（未設定・0）は通常動作。
- `NEXT_PUBLIC_` を付けない。ビルドに埋め込まず、実行時の値を読む。Cloudflare では環境の変数（vars / secrets）を変えて再デプロイすれば切り替わる。コード変更・再ビルドは要らない。

## proxy への差し込み案
既存の preview 判定より前に置く。

```ts
const MAINTENANCE_EXEMPT = /^\/(?:_next\/|maintenance(?:\/|$)|robots\.txt$|sitemap\.xml$|favicon\.ico$|opengraph-image)/;

function maintenanceResponse(request: NextRequest): NextResponse | null {
  if (process.env.MAINTENANCE_MODE !== '1') return null;
  const { pathname } = request.nextUrl;
  if (MAINTENANCE_EXEMPT.test(pathname)) return null;
  const headers = { 'Retry-After': '3600', 'Cache-Control': 'no-store' };
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'MAINTENANCE' }, { status: 503, headers });
  }
  return NextResponse.rewrite(new URL('/maintenance', request.url), { status: 503, headers });
}

export function proxy(request: NextRequest) {
  const maintenance = maintenanceResponse(request);
  if (maintenance) return maintenance;
  // …既存の preview 処理…
}
```

## 判断の理由
- 状態コードは 200 でなく **503 + Retry-After**。検索エンジンに「一時的」と伝わり、順位や索引が落ちにくい。
- `robots.txt` と `sitemap.xml` は除外する。robots.txt が 5xx だと、クローラーが全体を拒否と扱うことがある。
- `/_next/` は除外する（画面の部品を読めなくなる）。
- `/api/` は JSON の 503。決済の完了通知（Stripe の通知口）を新設した場合は、受け取り漏れを避けるため除外に加えるか、メンテナンス前に止める手順を決める。通知の受け口 `/api/webhooks/stripe` は除外済み。
- 書き込み系を止めたいだけの時は、画面全体でなく `/api/` だけを 503 にする分岐（`MAINTENANCE_MODE=api`）を足せる。必要になるまで作らない。

## 確認方法
1. `MAINTENANCE_MODE=1` で起動し、`/` と `/discover` が 503 でメンテナンス画面になること。
2. `/robots.txt` が 200 のままであること。
3. `/api/catalog` が 503 の JSON であること。
4. 変数を外すと元に戻ること。

import React, { Suspense } from 'react';
import { TerminalShell } from '../platform/components/layout/TerminalShell';
import { isCatalogId } from '@/shared/catalog-membership';
export const dynamic = 'force-dynamic';

/**
 * トップ。事例の一覧は、公開目録（data/catalog-release.json）の事例だけをブラウザが /api/catalog から読む。
 * サーバーでは事例を読まない（本番でも手元の開発画面でも、どのワークツリーでも同じ動き）。
 * ?entity= が目録に無い時は、名前も出さず「この事例は公開していません」とだけ表示する。
 */
export default async function Home(props: { searchParams?: Promise<{ entity?: string }> }) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const requested = searchParams?.entity;
  const unpublished = Boolean(requested) && !isCatalogId(requested);

  return (
    <Suspense fallback={<div className="term-page bg-term-bg" />}>
      {unpublished ? <aside role="status" className="border-b border-term-line bg-term-panel p-3 text-sm text-term-fg">
        この事例は公開していません。
      </aside> : null}
      <TerminalShell initialEntities={[]} />
    </Suspense>
  );
}

/**
 * 詳細の正本の規則（1か所）。
 *
 * 公開版（curated / 公開中の事例）が、同じ ID の Foundation 候補や reader の無いデータで置き換わってはいけない。
 * 置き換わりを判断する場所（サーバーの詳細 API、クライアントの取得後の上書き、取得済み判定、一覧の統合）は
 * すべてこのファイルの関数を通す。
 */
import type { FinancialEntity } from './terminal';

type ReaderBearing = Pick<FinancialEntity, 'reader'>;

/** reader（出典つきの事実と推測印つきの推論）を持つ事例か。詳細画面はこれだけを読む。 */
export function hasReader(entity: ReaderBearing | null | undefined): boolean {
  return Boolean(entity?.reader);
}

/**
 * 詳細を取りに行かなくてよいか。
 * - reader を持つ: 公開版の詳細をすでに持っている。
 * - 一覧の行がすでに証拠つきの完全な事例（公開版を使わないローカル・E2E の作業ツリーの事例）: 取りに行っても同じ中身。
 * 公開版の一覧の行は要約だけなので、reader が入るまでは取りに行く。
 */
export function isDetailSettled(entity: Pick<FinancialEntity, 'reader' | 'evidenceCards'> | null | undefined): boolean {
  if (!entity) return false;
  return hasReader(entity) || (entity.evidenceCards?.length ?? 0) >= 2;
}

/** 詳細の上書きを認めるか。reader を持つ詳細を、reader の無いもので置き換えない。 */
export function mayReplaceDetail(current: ReaderBearing | null | undefined, incoming: ReaderBearing): boolean {
  return !(hasReader(current) && !hasReader(incoming));
}

/** 上書きを認める時だけ incoming を、認めない時は current を返す。 */
export function preferDetail<T extends ReaderBearing>(current: T | null | undefined, incoming: T): T {
  return current && !mayReplaceDetail(current, incoming) ? current : incoming;
}

/**
 * Foundation の候補が、同じ ID の curated（公開版の一覧にある）事例の詳細・要約を置き換えてよいか。
 * 公開中の事例は公開版が正本なので、curated が公開版の印（reader か latestDossierHash）を持つ間は置き換えない。
 * curated 側が無い（Foundation にだけある）事例には関係しない。
 */
export function mayFoundationReplaceCurated(curated: Pick<FinancialEntity, 'reader' | 'latestDossierHash'> | null | undefined): boolean {
  return !curated || !(hasReader(curated) || curated.latestDossierHash);
}

/** サーバー: 公開版の目録にある ID は、Foundation の詳細を優先せず・単独でも返さない。 */
export function foundationMayServeDetail(idIsInReleaseManifest: boolean): boolean {
  return !idIsInReleaseManifest;
}

import type { OwnedMarketplaceListing } from '@/shared/marketplace-listing';
import { LISTING_ONLY, type DistributionStatus, type DistributionTerms } from '@/shared/marketplace-distribution';

import { canRefer, ownedProducts, readRelayJson, sessionFor, timeoutSignal, type RelayClient, type RelayProduct } from './client';
import { DistributionError, fail, parseTerms, publicHttps, record, reference, relayOrigin, verifiedDestination } from './contract';
import { distributionClient } from './runtime';
import * as store from './store';

/**
 * 掲載 → SellRelay 商品の対応 → 別アカウントの紹介者の専用リンク → 作者の既存の申込み・決済URL。
 * 作者への入金・決済先は変えない。Make-Money は報酬の記録・支払いを持たない（SellRelay 側の責任）。
 */

async function sha256Hex(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** 連携した時の掲載内容。変わったら古い対応を使い回さない。 */
function fingerprint(listing: OwnedMarketplaceListing): Promise<string> {
  return sha256Hex(JSON.stringify([listing.listingId, listing.title, listing.summary, listing.productUrl, listing.checkoutUrl, listing.status]));
}

function clientOrFail(): RelayClient {
  return distributionClient() ?? fail('RELAY_NOT_CONNECTED', 503);
}

function sameClient(row: store.LinkRow, client: RelayClient): boolean {
  return row.mode === client.mode && row.relay_origin === relayOrigin(client.origin);
}

async function unchanged(row: store.LinkRow, listing: OwnedMarketplaceListing): Promise<boolean> {
  return row.fingerprint === await fingerprint(listing);
}

function status(state: DistributionStatus['state'], client: RelayClient, canLink = false, refer = false): DistributionStatus {
  return { state, mode: client.mode, canLink, canRefer: refer, referralUrl: null };
}

function matching(product: RelayProduct, payload: Record<string, unknown>): boolean {
  return Object.entries(payload).filter(([key]) => key !== 'submit').every(([key, value]) => {
    const actual = product[key as keyof RelayProduct];
    return key === 'platforms'
      ? Array.isArray(actual) && JSON.stringify([...actual].sort()) === JSON.stringify(value)
      : actual === value;
  });
}

async function confirm(row: store.LinkRow, product: RelayProduct): Promise<void> {
  if (product.owner_id !== row.relay_owner_id) fail('RELAY_IDENTITY_MISMATCH', 403);
  if (!await unchanged(row, await store.ownedPublishedListing(row.owner_id, row.listing_id))) fail('LISTING_CHANGED');
  await store.markLink(row.listing_id, 'linked', reference(product.id));
}

/** 掲載者（listingId）または閲覧者（slug）から見た連携の状態。未接続なら listing_only。 */
export async function distributionStatus(input: { listingId: string } | { slug: string }, userId: string | null): Promise<DistributionStatus> {
  if ('listingId' in input) {
    if (!userId) fail('AUTH_REQUIRED', 401);
    const listing = await store.ownedPublishedListing(userId, reference(input.listingId));
    const client = distributionClient();
    if (!client) return { ...LISTING_ONLY };
    const session = await sessionFor(client, userId);
    if (!session) return status('account_required', client);
    const row = await store.linkFor(listing.listingId);
    if (!row) return status('unlinked', client, true);
    if (!sameClient(row, client)) fail('RELAY_NOT_CONNECTED', 503);
    if (!await unchanged(row, listing)) fail('LISTING_CHANGED');
    if (session.subject !== row.relay_owner_id) fail('RELAY_IDENTITY_MISMATCH', 403);
    return row.state === 'linked' ? status('linked', client) : status('checking', client, true);
  }

  // 閲覧者向け：連携が確かでない時は、理由を出さずに「掲載のみ」に戻す。
  const { listing, owner } = await store.publishedListingBySlug(reference(input.slug));
  const client = distributionClient();
  if (!client) return { ...LISTING_ONLY };
  const row = await store.linkFor(listing.listingId);
  if (!row || row.state !== 'linked' || !row.relay_product_id || !sameClient(row, client) || !await unchanged(row, listing)) {
    return { ...LISTING_ONLY };
  }
  if (!userId) return status('account_required', client);
  const session = await sessionFor(client, userId);
  const existing = await store.referralFor(listing.listingId, userId);
  if (existing && session && session.subject !== existing.relay_partner_id) fail('RELAY_IDENTITY_MISMATCH', 403);
  const allowed = !!session && userId !== owner && session.subject !== row.relay_owner_id
    && await canRefer(session, row.relay_product_id);
  return { ...status('linked', client, false, allowed), referralUrl: existing && allowed ? `/marketplace/go/${existing.public_code}` : null };
}

/**
 * 公開中の自分の掲載を SellRelay の商品下書き（submit=false）として作る。承認・販売準備は SellRelay 側で作者が行う。
 * SellRelay の POST /api/products は重複防止キーを持たないため、応答が消えた時は再送せず、作者の商品一覧と照合する。
 */
export async function connectListing(userId: string, listingId: string, value: unknown): Promise<DistributionStatus> {
  const listing = await store.ownedPublishedListing(userId, reference(listingId));
  const client = clientOrFail();
  const session = await sessionFor(client, userId);
  if (!session) fail('ACCOUNT_REQUIRED');
  const terms: DistributionTerms = parseTerms(value);
  const website = publicHttps(listing.productUrl);
  const destination = publicHttps(listing.checkoutUrl || website);
  if (website.length > 500 || new URL(destination).searchParams.has('sr_attribution') || new URL(website).searchParams.has('sr_attribution')) {
    fail('UNSAFE_URL', 400);
  }
  const payload = { ...terms, website, submit: false };
  const serialized = JSON.stringify(payload);
  const row = await store.reserveLink({
    listing_id: listing.listingId, owner_id: userId, relay_owner_id: session.subject, relay_origin: relayOrigin(client.origin),
    mode: client.mode, fingerprint: await fingerprint(listing), product_payload: serialized, destination_url: destination,
  });
  if (!sameClient(row, client)) fail('RELAY_NOT_CONNECTED', 503);
  if (!await unchanged(row, listing)) fail('LISTING_CHANGED');
  if (row.owner_id !== userId || row.relay_owner_id !== session.subject) fail('RELAY_IDENTITY_MISMATCH', 403);
  if (row.product_payload !== serialized) fail('TERMS_CHANGED');

  const matches = (await ownedProducts(session)).filter((product) => matching(product, payload));
  if (row.relay_product_id) {
    if (!matches.some((product) => product.id === row.relay_product_id)) fail('RELAY_PRODUCT_CHANGED');
    return status('linked', client);
  }
  if (matches.length > 1) fail('PRODUCT_MATCH_AMBIGUOUS');
  if (matches.length === 1) {
    await confirm(row, matches[0]);
    return status('linked', client);
  }
  if (row.state !== 'prepared' || !await store.claimLink(listing.listingId)) return status('checking', client, true);
  try {
    const response = await session.request('/api/products', { method: 'POST', body: payload, signal: timeoutSignal() });
    if (!response.ok) {
      // 入力・認証・回数の拒否は作成前に起きるので、明示の再試行を許す。それ以外は作られたかもしれないので照合待ち。
      await store.markLink(listing.listingId, [400, 401, 403, 422, 429].includes(response.status) ? 'prepared' : 'checking');
      fail('RELAY_PRODUCT_REJECTED', 502);
    }
    const productId = reference(record(await readRelayJson(response)).id);
    const created = (await ownedProducts(session)).find((product) => product.id === productId && matching(product, payload));
    if (!created) {
      await store.markLink(listing.listingId, 'checking');
      return status('checking', client, true);
    }
    await confirm(row, created);
    return status('linked', client);
  } catch (error) {
    // はっきり拒否された prepared と、並行して確定した linked はそのまま残す。
    const current = await store.linkFor(listing.listingId);
    if (current?.state === 'sending') await store.markLink(listing.listingId, 'checking');
    throw error;
  }
}

/** 保存済みの条件で照合をやり直す。ブラウザから商品IDや持ち主を上書きさせない。 */
export async function reconcileListing(userId: string, listingId: string): Promise<DistributionStatus> {
  await store.ownedPublishedListing(userId, reference(listingId));
  const row = await store.linkFor(listingId);
  if (!row || row.owner_id !== userId) fail('LISTING_NOT_LINKED');
  const saved = record(JSON.parse(row.product_payload));
  const terms = Object.fromEntries(Object.entries(saved).filter(([key]) => key !== 'website' && key !== 'submit'));
  return connectListing(userId, listingId, terms);
}

/** 別アカウントの紹介者として、SellRelay の紹介を作り、Make-Money の公開コードへ対応付ける。 */
export async function createReferral(userId: string, slug: string, kind: unknown): Promise<DistributionStatus> {
  if (kind !== 'partner') fail('PLATFORM_REFERRAL_NOT_IMPLEMENTED', 400);
  const { listing, owner } = await store.publishedListingBySlug(reference(slug));
  if (owner === userId) fail('SELF_REFERRAL');
  const client = clientOrFail();
  const row = await store.linkFor(listing.listingId);
  if (!row || row.state !== 'linked' || !row.relay_product_id) fail('LISTING_NOT_LINKED');
  if (!sameClient(row, client)) fail('RELAY_NOT_CONNECTED', 503);
  if (!await unchanged(row, listing)) fail('LISTING_CHANGED');
  const session = await sessionFor(client, userId);
  if (!session) fail('ACCOUNT_REQUIRED');
  if (session.subject === row.relay_owner_id) fail('SELF_REFERRAL');
  if (!await canRefer(session, row.relay_product_id)) fail('REFERRAL_NOT_READY');
  // 再試行でも SellRelay の作成口を使う（報酬条件の正本は SellRelay 側にある）。
  const response = await session.request(`/api/products/${reference(row.relay_product_id)}/referral`, { method: 'POST', signal: timeoutSignal() });
  if (!response.ok) fail('REFERRAL_NOT_READY', response.status === 403 ? 403 : 409);
  const referral = record(await readRelayJson(response));
  if (referral.product_id !== row.relay_product_id || referral.user_id !== session.subject) fail('RELAY_IDENTITY_MISMATCH', 403);
  const relayCode = reference(referral.code);
  if (!await unchanged(row, (await store.publishedListingBySlug(slug)).listing)) fail('LISTING_CHANGED');
  const saved = await store.saveReferral({
    public_code: crypto.randomUUID().replaceAll('-', ''), listing_id: listing.listingId,
    partner_id: userId, relay_partner_id: session.subject, relay_code: relayCode,
  });
  if (saved.relay_partner_id !== session.subject || saved.relay_code !== relayCode) fail('RELAY_REFERRAL_CHANGED');
  return { ...status('linked', client, false, true), referralUrl: `/marketplace/go/${saved.public_code}` };
}

/**
 * 公開コードから転送先を決める。SellRelay の紹介リンクを転送を追わずに開き、返された転送先が
 * 作者の登録したURLに紹介の印を足しただけの時に限り、そこへ送る。
 */
export async function referralDestination(code: string): Promise<string> {
  if (!/^[a-f0-9]{32}$/.test(code)) fail('REFERRAL_NOT_FOUND', 404);
  const referral = await store.referralByCode(code);
  if (!referral) fail('REFERRAL_NOT_FOUND', 404);
  const row = await store.linkFor(referral.listing_id);
  if (!row || row.state !== 'linked') fail('REFERRAL_NOT_FOUND', 404);
  const listing = await store.ownedPublishedListing(row.owner_id, row.listing_id);
  if (!await unchanged(row, listing)) fail('LISTING_CHANGED');
  const client = clientOrFail();
  if (!sameClient(row, client)) fail('RELAY_NOT_CONNECTED', 503);
  const response = await client.visit(`/r/${reference(referral.relay_code)}`, { redirect: 'manual', signal: timeoutSignal() });
  if (response.status !== 303) fail('REFERRAL_NOT_READY');
  if (!await unchanged(row, await store.ownedPublishedListing(row.owner_id, row.listing_id))) fail('LISTING_CHANGED');
  const location = response.headers.get('location');
  try {
    return verifiedDestination(location, row.destination_url);
  } catch (error) {
    if (!(error instanceof DistributionError)) throw error;
    return verifiedDestination(location, listing.productUrl);
  }
}

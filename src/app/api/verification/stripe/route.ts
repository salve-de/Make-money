import { NextRequest, NextResponse } from 'next/server';

import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { consumeRequestRateLimit } from '@/lib/security/rate-limit';
import { createStripeClientForKey, paymentLiveMode } from '@/lib/stripe';
import { findEntitySite, type EntitySite } from '@/lib/verification/entity-site';
import { isSharedSiteDomain, siteDomain } from '@/lib/verification/site-domain';
import { proveSiteOwnership, siteOwnershipDnsName, siteOwnershipToken } from '@/lib/verification/site-ownership';
import { getLastVerifiedAt, insertVerification } from '@/lib/verification/store';
import {
  readStripeVerification,
  RevenueTooLargeError,
  StripeKeyRejectedError,
  StripePermissionMissingError,
  StripeUpstreamError,
  type StripeVerificationOutcome,
} from '@/lib/verification/stripe-revenue';
import { sha256Sync } from '@/shared/sha256';
import { compileParser } from '@/shared/validate-json';
import {
  SITE_OWNERSHIP_FILE_PATH,
  STRIPE_READ_PERMISSIONS,
  VERIFICATION_COOLDOWN_SECONDS,
  type SiteOwnershipChallenge,
  type VerificationErrorCode,
  type VerificationErrorResponse,
  type VerificationLookupResponse,
  type VerifiedRevenue,
} from '@/shared/verification';

export const dynamic = 'force-dynamic';

const MAX_BODY_BYTES = 8 * 1024;
const HOUR_MS = 60 * 60 * 1000;
/** 試行そのものの上限（同じ接続元から1時間に）。キーの総当たりや、Stripeへの連打を防ぐ。 */
const ATTEMPT_LIMIT = 30;
const headers = { 'Cache-Control': 'private, no-store', Vary: 'Authorization' };

const parseBody = compileParser<{ entityId: string; restrictedKey: string }>({
  type: 'object',
  additionalProperties: false,
  required: ['entityId', 'restrictedKey'],
  properties: {
    entityId: { type: 'string', minLength: 1, maxLength: 200, pattern: '\\S' },
    restrictedKey: { type: 'string', minLength: 1, maxLength: 512 },
  },
}, 'verification request');

function respond(body: VerificationLookupResponse | VerificationErrorResponse, status = 200, extraHeaders: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...headers, ...extraHeaders } });
}

function fail(status: number, code: VerificationErrorCode, error: string, extra: Pick<VerificationErrorResponse, 'permissions' | 'retryAfterSeconds' | 'ownership'> = {}, extraHeaders: Record<string, string> = {}) {
  return respond({ error, code, ...extra }, status, extraHeaders);
}

function cooldown(retryAfterSeconds: number) {
  const seconds = Math.max(1, Math.ceil(retryAfterSeconds));
  return fail(429, 'cooldown', 'この事例の確認は、同じ人が1時間に1回までです。時間をおいてからやり直してください', { retryAfterSeconds: seconds }, { 'Retry-After': String(seconds) });
}

/** 失敗の種類だけを残す。エラー本文はキーの一部を含みうるため、出力しない。 */
function logFailure(label: string, error: unknown) {
  console.error(`[verification/stripe] ${label}:`, error instanceof Error ? error.name : 'unknown');
}

async function userIdFrom(request: NextRequest): Promise<string | null> {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  return (await verifyFirebaseIdToken(auth.slice(7)))?.uid ?? null;
}

type KeyCheck =
  | { ok: true; key: string; live: boolean }
  | { ok: false; code: 'key_not_restricted' | 'key_malformed'; error: string };

function checkKey(raw: string): KeyCheck {
  const key = raw.trim();
  if (!key.startsWith('rk_live_') && !key.startsWith('rk_test_')) {
    return { ok: false, code: 'key_not_restricted', error: '読み取り専用の制限付きキー（rk_で始まるキー）を使ってください' };
  }
  if (!/^rk_(?:live|test)_[A-Za-z0-9_-]{16,}$/.test(key)) {
    return { ok: false, code: 'key_malformed', error: 'キーの形式が正しくありません。Stripeで発行したキーをそのままコピーしてください' };
  }
  return { ok: true, key, live: key.startsWith('rk_live_') };
}

function stripeFailure(error: unknown) {
  if (error instanceof StripeKeyRejectedError) {
    return fail(400, 'key_rejected', 'Stripeがこのキーを受け付けませんでした。キーが正しいか、失効していないか確認してください');
  }
  if (error instanceof StripePermissionMissingError) {
    return fail(
      400,
      'permission_missing',
      `このキーには「${error.permission}」の読み取り権限がありません。キーの権限に、${STRIPE_READ_PERMISSIONS.join('・')}を「読み取り」だけで付けてください`,
      { permissions: STRIPE_READ_PERMISSIONS },
    );
  }
  if (error instanceof RevenueTooLargeError) {
    return fail(422, 'too_many_records', '件数が多すぎるため自動確認できません');
  }
  if (error instanceof StripeUpstreamError) {
    logFailure('stripe request failed', error);
    return fail(error.rateLimited ? 429 : 502, 'stripe_unavailable', 'Stripeに接続できませんでした。しばらくしてからもう一度お試しください');
  }
  logFailure('unexpected failure', error);
  return fail(503, 'unavailable', 'いまは確認できません。しばらくしてからもう一度お試しください');
}

function outcomeFailure(outcome: Exclude<StripeVerificationOutcome, { status: 'verified' }>) {
  switch (outcome.status) {
    case 'site_mismatch':
      return fail(403, 'site_mismatch', '決済アカウントのサイトと、事例の公式サイトが一致しません');
    case 'stripe_site_missing':
      return fail(403, 'stripe_site_missing', '決済アカウントにサイトのURLが登録されていません。Stripeのビジネス設定でURLを登録してから、もう一度お試しください');
    case 'currency_missing':
      return fail(422, 'currency_missing', '決済アカウントの既定通貨を確認できないため、自動確認できません');
  }
}

function ownershipChallenge(userId: string, domain: string): SiteOwnershipChallenge {
  return { domain, token: siteOwnershipToken(userId, domain), fileUrl: `https://${domain}${SITE_OWNERSHIP_FILE_PATH}`, dnsName: siteOwnershipDnsName(domain) };
}

type OfficialSite = { ok: true; site: EntitySite; domain: string } | { ok: false; response: NextResponse };

async function officialSite(entityId: string): Promise<OfficialSite> {
  let site: EntitySite | null;
  try {
    site = await findEntitySite(entityId.trim());
  } catch (error) {
    logFailure('case lookup failed', error);
    return { ok: false, response: fail(503, 'unavailable', '事例の情報を取得できません。しばらくしてからもう一度お試しください') };
  }
  if (!site) return { ok: false, response: fail(404, 'not_found', '事例が見つかりません') };
  const domain = siteDomain(site.url);
  if (!domain) {
    return { ok: false, response: fail(403, 'entity_site_missing', 'この事例には公式サイトが登録されていないため、決済アカウントと照合できません') };
  }
  if (isSharedSiteDomain(domain)) {
    return { ok: false, response: fail(403, 'entity_site_shared', 'この事例の公式サイトは共有サービス上のページのため、決済アカウントのサイトとの一致では持ち主を確認できません') };
  }
  return { ok: true, site, domain };
}

/** ログイン中の本人に、公式サイトへ置く合言葉を返す。 */
export async function GET(request: NextRequest) {
  const userId = await userIdFrom(request);
  if (!userId) return fail(401, 'unauthorized', 'ログインしてから、もう一度お試しください');
  const entityId = request.nextUrl.searchParams.get('entity_id');
  if (!entityId || entityId.length > 200 || !/\S/.test(entityId)) return fail(400, 'invalid_request', '事例IDを送ってください');
  const official = await officialSite(entityId);
  if (!official.ok) return official.response;
  return NextResponse.json({ ownership: ownershipChallenge(userId, official.domain) }, { headers });
}

/**
 * 事例の運営者が、自分のStripeの読み取り専用キーで実際の売上を確認する。
 * キーはこの1回の確認にだけ使い、保存もログ出力もしない。
 */
export async function POST(request: NextRequest) {
  const userId = await userIdFrom(request);
  if (!userId) return fail(401, 'unauthorized', 'ログインしてから、もう一度お試しください');

  let body: { entityId: string; restrictedKey: string };
  try {
    body = parseBody(await readJsonBody(request, MAX_BODY_BYTES));
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return fail(413, 'too_large', '送信内容が大きすぎます');
    return fail(400, 'invalid_request', '事例IDと制限付きキーを送ってください');
  }

  const key = checkKey(body.restrictedKey);
  if (!key.ok) return fail(400, key.code, key.error);

  let live: boolean;
  try {
    live = await paymentLiveMode();
  } catch {
    return fail(503, 'unavailable', '決済の設定を確認できないため、いまは確認できません');
  }
  if (key.live !== live) {
    return fail(400, 'mode_mismatch', live
      ? '本番のStripeにつながっています。本番用の制限付きキー（rk_live_で始まるキー）を使ってください'
      : 'この環境はテストモードです。テスト用の制限付きキー（rk_test_で始まるキー）を使ってください');
  }

  try {
    if (!await consumeRequestRateLimit(request, 'verification-stripe', { limit: ATTEMPT_LIMIT, windowMs: HOUR_MS })) {
      return fail(429, 'too_many_attempts', '試行が多すぎます。しばらくしてからやり直してください');
    }
  } catch (error) {
    logFailure('attempt limit unavailable', error);
    return fail(503, 'unavailable', 'いまは確認できません。しばらくしてからもう一度お試しください');
  }

  const official = await officialSite(body.entityId);
  if (!official.ok) return official.response;
  const { site, domain: officialDomain } = official;

  const now = Math.floor(Date.now() / 1000);
  try {
    const last = await getLastVerifiedAt(userId, site.entityId);
    if (last !== null && now - last < VERIFICATION_COOLDOWN_SECONDS) return cooldown(VERIFICATION_COOLDOWN_SECONDS - (now - last));
  } catch (error) {
    logFailure('cooldown check failed', error);
    return fail(503, 'unavailable', 'いまは確認できません。しばらくしてからもう一度お試しください');
  }

  // Stripeのサイト欄は誰でも書き換えられるので、公式サイトを運営している証拠を先に確かめる。
  const ownership = ownershipChallenge(userId, officialDomain);
  if (!await proveSiteOwnership(officialDomain, ownership.token)) {
    return fail(403, 'site_unproven', `公式サイトの運営者であることを確認できませんでした。${ownership.fileUrl} に合言葉を置くか、DNSの ${ownership.dnsName} にTXTレコードとして登録してから、もう一度お試しください`, { ownership });
  }

  let outcome: StripeVerificationOutcome;
  try {
    outcome = await readStripeVerification(createStripeClientForKey(key.key), { officialDomain, now });
  } catch (error) {
    return stripeFailure(error);
  }
  if (outcome.status !== 'verified') return outcomeFailure(outcome);

  const verification: VerifiedRevenue = {
    entityId: site.entityId,
    provider: 'stripe',
    accountDomain: outcome.accountDomain,
    currency: outcome.currency,
    last30dRevenueMinor: outcome.last30dRevenueMinor,
    mrrMinor: outcome.mrrMinor,
    activeSubscriptions: outcome.activeSubscriptions,
    periodStart: outcome.periodStart,
    periodEnd: outcome.periodEnd,
    verifiedAt: now,
  };
  try {
    // 決済アカウントIDはハッシュだけ保存する。キー・IDそのものは、どこにも残さない。
    const saved = await insertVerification({
      id: crypto.randomUUID(),
      userId,
      accountIdHash: sha256Sync(outcome.accountId),
      revenue: verification,
    });
    if (!saved) return cooldown(VERIFICATION_COOLDOWN_SECONDS);
  } catch (error) {
    logFailure('save failed', error);
    return fail(503, 'unavailable', '確認結果を保存できませんでした。しばらくしてからもう一度お試しください');
  }
  return respond({ verification });
}

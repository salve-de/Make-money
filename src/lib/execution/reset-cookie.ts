import type { NextRequest, NextResponse } from 'next/server';

export const EXECUTION_RESET_COOKIE = 'makemoney_execution_reset';

export function readExecutionResetAt(req: NextRequest, uid: string): string | null {
  const raw = req.cookies.get(EXECUTION_RESET_COOKIE)?.value;
  if (!raw) return null;
  const separator = raw.lastIndexOf('.');
  if (separator <= 0) return null;

  let cookieUid: string;
  try {
    cookieUid = decodeURIComponent(raw.slice(0, separator));
  } catch {
    return null;
  }
  if (cookieUid !== uid) return null;

  const timestamp = Number(raw.slice(separator + 1));
  if (!Number.isSafeInteger(timestamp) || timestamp <= 0) return null;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function setExecutionResetCookie(
  response: NextResponse,
  req: NextRequest,
  uid: string,
  resetAt: string,
): void {
  const timestamp = Date.parse(resetAt);
  if (!Number.isFinite(timestamp)) throw new Error('Invalid execution reset timestamp');
  response.cookies.set(EXECUTION_RESET_COOKIE, encodeURIComponent(uid) + '.' + String(timestamp), {
    httpOnly: true,
    sameSite: 'lax',
    secure: new URL(req.url).protocol === 'https:',
    path: '/',
    maxAge: 60 * 60 * 24 * 365 * 10,
  });
}

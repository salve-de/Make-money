import { executeD1, queryD1 } from '@/lib/storage/d1';
import type { BuildSpec } from './spec';

export type BuildStatus = 'draft' | 'generating' | 'ready' | 'error';

export interface BuildSession {
  id: string;
  userId: string;
  ideaId: string;
  provider: 'v0';
  providerChatId: string | null;
  status: BuildStatus;
  buildSpec: BuildSpec;
  previewAccessToken: string;
  creditsCost: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

function parseSession(raw: unknown): BuildSession {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid build session row');
  const row = raw as Record<string, unknown>;
  const status = row.status;
  if (status !== 'draft' && status !== 'generating' && status !== 'ready' && status !== 'error') {
    throw new Error('Invalid build status');
  }
  if (
    typeof row.id !== 'string' || typeof row.userId !== 'string' || typeof row.ideaId !== 'string'
    || row.provider !== 'v0' || (row.providerChatId !== null && typeof row.providerChatId !== 'string')
    || typeof row.buildSpec !== 'string' || typeof row.previewAccessToken !== 'string'
    || typeof row.creditsCost !== 'number' || (row.lastError !== null && typeof row.lastError !== 'string')
    || typeof row.createdAt !== 'string' || typeof row.updatedAt !== 'string'
  ) throw new Error('Invalid build session row');

  return {
    id: row.id,
    userId: row.userId,
    ideaId: row.ideaId,
    provider: 'v0',
    providerChatId: row.providerChatId,
    status,
    buildSpec: JSON.parse(row.buildSpec) as BuildSpec,
    previewAccessToken: row.previewAccessToken,
    creditsCost: row.creditsCost,
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const SELECT = `SELECT
  id,
  user_id AS userId,
  idea_id AS ideaId,
  provider,
  provider_chat_id AS providerChatId,
  status,
  build_spec AS buildSpec,
  preview_access_token AS previewAccessToken,
  credits_cost AS creditsCost,
  last_error AS lastError,
  created_at AS createdAt,
  updated_at AS updatedAt
FROM build_sessions`;

export async function getOwnedBuildSession(userId: string, sessionId: string): Promise<BuildSession | null> {
  const rows = await queryD1(`${SELECT} WHERE user_id=? AND id=? LIMIT 1`, [userId, sessionId], parseSession);
  return rows[0] ?? null;
}

export async function getPreviewBuildSession(sessionId: string, token: string): Promise<BuildSession | null> {
  const rows = await queryD1(
    `${SELECT} WHERE id=? AND preview_access_token=? AND updated_at >= datetime('now','-30 minutes') LIMIT 1`,
    [sessionId, token],
    parseSession,
  );
  return rows[0] ?? null;
}

export async function getLatestBuildForIdea(userId: string, ideaId: string): Promise<BuildSession | null> {
  const rows = await queryD1(
    `${SELECT} WHERE user_id=? AND idea_id=? ORDER BY created_at DESC LIMIT 1`,
    [userId, ideaId],
    parseSession,
  );
  return rows[0] ?? null;
}

export async function createBuildSession(userId: string, ideaId: string, buildSpec: BuildSpec): Promise<BuildSession> {
  const id = `build_${crypto.randomUUID()}`;
  const previewAccessToken = `${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`;
  const result = await executeD1(
    `INSERT INTO build_sessions(
       id,user_id,idea_id,provider,status,build_spec,preview_access_token,credits_cost,last_error,updated_at
     ) VALUES(?,?,?,'v0','generating',?,?,0,NULL,CURRENT_TIMESTAMP)`,
    [id, userId, ideaId, JSON.stringify(buildSpec), previewAccessToken],
  );
  if (result.changes !== 1) throw new Error('Build session was not persisted');
  const session = await getOwnedBuildSession(userId, id);
  if (!session) throw new Error('Build session persistence could not be verified');
  return session;
}

export async function markBuildReady(
  userId: string,
  sessionId: string,
  providerChatId: string,
  creditsCost: number,
): Promise<void> {
  const result = await executeD1(
    `UPDATE build_sessions SET provider_chat_id=?,status='ready',credits_cost=?,last_error=NULL,updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND user_id=?`,
    [providerChatId, Math.max(0, creditsCost), sessionId, userId],
  );
  if (result.changes !== 1) throw new Error('Build session update failed');
}

export async function addBuildUsage(userId: string, sessionId: string, creditsCost: number): Promise<void> {
  const result = await executeD1(
    `UPDATE build_sessions SET status='ready',credits_cost=credits_cost+?,last_error=NULL,updated_at=CURRENT_TIMESTAMP
     WHERE id=? AND user_id=?`,
    [Math.max(0, creditsCost), sessionId, userId],
  );
  if (result.changes !== 1) throw new Error('Build usage update failed');
}

export async function markBuildError(userId: string, sessionId: string, message: string): Promise<void> {
  await executeD1(
    `UPDATE build_sessions SET status='error',last_error=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?`,
    [message.slice(0, 1000), sessionId, userId],
  );
}

export async function rotatePreviewToken(userId: string, sessionId: string): Promise<string> {
  const token = `${crypto.randomUUID().replaceAll('-', '')}${crypto.randomUUID().replaceAll('-', '')}`;
  const result = await executeD1(
    'UPDATE build_sessions SET preview_access_token=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND user_id=?',
    [token, sessionId, userId],
  );
  if (result.changes !== 1) throw new Error('Preview token rotation failed');
  return token;
}

export function publicBuildSession(session: BuildSession) {
  return {
    id: session.id,
    ideaId: session.ideaId,
    provider: session.provider,
    status: session.status,
    creditsCost: session.creditsCost,
    lastError: session.lastError,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

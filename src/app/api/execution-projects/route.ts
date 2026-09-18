import { NextRequest, NextResponse } from 'next/server';

import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { executeD1, queryD1 } from '@/lib/storage/d1';
import { normalizeExecutionProject, type ExecutionProject } from '@/shared/execution';

const headers = { 'Cache-Control': 'private, no-store' };
const MAX_EXECUTION_REQUEST_BYTES = 64 * 1024;
const MAX_ENTITY_ID_LENGTH = 200;

export const dynamic = 'force-dynamic';

async function owner(req: NextRequest) {
  const auth = req.headers.get('authorization');
  return auth?.startsWith('Bearer ') ? verifyFirebaseIdToken(auth.slice(7)) : null;
}

function parseStoredProject(raw: unknown): ExecutionProject {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Invalid execution project row');
  const row = raw as Record<string, unknown>;
  let completedSteps: unknown = [];
  try {
    completedSteps = typeof row.completedSteps === 'string' ? JSON.parse(row.completedSteps) : row.completedSteps;
  } catch {
    throw new Error('Invalid completed steps');
  }
  const project = normalizeExecutionProject({
    entityId: row.entityId,
    sourceName: row.sourceName,
    offerName: row.offerName,
    targetCustomer: row.targetCustomer,
    targetPriceJpy: row.targetPriceJpy,
    firstDollarTargetJpy: row.firstDollarTargetJpy,
    completedSteps,
    buildUrl: row.buildUrl,
    launchUrl: row.launchUrl,
    checkoutUrl: row.checkoutUrl,
    revenueJpy: row.revenueJpy,
    notes: row.notes,
    updatedAt: row.updatedAt,
  });
  if (!project) throw new Error('Invalid execution project row');
  return project;
}

const SELECT_PROJECT = [
  'SELECT',
  'entity_id AS entityId,',
  'source_name AS sourceName,',
  'offer_name AS offerName,',
  'target_customer AS targetCustomer,',
  'target_price_jpy AS targetPriceJpy,',
  'first_dollar_target_jpy AS firstDollarTargetJpy,',
  'completed_steps AS completedSteps,',
  'build_url AS buildUrl,',
  'launch_url AS launchUrl,',
  'checkout_url AS checkoutUrl,',
  'revenue_jpy AS revenueJpy,',
  'notes,',
  'updated_at AS updatedAt',
  'FROM execution_projects',
].join(' ');

export async function GET(req: NextRequest) {
  const user = await owner(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });

  const entityId = req.nextUrl.searchParams.get('entityId')?.trim() || '';
  if (entityId.length > MAX_ENTITY_ID_LENGTH) {
    return NextResponse.json({ error: 'Invalid entityId' }, { status: 400, headers });
  }

  try {
    if (entityId) {
      const rows = await queryD1(
        SELECT_PROJECT + ' WHERE user_id=? AND entity_id=? LIMIT 1',
        [user.uid, entityId],
        parseStoredProject,
      );
      return NextResponse.json({ uid: user.uid, project: rows[0] ?? null }, { headers });
    }

    const projects = await queryD1(
      SELECT_PROJECT + ' WHERE user_id=? ORDER BY updated_at DESC LIMIT 100',
      [user.uid],
      parseStoredProject,
    );
    return NextResponse.json({ uid: user.uid, projects }, { headers });
  } catch {
    return NextResponse.json({ error: '実行プロジェクトを取得できません' }, { status: 503, headers });
  }
}

export async function PUT(req: NextRequest) {
  const user = await owner(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });

  let input: unknown;
  try {
    input = await readJsonBody(req, MAX_EXECUTION_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: 'Execution request is too large' }, { status: 413, headers });
    }
    return NextResponse.json({ error: 'Invalid execution project' }, { status: 400, headers });
  }

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return NextResponse.json({ error: 'Invalid execution project' }, { status: 400, headers });
  }

  const allowedKeys = new Set([
    'entityId',
    'sourceName',
    'offerName',
    'targetCustomer',
    'targetPriceJpy',
    'firstDollarTargetJpy',
    'completedSteps',
    'buildUrl',
    'launchUrl',
    'checkoutUrl',
    'revenueJpy',
    'notes',
  ]);
  if (Object.keys(input as Record<string, unknown>).some((key) => !allowedKeys.has(key))) {
    return NextResponse.json({ error: 'Invalid execution project' }, { status: 400, headers });
  }

  const project = normalizeExecutionProject(input);
  if (!project) {
    return NextResponse.json({ error: 'Invalid execution project' }, { status: 400, headers });
  }

  try {
    const updatedAt = new Date().toISOString();
    const saved = await executeD1(
      [
        'INSERT INTO execution_projects(',
        'user_id,entity_id,source_name,offer_name,target_customer,target_price_jpy,first_dollar_target_jpy,',
        'completed_steps,build_url,launch_url,checkout_url,revenue_jpy,notes,updated_at',
        ') VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        'ON CONFLICT(user_id,entity_id) DO UPDATE SET',
        'source_name=excluded.source_name,offer_name=excluded.offer_name,target_customer=excluded.target_customer,',
        'target_price_jpy=excluded.target_price_jpy,first_dollar_target_jpy=excluded.first_dollar_target_jpy,',
        'completed_steps=excluded.completed_steps,build_url=excluded.build_url,launch_url=excluded.launch_url,',
        'checkout_url=excluded.checkout_url,revenue_jpy=excluded.revenue_jpy,notes=excluded.notes,updated_at=excluded.updated_at',
      ].join(' '),
      [
        user.uid,
        project.entityId,
        project.sourceName,
        project.offerName,
        project.targetCustomer,
        project.targetPriceJpy,
        project.firstDollarTargetJpy,
        JSON.stringify(project.completedSteps),
        project.buildUrl,
        project.launchUrl,
        project.checkoutUrl,
        project.revenueJpy,
        project.notes,
        updatedAt,
      ],
    );
    if (saved.changes !== 1) throw new Error('Execution project not saved');

    return NextResponse.json({ uid: user.uid, project: { ...project, updatedAt } }, { headers });
  } catch {
    return NextResponse.json({ error: '実行プロジェクトを保存できません' }, { status: 503, headers });
  }
}

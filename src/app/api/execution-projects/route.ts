import { NextRequest, NextResponse } from 'next/server';

import { readJsonBody, RequestBodyTooLargeError } from '@/lib/api/input';
import { executionOwnerKey, getExecutionGeneration } from '@/lib/execution/generation-store';
import { verifyFirebaseIdToken } from '@/lib/firebase/server';
import { executeD1, queryD1 } from '@/lib/storage/d1';
import { normalizeExecutionProject, type ExecutionProject } from '@/shared/execution';

const headers = { 'Cache-Control': 'private, no-store' };
const MAX_EXECUTION_REQUEST_BYTES = 256 * 1024;
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
    revision: row.revision,
    generation: row.generation,
    updatedAt: row.updatedAt,
  });
  if (!project || project.revision < 1) throw new Error('Invalid execution project row');
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
  'notes,revision,generation,',
  'updated_at AS updatedAt',
  'FROM execution_projects',
].join(' ');

async function currentProject(userId: string, entityId: string, generation: number): Promise<ExecutionProject | null> {
  const rows = await queryD1(
    SELECT_PROJECT + ' WHERE user_id=? AND entity_id=? AND generation=? LIMIT 1',
    [userId, entityId, generation],
    parseStoredProject,
  );
  return rows[0] ?? null;
}

function conflict(generation: number, project: ExecutionProject | null) {
  return NextResponse.json(
    { error: 'Execution project conflict', generation, project },
    { status: 409, headers },
  );
}

export async function GET(req: NextRequest) {
  const user = await owner(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers });

  const entityId = req.nextUrl.searchParams.get('entityId')?.trim() || '';
  if (entityId.length > MAX_ENTITY_ID_LENGTH) {
    return NextResponse.json({ error: 'Invalid entityId' }, { status: 400, headers });
  }

  try {
    const { generation, resetAt } = await getExecutionGeneration(user.uid);
    if (entityId) {
      const project = await currentProject(user.uid, entityId, generation);
      return NextResponse.json({ uid: user.uid, project, generation, resetAt }, { headers });
    }

    const projects = await queryD1(
      SELECT_PROJECT + ' WHERE user_id=? AND generation=? ORDER BY updated_at DESC LIMIT 100',
      [user.uid, generation],
      parseStoredProject,
    );
    return NextResponse.json({ uid: user.uid, projects, generation, resetAt }, { headers });
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
    'revision',
    'generation',
    'updatedAt',
  ]);
  if (Object.keys(input as Record<string, unknown>).some((key) => !allowedKeys.has(key))) {
    return NextResponse.json({ error: 'Invalid execution project' }, { status: 400, headers });
  }

  const project = normalizeExecutionProject(input);
  if (!project) return NextResponse.json({ error: 'Invalid execution project' }, { status: 400, headers });

  try {
    const ownerKey = executionOwnerKey(user.uid);
    const before = await getExecutionGeneration(user.uid);
    if (project.generation !== before.generation) {
      return conflict(before.generation, await currentProject(user.uid, project.entityId, before.generation));
    }

    const updatedAt = new Date().toISOString();
    let savedChanges = 0;

    if (project.revision === 0) {
      const inserted = await executeD1(
        [
          'INSERT OR IGNORE INTO execution_projects(',
          'user_id,entity_id,source_name,offer_name,target_customer,target_price_jpy,first_dollar_target_jpy,',
          'completed_steps,build_url,launch_url,checkout_url,revenue_jpy,notes,updated_at,revision,generation',
          ') SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?',
          'WHERE ? = COALESCE((SELECT generation FROM execution_resets WHERE owner_key=?),0)',
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
          project.generation,
          project.generation,
          ownerKey,
        ],
      );
      savedChanges = inserted.changes;
    } else {
      const updated = await executeD1(
        [
          'UPDATE execution_projects SET',
          'source_name=?,offer_name=?,target_customer=?,target_price_jpy=?,first_dollar_target_jpy=?,',
          'completed_steps=?,build_url=?,launch_url=?,checkout_url=?,revenue_jpy=?,notes=?,',
          'updated_at=?,revision=revision+1',
          'WHERE user_id=? AND entity_id=? AND generation=? AND revision=?',
          'AND ? = COALESCE((SELECT generation FROM execution_resets WHERE owner_key=?),0)',
        ].join(' '),
        [
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
          user.uid,
          project.entityId,
          project.generation,
          project.revision,
          project.generation,
          ownerKey,
        ],
      );
      savedChanges = updated.changes;
    }

    const after = await getExecutionGeneration(user.uid);
    if (savedChanges !== 1 || after.generation !== project.generation) {
      return conflict(after.generation, await currentProject(user.uid, project.entityId, after.generation));
    }

    const saved = await currentProject(user.uid, project.entityId, after.generation);
    if (!saved) return conflict(after.generation, null);
    return NextResponse.json({ uid: user.uid, project: saved, generation: after.generation }, { headers });
  } catch {
    return NextResponse.json({ error: '実行プロジェクトを保存できません' }, { status: 503, headers });
  }
}

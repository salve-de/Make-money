import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { readJsonBody } from '@/lib/api/input';

export async function POST(req: NextRequest) {
  try {
    const body = (await readJsonBody(req)) as Record<string, unknown>;
    const entityId = typeof body?.entityId === 'string' ? body.entityId : null;
    const entityIds = Array.isArray(body?.entityIds) ? (body.entityIds as unknown[]).filter((id): id is string => typeof id === 'string') : null;
    const approveAll = body?.all === true;

    if (!entityId && (!entityIds || entityIds.length === 0) && !approveAll) {
      return NextResponse.json(
        { error: 'entityId, entityIds array, or all: true is required' },
        { status: 400 }
      );
    }

    const targetIds = new Set<string>();
    if (entityId) targetIds.add(entityId.trim().toLowerCase());
    if (entityIds) entityIds.forEach((id) => targetIds.add(id.trim().toLowerCase()));

    const indexPath = path.join(process.cwd(), 'data', 'entities-index.json');
    const winnersPath = path.join(process.cwd(), 'data', 'winners-100-definitions.json');

    // 1. data/entities-index.json の更新
    let indexUpdated = false;
    let approvedCount = 0;
    try {
      const content = await fs.readFile(indexPath, 'utf-8');
      const entities = JSON.parse(content);
      if (Array.isArray(entities)) {
        for (const entity of entities) {
          const match = approveAll || (entity && typeof entity.id === 'string' && targetIds.has(entity.id.toLowerCase()));
          if (match) {
            if (Array.isArray(entity.tags)) {
              const originalLen = entity.tags.length;
              entity.tags = entity.tags.filter((t: string) => t !== '収集事例');
              if (entity.tags.length !== originalLen) {
                indexUpdated = true;
                approvedCount++;
              }
            }
          }
        }
        if (indexUpdated) {
          await fs.writeFile(indexPath, JSON.stringify(entities, null, 2), 'utf-8');
        }
      }
    } catch (err) {
      console.error('[API /api/entities/approve] Error updating entities-index.json:', err);
    }

    // 2. data/winners-100-definitions.json の更新 (存在する場合)
    try {
      const content = await fs.readFile(winnersPath, 'utf-8');
      const winners = JSON.parse(content);
      if (Array.isArray(winners)) {
        let winnersUpdated = false;
        for (const winner of winners) {
          const match = approveAll || (winner && typeof winner.id === 'string' && targetIds.has(winner.id.toLowerCase()));
          if (match) {
            if (Array.isArray(winner.tags)) {
              const originalLen = winner.tags.length;
              winner.tags = winner.tags.filter((t: string) => t !== '収集事例');
              if (winner.tags.length !== originalLen) {
                winnersUpdated = true;
              }
            }
          }
        }
        if (winnersUpdated) {
          await fs.writeFile(winnersPath, JSON.stringify(winners, null, 2), 'utf-8');
        }
      }
    } catch {
      // ファイルが存在しない場合は無視
    }

    return NextResponse.json({
      success: true,
      approvedCount,
      entityId,
      entityIds: entityIds || (entityId ? [entityId] : []),
      all: approveAll,
      updated: indexUpdated,
      message: `承認完了。${approvedCount}件の「収集事例」タグを除去し、本台帳に保管しました。`,
    });
  } catch (error) {
    console.error('[API /api/entities/approve] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

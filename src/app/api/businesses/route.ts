import { NextResponse } from 'next/server';
import { db, businesses } from '@/db';
import { BUSINESS_DATA } from '@/data/businesses';
import {
  readFoundationBusinessCase,
  readFoundationEntityPage,
} from '@/lib/foundation/business-reader';
import { R2ConfigurationError } from '@/lib/storage/r2';

export const dynamic = 'force-dynamic';

const cacheHeaders = {
  'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
};

function staticPayload(entityId?: string | null) {
  if (entityId) {
    const entity = BUSINESS_DATA.find((item) => item.id === entityId);
    return entity ? [entity] : [];
  }
  return BUSINESS_DATA;
}

async function legacyFallback(entityId?: string | null) {
  if (db) {
    try {
      const rows = await db.select().from(businesses);
      const selectedRows = entityId ? rows.filter((row) => row.id === entityId) : rows;
      if (selectedRows.length > 0) {
        return NextResponse.json(
          {
            source: 'database',
            data: selectedRows,
            nextCursor: null,
            hasMore: false,
          },
          { headers: cacheHeaders }
        );
      }
    } catch (error) {
      console.warn('[businesses] Neon DB fetch failed, falling back to static data:', error);
    }
  }

  return NextResponse.json(
    {
      source: 'static',
      data: staticPayload(entityId),
      nextCursor: null,
      hasMore: false,
    },
    { headers: cacheHeaders }
  );
}

function parseLimit(value: string | null): number {
  const parsed = value ? Number(value) : 100;
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(Math.max(Math.floor(parsed), 1), 100);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const entityId = url.searchParams.get('entity_id') || url.searchParams.get('id');

  // Keep the pre-existing database/static endpoint contract for legacy IDs.
  // Foundation Entity IDs are handled by the read-only R2 path below.
  if (entityId && !/^ent_[a-z0-9]+_[a-f0-9]{20}$/.test(entityId)) {
    return legacyFallback(entityId);
  }

  try {
    if (entityId) {
      const data = await readFoundationBusinessCase(entityId);
      if (!data) {
        return NextResponse.json(
          { source: 'r2_lake', data: null, error: 'Foundation entity not found' },
          { status: 404, headers: cacheHeaders }
        );
      }
      return NextResponse.json(
        { source: 'r2_lake', data },
        { headers: cacheHeaders }
      );
    }

    const page = await readFoundationEntityPage({
      cursor: url.searchParams.get('cursor') || undefined,
      limit: parseLimit(url.searchParams.get('limit')),
    });
    return NextResponse.json(
      {
        source: 'r2_lake',
        data: page.data,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      },
      { headers: cacheHeaders }
    );
  } catch (error) {
    // Local Next.js development may not have the production R2 binding or
    // server credentials. Keep the legacy screen usable, but never label it
    // as an R2 result.
    if (error instanceof R2ConfigurationError) {
      return legacyFallback(entityId);
    }

    console.warn('[businesses] Foundation read failed:', error);
    return NextResponse.json(
      {
        source: 'unavailable',
        data: entityId ? null : [],
        nextCursor: null,
        hasMore: false,
        error: 'Foundation data is temporarily unavailable',
      },
      { status: 503, headers: cacheHeaders }
    );
  }
}

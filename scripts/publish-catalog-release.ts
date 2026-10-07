import { readFile } from 'node:fs/promises';
import { getFoundationBucket, putR2MutableView, putR2ObjectCreateOnly, readR2Object } from '../src/lib/storage/r2';
import { advanceReleasePointer, pointerLogKey, type PointerStore } from '../src/lib/company-access/release-pointer';
import { decodeCatalogArtifact } from '../src/lib/company-access/release-store';
import {
  CATALOG_PREFIX,
  POINTER_KEY,
  POINTER_LOG_PREFIX,
  manifestObjectKey,
  parseManifest,
  parsePointer,
  type PointerLogEntry,
  type ReleasePointer,
} from '../src/shared/catalog-manifest';

/**
 * 新しい版を R2 に書き、読み戻して確かめてから、「いま公開している版の目印」を進める。
 * - 事例データ・一覧・manifest は新規作成のみ（上書きしない。書くたびに読み戻して指紋を照合する）。
 * - 目印（POINTER_KEY）だけを書き換える。書き換えのたびに pointer-log へ1件、いつ・どの版から・どの版へを残す。
 * - 本番のビルドや反映（デプロイ）は要らない。数分で本番が新しい版を読む。
 *
 *   pnpm catalog:publish                      … .catalog-release/upload.json の成果物を書き、目印を進める
 *   pnpm catalog:publish --point-to <hash>    … 書き込み済みの manifest へ目印を付け替える（巻き戻しにも使う）
 *   pnpm catalog:publish --skip-pointer       … 成果物を書くだけで、目印は進めない
 */
const bucket = () => getFoundationBucket('lake');

// 事例データ・一覧・探索・manifest だけ。正本の事実は書かない
const ALLOWED_KEY = /^views\/make-money\/(catalog-v1\/(objects|manifests)|dossier-v1\/objects)\//;

function r2PointerStore(): PointerStore {
  return {
    async read() {
      const object = await readR2Object(bucket(), POINTER_KEY);
      if (!object) return null;
      return { pointer: parsePointer(JSON.parse(new TextDecoder().decode(object.body)) as unknown), etag: object.etag ?? null };
    },
    async write(pointer: ReleasePointer, expectedEtag: string | null) {
      await putR2MutableView({ bucket: bucket(), key: POINTER_KEY, body: `${JSON.stringify(pointer, null, 2)}\n`, contentType: 'application/json' }, { expectedEtag });
    },
    async log(entry: PointerLogEntry) {
      await putR2ObjectCreateOnly({ bucket: bucket(), key: pointerLogKey(POINTER_LOG_PREFIX, entry), body: `${JSON.stringify(entry, null, 2)}\n`, contentType: 'application/json' });
    },
  };
}

/** 目印を付ける先の manifest が、R2 に指紋どおりの中身で置いてあり、中の成果物（一覧・探索）も読めることを確かめる。 */
async function assertManifestReadable(manifestHash: string): Promise<{ publishedCount: number }> {
  const object = await readR2Object(bucket(), manifestObjectKey(manifestHash));
  if (!object) throw new Error(`manifest ${manifestHash} が R2 にありません。先に pnpm catalog:publish で成果物を書いてください`);
  const manifest = parseManifest(decodeCatalogArtifact(object.body, manifestHash));
  for (const ref of [manifest.summaries, manifest.discovery]) {
    const artifact = await readR2Object(bucket(), ref.key);
    if (!artifact) throw new Error(`manifest が指す成果物 ${ref.key} が R2 にありません`);
    decodeCatalogArtifact(artifact.body, ref.hash);
  }
  return { publishedCount: manifest.publishedCount };
}

async function main() {
  const args = process.argv.slice(2);
  const pointTo = args.includes('--point-to') ? args[args.indexOf('--point-to') + 1] : undefined;
  if (pointTo !== undefined && !/^[a-f0-9]{64}$/.test(pointTo ?? '')) throw new Error('--point-to には manifest の指紋（64桁）を渡してください');

  let manifestHash = pointTo;
  if (!pointTo) {
    const objects: { key: string; file: string }[] = JSON.parse(await readFile('.catalog-release/upload.json', 'utf8'));
    let completed = 0;
    let next = 0;
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (next < objects.length) {
        const item = objects[next++];
        if (!ALLOWED_KEY.test(item.key)) throw new Error('Unexpected catalog key');
        await putR2ObjectCreateOnly({ bucket: bucket(), key: item.key, body: await readFile(item.file), contentType: 'application/gzip' });
        completed++;
        if (completed % 100 === 0) console.log(`Readback verified ${completed}/${objects.length}`);
      }
    }));
    console.log(`Catalog publish complete: ${completed} immutable objects verified.`);
    const pointer = JSON.parse(await readFile('.catalog-release/current.json', 'utf8')) as unknown;
    manifestHash = parsePointer(pointer).manifestHash;
  }
  if (args.includes('--skip-pointer')) {
    console.log(`目印は進めません（--skip-pointer）。付ける先: ${manifestHash}`);
    return;
  }
  const { publishedCount } = await assertManifestReadable(manifestHash as string);
  const result = await advanceReleasePointer(r2PointerStore(), { manifestHash: manifestHash as string, publishedCount });
  console.log(result.status === 'UNCHANGED'
    ? `目印は既に ${result.to} を指しています。`
    : `目印を進めました: ${result.from ?? '(なし)'} -> ${result.to}（${CATALOG_PREFIX}current.json、記録は ${POINTER_LOG_PREFIX}）`);
}
void main().catch((error) => { console.error(error); process.exitCode = 1; });

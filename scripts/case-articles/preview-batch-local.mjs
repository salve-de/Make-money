/**
 * Open a delivered case ZIP in the EXISTING Make-Money Next.js UI, locally.
 *  pnpm case:batch:preview -- --bundle ~/Downloads/case-batch.zip
 *  pnpm case:batch:preview -- --bundle ... --prepare-only
 * No R2 writes, no GitHub Actions, no production release, no scheduled jobs.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const argv=process.argv.slice(2).filter(x=>x!=='--');
const at=k=>argv.indexOf(k);
const raw=at('--bundle')>=0 ? argv[at('--bundle')+1] : '';
const port=Number(at('--port')>=0 ? argv[at('--port')+1] : 3100);
const prepareOnly=argv.includes('--prepare-only');
const root=process.cwd();
const review=resolve(root,'.catalog-release-preview/batch');
function fail(message){console.error('[MAKEMONEY 一括取込] '+message);process.exit(1)}
if(!raw||raw.startsWith('--'))fail('ZIPを --bundle に指定してください');
if(!Number.isInteger(port)||port<1024||port>65535)fail('不正なポート番号');
if(!existsSync(join(root,'scripts/case-articles/build.ts'))||!existsSync(join(root,'package.json')))
  fail('Make-moneyリポジトリの直下で起動してください');
if(!existsSync(join(root,'node_modules/next/dist/bin/next')))
  fail('先に pnpm install --frozen-lockfile を実行してください');
const bundle=resolve(raw.replace(/^~(?=\/)/,process.env.HOME||''));
const python='python3';
const importer=join(root,'scripts/case-articles/import-batch.py');
const result=spawnSync(python,[importer,'--bundle',bundle,'--repo',root,'--apply'],
  {cwd:root,stdio:'inherit',encoding:'utf8',timeout:4*60*1000});
if(result.error)fail(result.error.message);
if(result.status!==0)fail('データの検証・一括取込・ローカル目録の生成に失敗しました。公開はしていません');
const receipt=join(review,'intake-receipt.json');
if(!existsSync(receipt))fail('検査結果の受領書がありません');
const data=JSON.parse(readFileSync(receipt,'utf8'));
if(data.mode!=='local_review_only'||!data.case_ids?.length)fail('ローカル用の正しい受領書ではありません');
console.log('\nMAKEMONEY 本体の事例詳細画面に追加されました（ローカルのみ）');
for(const id of data.case_ids)console.log(`  http://127.0.0.1:${port}/?entity=${encodeURIComponent(id)}`);
console.log('既存の本体UIを利用。R2・公開目録・GitHub Actionsは変更しません。');
if(prepareOnly)process.exit(0);
const child=spawn(process.execPath,[resolve(root,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',String(port)],
 {cwd:root,stdio:'inherit',env:{...process.env,CATALOG_RELEASE_DIR:review}});
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{if(!child.killed)child.kill(signal)});
child.on('error',e=>fail(e.message));
child.on('exit',(code,signal)=>{process.exitCode=code??(signal?0:1)});

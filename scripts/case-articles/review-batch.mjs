/** Import a prepared batch and start the actual MAKEMONEY Next.js UI locally. */
import {spawnSync,spawn} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const ROOT=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const args=process.argv.slice(2).filter(x=>x!=='--');
const value=x=>{const i=args.indexOf(x);return i<0?null:args[i+1]};
const from=value('--from');
const port=Number(value('--port')||3100);
if(!from||!Number.isInteger(port)||port<1024||port>65535){
  console.error('使い方: pnpm case:batch:review --from <展開したバッチ> [--port 3100]');
  process.exit(2);
}
if(!existsSync(join(ROOT,'node_modules/next/dist/bin/next'))){
  console.error('先に pnpm install --frozen-lockfile を実行してください');
  process.exit(2);
}
const p=spawnSync(process.execPath,['--import','tsx','scripts/case-articles/case-batch.mjs','import','--from',resolve(from),'--preview'],
  {cwd:ROOT,stdio:'inherit',env:{...process.env,CATALOG_RELEASE_DIR:join(ROOT,'.catalog-release-preview')}});
if(p.status!==0){console.error('一括取り込み・プレビュー生成が失敗しました');process.exit(p.status||1)}
const batch=JSON.parse(readFileSync(join(resolve(from),'manifest.json'),'utf8'));
const base='http://127.0.0.1:'+port+'/?entity=';
console.log('\nMAKEMONEYローカル事例一覧:');
for(const c of batch.cases)console.log(' '+base+encodeURIComponent(c.entityId));
console.log('\nサーバーの起動後にSafariで開いてください。終了: Ctrl+C');
const child=spawn(process.execPath,[join(ROOT,'node_modules/next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port',String(port)],
 {cwd:ROOT,stdio:'inherit',env:{...process.env,CATALOG_RELEASE_DIR:join(ROOT,'.catalog-release-preview')}});
child.on('error',e=>{console.error('Next.js起動失敗: '+e.message);process.exitCode=1});
for(const sig of ['SIGINT','SIGTERM'])process.once(sig,()=>child.kill(sig));
child.on('exit',(code,signal)=>{process.exitCode=code??(signal==='SIGINT'?0:1)});

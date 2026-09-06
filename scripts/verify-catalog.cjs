const fs = require('node:fs');
const assert = require('node:assert/strict');
const ts = require('typescript');
function load(file) {
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};new Function('module','exports','require',code)(module,module.exports,require);return module.exports;
}
const {selectCompanies,summary,yen,csvCell}=load('src/lib/catalog.ts');
const {TERMINAL_COMPANIES:companies}=load('src/data/terminalData.ts');
assert.equal(yen(0),'0円');assert.equal(yen(undefined),'—');assert.equal(yen(1e12),'1兆円');
assert.equal(selectCompanies(companies,new URLSearchParams({q:'キーエンス'})).length,1);
assert.equal(selectCompanies(companies,new URLSearchParams({q:'不存在検証語9836'})).length,0);
assert.equal(selectCompanies(companies,new URLSearchParams({ids:''})).length,0);
for(const c of selectCompanies(companies,new URLSearchParams({capital:'0',team:'1',margin:'50'}))){assert.equal(c.initialInvestmentJpy,0);assert.equal(c.teamSize,1);assert.ok(c.financials.at(-1).operatingMarginPercent>=50);}
const many=Array.from({length:1000},(_,i)=>({...companies[i%companies.length],id:`fixture-${i}`}));
const start=performance.now();const sorted=selectCompanies(many,new URLSearchParams({sort:'revenue',direction:'desc'}));
assert.equal(sorted.length,1000);assert.equal(new Set(sorted.map(c=>c.id)).size,1000);
for(let i=1;i<sorted.length;i++)assert.ok(sorted[i-1].financials.at(-1).revenueJpy>=sorted[i].financials.at(-1).revenueJpy);
assert.equal(sorted.slice(980,1000).map(summary).length,20);
assert.ok(csvCell('=SUM(A1)').startsWith('"\''));
console.log(JSON.stringify({passed:true,companies:companies.length,syntheticCompanies:many.length,sortMs:Math.round(performance.now()-start)}));

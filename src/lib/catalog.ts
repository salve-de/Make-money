import type { CompanyRecord } from '@/types/terminal';

export const models: Record<string, string> = { B2B_DIRECT:'直販・製造', CHIP_ECOSYSTEM:'半導体', SEMICON_EQUIP:'製造装置', PAYMENT_INFRA:'決済', FRONTIER_AI:'基盤AI', DATA_RLHF:'データ基盤', ANSWER_ENGINE:'検索', PRECISION_MED:'医療機器', CHEMICAL_MAT:'素材', MICRO_SAAS:'SaaS', MEDIA_NEWS:'メディア', DIGITAL_ASSET:'デジタル商品', LOCAL_DX:'地域ビジネス', COMMERCE_AUTO:'物販' };
export const evidence: Record<string, string> = {AUDITED_PUBLIC:'公的決算',VERIFIED_STRIPE:'決済データ',ESTIMATED_MODEL:'推計'};
export const latest = (c: CompanyRecord) => c.financials.at(-1);
export function yen(n?: number) {
  if (n == null || !Number.isFinite(n)) return '—';
  const a=Math.abs(n), unit=a>=1e12?1e12:a>=1e8?1e8:a>=1e4?1e4:1;
  return `${(n/unit).toLocaleString('ja-JP',{maximumFractionDigits:1})}${unit===1e12?'兆':unit===1e8?'億':unit===1e4?'万':''}円`;
}
export function summary(c: CompanyRecord) {return {id:c.id,name:c.name,title:c.japaneseName,model:c.businessModel,what:c.businessEssence?.whatItDoes??c.tagline,customer:c.businessEssence?.targetCustomer??'',monetization:c.businessEssence?.monetizationWay??'',hours:c.weeklyHours,channel:c.trafficFaucet?.primaryChannel??c.first100CustomersStrategy?.tacticalChannel??'',revenue:latest(c)?.revenueJpy,profit:latest(c)?.operatingProfitJpy,margin:latest(c)?.operatingMarginPercent,period:latest(c)?.period??'期間未登録',team:c.teamSize,capital:c.initialInvestmentJpy,evidence:c.verifiedStatus};}
export type CompanySummary=ReturnType<typeof summary>;
export function selectCompanies(companies:CompanyRecord[], p:URLSearchParams) {
  const words=(p.get('q')??'').normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const ids=p.has('ids')?new Set((p.get('ids')??'').split(',')):null;
  const min=(key:string)=>p.has(key)&&p.get(key)!==''?Number(p.get(key)):null;
  return companies.filter(c=>{
    const text=[c.name,c.japaneseName,c.ticker,c.tagline,...c.tags,...Object.values(c.businessEssence??{}),c.initialTractionStrategy].join(' ').normalize('NFKC').toLocaleLowerCase();
    return (!ids||ids.has(c.id))&&words.every(w=>text.includes(w))&&(!p.get('model')||c.businessModel===p.get('model'))&&(!p.get('evidence')||c.verifiedStatus===p.get('evidence'))&&(min('team')===null||c.teamSize<=min('team')!)&&(min('capital')===null||c.initialInvestmentJpy<=min('capital')!)&&(min('margin')===null||(latest(c)?.operatingMarginPercent??-Infinity)>=min('margin')!);
  }).sort((a,b)=>{
    const key=p.get('sort')??'revenue';
    const value=(c:CompanyRecord)=>key==='profit'?latest(c)?.operatingProfitJpy:key==='margin'?latest(c)?.operatingMarginPercent:key==='team'?c.teamSize:key==='capital'?c.initialInvestmentJpy:latest(c)?.revenueJpy;
    const direction=p.get('direction')==='asc'?1:-1;
    return ((value(a)??-Infinity)-(value(b)??-Infinity))*direction||a.id.localeCompare(b.id);
  });
}
export function csvCell(value:unknown) {const s=String(value??'');return '"'+(/^[=+@\t\r]/.test(s)?"'":'')+s.replaceAll('"','""')+'"';}

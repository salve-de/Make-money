import { TERMINAL_COMPANIES } from '@/data/terminalData';
import { BUSINESS_IDEAS } from '@/data/ideasData';
import { PORTAL_SIGNALS } from '@/data/portalSignals';
import { csvCell, evidence, models, selectCompanies, summary } from '@/lib/catalog';

export async function GET(request:Request) {
 const p=new URL(request.url).searchParams;
 if(p.get('kind')==='ideas')return Response.json(BUSINESS_IDEAS);
 if(p.get('kind')==='signals')return Response.json(PORTAL_SIGNALS);
 if(p.has('id')){const company=TERMINAL_COMPANIES.find(c=>c.id===p.get('id'));return company?Response.json(company):Response.json({error:'企業が見つかりません'}, {status:404});}
 const selected=selectCompanies(TERMINAL_COMPANIES,p);
 if(p.get('format')==='csv'){
 const rows=[['企業','収益モデル','売上高(円)','営業利益率(%)','期間','人数','初期資本(円)','収録区分','出典状況'],...selected.map(c=>{const s=summary(c);return [s.title,models[s.model],s.revenue,s.margin,s.period,s.team,s.capital,evidence[s.evidence],'元資料未登録'];})];
 return new Response('\ufeff'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n'),{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="businesses.csv"'}});
 }
 const size=[20,50,100].includes(Number(p.get('size')))?Number(p.get('size')):20;
 const pages=Math.max(1,Math.ceil(selected.length/size));
 const page=Math.max(1,Math.min(pages,Number.parseInt(p.get('page')??'1',10)||1));
 return Response.json({items:selected.slice((page-1)*size,page*size).map(summary),total:selected.length,corpus:TERMINAL_COMPANIES.length,page,pages,size,models:[...new Set(TERMINAL_COMPANIES.map(c=>c.businessModel))]});
}

export const ENGINE_VERSION = '1.0.0';
export const money = v => Number.isFinite(v) ? new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v) : '—';
export const pct = (v,d=2) => Number.isFinite(v) ? new Intl.NumberFormat('pt-BR',{style:'percent',minimumFractionDigits:d,maximumFractionDigits:d}).format(v) : '—';
export function numberBR(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : NaN;
  let s = String(value ?? '').trim().replace(/R\$|%|\s/g,'');
  if (!s) return NaN;
  if (s.includes(',')) s=s.replace(/\./g,'').replace(',','.');
  else if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s=s.replace(/\./g,'');
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
}
export const annual = i => Math.expm1(12*Math.log1p(i));
export function monthly(rate,type='monthly') { const r=Number(rate)/100; return type==='annual' ? Math.expm1(Math.log1p(r)/12) : type==='nominal' ? r/12 : r; }
export const realRate = (nominal,inflation) => (1+nominal)/(1+inflation)-1;
export const equivalent = (rate,from,to) => Math.expm1(Math.log1p(rate)*({day:1,month:30,year:360}[to]/{day:1,month:30,year:360}[from]));
export function payment(p,i,n,residual=0) { return Math.abs(i)<1e-12 ? (p-residual)/n : (p-residual/(1+i)**n)*i/(-Math.expm1(-n*Math.log1p(i))); }
// Borrower perspective: receipts positive, payments negative. Monthly periods.
export function irr(flows) {
  const sorted=Array.from(new Set(flows.map(f=>f.month))).sort((a,b)=>a-b).map(month=>({month,amount:flows.filter(f=>f.month===month).reduce((s,f)=>s+f.amount,0)})).filter(f=>Math.abs(f.amount)>1e-9);
  if (!sorted.some(f=>f.amount>0)||!sorted.some(f=>f.amount<0)) return {rate:null,status:'no-root'};
  const changes=sorted.slice(1).reduce((n,f,k)=>n+(Math.sign(f.amount)!==Math.sign(sorted[k].amount)?1:0),0);
  if(changes>1) return {rate:null,status:'multiple-signs'};
  const t0=sorted[0].month;
  const npv = x => sorted.reduce((s,f)=>s+f.amount*Math.exp(-(f.month-t0)*x),0);
  let lo=-10,hi=10,fl=npv(lo),fh=npv(hi);
  if (!Number.isFinite(fl)) {lo=-1;fl=npv(lo);}
  if (Math.sign(fl)===Math.sign(fh)) return {rate:null,status:'no-root'};
  for(let k=0;k<180;k++){ const mid=(lo+hi)/2,fm=npv(mid); if(Math.sign(fm)===Math.sign(fl)){lo=mid;fl=fm;}else hi=mid; }
  const rate=Math.expm1((lo+hi)/2);
  return Number.isFinite(rate) ? {rate,status:'ok'} : {rate:null,status:'no-root'};
}
export const systems = [
  ['SAC','Amortização fixa','O principal é amortizado em partes iguais. Sem correção e extras, os juros e as parcelas caem.'],
  ['Price','Parcela constante','Prestação básica constante em períodos regulares. Encargos e indexadores podem alterar o total.'],
  ['SAM','Média SAC e Price','Média dos fluxos SAC e Price. O saldo e os juros são a média das duas trajetórias.'],
  ['Americano','Juros + balão','Juros pagos a cada mês; principal integral no vencimento.'],
  ['Único','Tudo no vencimento','Juros capitalizados mensalmente; principal e juros pagos no vencimento.'],
  ['Alemão','Juros antecipados','Modelo didático: amortização constante e juros de cada período pagos um mês antes.']
];
export const defaults = () => ({name:'Proposta principal',principal:100000,months:24,rate:1.5,rateType:'monthly',system:'SAC',index:0,grace:0,graceMode:'interest',residual:0,insurance:0,fee:0,extra:0,extraMonth:0,extraValue:0,iof:true,iofFixed:.38,iofDaily:.0082,iofDays:0,uf:'',city:'',base:100000,enabledCosts:[],stages:[],expenses:[],startDate:new Date().toISOString().slice(0,10)});
function finiteRange(errors,v,label,min,max=Infinity,integer=false){ if(!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v))) errors.push(`${label}: informe ${integer?'um inteiro':'um valor'} entre ${min} e ${max===Infinity?'o limite da operação':max}.`); }
export function validate(p) {
  const e=[];
  finiteRange(e,p.principal,'Valor financiado',.01,1e12);
  finiteRange(e,p.months,'Prazo',1,600,true); finiteRange(e,p.rate,'Juros',0,1000);
  finiteRange(e,p.index,'Indexador',0,1000); finiteRange(e,p.residual,'Balão',0,100);
  finiteRange(e,p.grace,'Carência',0,p.months-1,true);
  for(const key of ['insurance','fee','extra','extraValue','iofFixed','iofDaily','iofDays','base']) finiteRange(e,p[key],key,0,1e12);
  finiteRange(e,p.extraMonth,'Mês do aporte',0,p.months,true);
  if(p.extraValue>0 && p.extraMonth<1)e.push('Defina o mês do aporte único.');
  if(!systems.some(s=>s[0]===p.system))e.push('Sistema inválido.');
  if(!['monthly','annual','nominal'].includes(p.rateType))e.push('Tipo de taxa inválido.');
  if(!['interest','capitalize'].includes(p.graceMode))e.push('Tipo de carência inválido.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(p.startDate)||!Number.isFinite(Date.parse(p.startDate)))e.push('Data inicial inválida.');
  for(const s of p.stages){finiteRange(e,s.month,'Mês da liberação',0,p.months-1,true);finiteRange(e,s.value,'Valor da liberação',.01,1e12);}
  for(const c of p.expenses)finiteRange(e,c.value,'Despesa',0,1e12);
  if(p.stages.length && Math.max(...p.stages.map(s=>s.month))>=p.months-1)e.push('A última liberação deve permitir ao menos um mês de amortização depois dela.');
  if(p.system==='Alemão'&&(p.stages.length||p.grace||p.index||p.extra||p.extraValue||p.residual))e.push('Alemão: use taxa fixa sem carência, etapas, indexador, aportes ou balão. Para outros contratos, use Fluxo livre.');
  return e;
}
export function simulate(p,costResult={items:[],pending:[]}) {
  const errors=validate(p); if(errors.length)return {errors,rows:[],flows:[],pending:[]};
  if(p.system==='SAM') {
    const a=simulate({...p,system:'SAC'},costResult),b=simulate({...p,system:'Price'},costResult);
    if(a.errors.length||b.errors.length)return a.errors.length?a:b;
    const keys=['opening','correction','released','interest','capitalized','amortization','extra','charges','total','balance'];
    const rows=Array.from({length:Math.max(a.rows.length,b.rows.length)},(_,k)=>{const row={month:k+1};for(const key of keys)row[key]=((a.rows[k]?.[key]||0)+(b.rows[k]?.[key]||0))/2;return row;});
    return summarize(p,rows,a.costs,0,costResult.pending);
  }
  const principal=p.stages.length?p.stages.reduce((s,x)=>s+x.value,0):p.principal;
  const i=monthly(p.rate,p.rateType),q=monthly(p.index,'annual');
  const iof= p.iof ? principal*(p.iofFixed/100+p.iofDaily/100*Math.min(365,p.iofDays||p.months*30)) : 0;
  const costs=[...(iof?[{name:'IOF estimado',value:iof}]:[]),...p.expenses.map(c=>({name:c.name||'Despesa avulsa',value:c.value})),...costResult.items];
  const advance=p.system==='Alemão'?principal*i:0;
  if(costs.reduce((s,c)=>s+c.value,0)+advance>=principal)return {errors:['Os custos iniciais devem ser menores que o total liberado.'],rows:[],flows:[],pending:costResult.pending};
  let balance=p.stages.length?0:principal;
  const start=Math.max(p.grace,p.stages.length?Math.max(...p.stages.map(s=>s.month))+1:0);
  const balloon=principal*p.residual/100;
  const rows=[];
  for(let month=1;month<=p.months;month++) {
    const released=p.stages.length?p.stages.filter(s=>s.month===month-1).reduce((s,x)=>s+x.value,0):0;
    balance+=released;
    const opening=balance, correction=balance*q;
    balance+=correction;
    const interest=balance*i, remaining=p.months-month+1;
    let amortization=0, capitalized=0, cashInterest=interest;
    if(p.system==='Alemão') { amortization=principal/p.months; cashInterest=Math.max(0,balance-amortization)*i; }
    else if(month<=start) { if(p.graceMode==='capitalize'){capitalized=interest;balance+=interest;cashInterest=0;} }
    else if(p.system==='Único'){ if(month===p.months)amortization=balance; else {capitalized=interest;balance+=interest;cashInterest=0;} }
    else if(p.system==='Americano') { if(month===p.months)amortization=balance; }
    else {
      const target=Math.min(balloon,balance);
      amortization=p.system==='Price'?payment(balance,i,remaining,target)-interest:(balance-target)/remaining;
      if(month===p.months)amortization=balance;
    }
    amortization=Math.min(balance,Math.max(0,amortization));
    balance-=amortization;
    const extra=month>start?Math.min(balance,p.extra+(month===p.extraMonth?p.extraValue:0)):0;
    balance=Math.max(0,balance-extra);
    const charges=opening>1e-8?opening*p.insurance/100+p.fee:0;
    const total=amortization+extra+cashInterest+charges;
    rows.push({month,opening,correction,released,interest,capitalized,amortization,extra,charges,total,balance});
    if(balance<1e-8 && (!p.stages.length||month>Math.max(...p.stages.map(s=>s.month))))break;
  }
  return summarize(p,rows,costs,advance,costResult.pending);
}
function summarize(p,rows,costs,advance,pending=[]) {
  if(rows.some(r=>Object.values(r).some(v=>typeof v==='number'&&!Number.isFinite(v))))return {errors:['Os parâmetros excedem o limite numérico do cálculo. Reduza a taxa, o prazo ou o valor.'],rows:[],flows:[],pending};
  const principal=p.stages.length?p.stages.reduce((s,x)=>s+x.value,0):p.principal;
  const initialCosts=costs.reduce((s,c)=>s+c.value,0);
  const flows=p.stages.length?p.stages.map(s=>({month:s.month,amount:s.value})):[{month:0,amount:principal}];
  flows.push({month:0,amount:-initialCosts-advance},...rows.map(r=>({month:r.month,amount:-r.total})));
  const payments=rows.reduce((s,r)=>s+r.total,0)+advance;
  const balance=rows.at(-1)?.balance||0;
  const cet=balance>.005?{rate:null,status:'incomplete'}:irr(flows);
  return {errors:[],version:ENGINE_VERSION,rows,flows,costs,pending,principal,initialCosts,advance,net:principal-initialCosts-advance,payments,totalPaid:payments,netCost:payments-(principal-initialCosts),interest:rows.reduce((s,r)=>s+r.interest,0),charges:rows.reduce((s,r)=>s+r.charges,0),first:rows[0]?.total||0,last:rows.at(-1)?.total||0,balance,cet:cet.rate,cetStatus:cet.status,cetAnnual:cet.rate===null?null:annual(cet.rate)};
}
export function monthLabel(start,month) {const [y,m,d]=start.split('-').map(Number); const last=new Date(y,m-1+month+1,0).getDate();return new Date(y,m-1+month,Math.min(d,last),12).toLocaleDateString('pt-BR',{month:'short',year:'numeric'});}

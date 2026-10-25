import {annual,irr,monthly,payment,realRate,equivalent} from './finance.js';
function positive(n,label,zero=true){if(!Number.isFinite(n)||n<(zero?0:.000001))throw new Error(`${label}: valor inválido.`);}
function term(n,max=600){if(!Number.isInteger(n)||n<1||n>max)throw new Error(`Prazo: informe entre 1 e ${max}.`);}
export function revolving(p){
  positive(p.limit,'Limite',false);positive(p.rate,'Taxa');term(p.days,366);positive(p.fixed,'IOF fixo');positive(p.daily,'IOF diário');positive(p.useDays,'Dias médios');
  for(const e of p.events){term(e.day,p.days);positive(e.value,'Evento');if(!['use','pay'].includes(e.type))throw new Error('Tipo de evento inválido.');}
  let balance=0,interest=0,iof=0,used=0,paid=0;const rows=[],warnings=[];const rate=equivalent(p.rate/100,'month','day');
  for(let day=1;day<=p.days;day++){
    const use=p.events.filter(e=>e.day===day&&e.type==='use').reduce((s,e)=>s+e.value,0);
    const requested=p.events.filter(e=>e.day===day&&e.type==='pay').reduce((s,e)=>s+e.value,0);
    const pay=Math.min(requested,balance+use);
    if(requested>pay+.005)warnings.push(`Dia ${day}: pagamento limitado à dívida, sem crédito excedente.`);
    balance+=use-pay;used+=use;paid+=pay;
    if(balance>p.limit+.005)warnings.push(`Dia ${day}: saldo excede o limite informado.`);
    const tax=use*(p.fixed/100+p.daily/100*Math.min(365,p.useDays));iof+=tax;
    const j=balance*rate;interest+=j;balance+=j;
    rows.push({day,use,pay,interest:j,iof:tax,balance});
  }
  return {rows,used,paid,interest,iof,balance,totalSettlement:balance+iof,cost:interest+iof,rate,warnings,convention:'IOF estimado por utilização, pago à parte no encerramento; não incorporado ao saldo diário.'};
}
export function freeFlow(p){
  positive(p.principal,'Principal',false);positive(p.rate,'Taxa');
  if(!p.events.length)throw new Error('Inclua pelo menos um pagamento.');
  for(const e of p.events){term(e.month);positive(e.value,'Pagamento');}
  const n=Math.max(...p.events.map(e=>e.month));let balance=p.principal,total=0,interest=0;const rows=[],flows=[{month:0,amount:p.principal}];
  for(let month=1;month<=n;month++){
    const j=balance*p.rate/100;const requested=p.events.filter(e=>e.month===month).reduce((s,e)=>s+e.value,0);
    const paid=Math.min(requested,balance+j);balance=Math.max(0,balance+j-paid);interest+=j;total+=paid;
    rows.push({month,total:paid,interest:j,amortization:paid-j,balance});flows.push({month,amount:-paid});
  }
  const cet=balance>.005?{rate:null,status:'incomplete'}:irr(flows);
  return {rows,total,interest,balance,cet:cet.rate,cetAnnual:cet.rate===null?null:annual(cet.rate),status:cet.status};
}
export function consortium(p){
  positive(p.credit,'Crédito',false);term(p.months);term(p.award,p.months);
  for(const k of ['admin','reserve','insurance','adjust','bid'])positive(p[k],k);
  if(p.bid>p.credit)throw new Error('Lance não pode exceder a carta inicial neste modelo.');
  if(p.bid>p.credit*(p.months-p.award)/p.months)throw new Error('Lance excede o fundo comum restante neste modelo. Reduza o lance ou antecipe a contemplação.');
  if(!['annual','monthly'].includes(p.mode))throw new Error('Convenção de reajuste inválida.');
  const rows=[],flows=[];let total=0;
  for(let month=1;month<=p.months;month++){
    const factor=(1+p.adjust/100)**(p.mode==='annual'?Math.floor((month-1)/12):(month-1)/12);
    const installment=p.credit*(1+(p.admin+p.reserve+p.insurance)/100)/p.months*factor;
    // Bid is an advance of the common fund; reduce subsequent common-fund installments.
    const reduction=month>p.award&&p.award<p.months?p.bid/(p.months-p.award):0;
    const regular=Math.max(0,installment-reduction),bid=month===p.award?p.bid:0;
    const received=month===p.award?p.credit*factor:0;
    const paid=regular+bid;total+=paid;
    rows.push({month,total:regular,extra:bid,credit:received});flows.push({month,amount:received-paid});
  }
  if(p.award===p.months&&p.bid>0)throw new Error('Lance exige parcelas posteriores para abatimento neste modelo.');
  const result=irr(flows);
  return {rows,total,first:rows[0].total,last:rows.at(-1).total,credit:rows[p.award-1].credit,cetAnnual:result.rate===null?null:annual(result.rate),status:result.status};
}
export function sinking(p){
  positive(p.target,'Objetivo',false);positive(p.initial,'Aplicação inicial');positive(p.yield,'Rendimento');term(p.months);
  const i=monthly(p.yield,'annual'),growth=(1+i)**p.months;
  const contribution=Math.max(0,Math.abs(i)<1e-12?(p.target-p.initial)/p.months:(p.target-p.initial*growth)*i/(growth-1));
  const rows=[];let balance=p.initial;
  for(let month=1;month<=p.months;month++){balance=balance*(1+i)+contribution;rows.push({month,balance,total:contribution});}
  const invested=p.initial+contribution*p.months;
  return {rows,contribution,invested,interest:balance-invested,balance,rate:i};
}
export function leasing(p){
  positive(p.asset,'Valor do bem',false);positive(p.entry,'Entrada');positive(p.rate,'Taxa');term(p.months);positive(p.vrg,'VRG');
  const principal=p.asset-p.entry,residual=p.asset*p.vrg/100,i=p.rate/100;
  if(principal<=0||residual>principal)throw new Error('Entrada e residual devem caber no valor financiado.');
  const installment=payment(principal,i,p.months,residual),rows=[];let balance=principal;
  for(let month=1;month<=p.months;month++){const interest=balance*i;balance-=installment-interest;rows.push({month,total:installment,interest,balance:Math.max(0,balance)});}
  const result=irr([{month:0,amount:principal},...rows.map(r=>({month:r.month,amount:-r.total})),{month:p.months,amount:-residual}]);
  return {rows,installment,residual,total:p.entry+installment*p.months+residual,cetAnnual:result.rate===null?null:annual(result.rate)};
}
export function discount(p){positive(p.face,'Título',false);positive(p.rate,'Taxa');term(p.days,36500);const d=equivalent(p.rate/100,'month','day');let net;
  if(p.regime==='simple')net=p.kind==='commercial'?p.face*(1-d*p.days):p.face/(1+d*p.days);
  else net=p.kind==='commercial'?p.face*(1-d)**p.days:p.face/(1+d)**p.days;
  if(net<0)throw new Error('O desconto excede o título. Revise taxa e prazo.');return {net,discount:p.face-net};}
export function late(p){for(const k of ['amount','days','fine','rate'])positive(p[k],k);const fine=p.amount*p.fine/100,interest=p.amount*p.rate/100*p.days/30;return {fine,interest,total:p.amount+fine+interest};}
export {realRate};

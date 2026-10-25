import {numberBR} from './finance.js';
export const states=[['AC','Acre'],['AL','Alagoas'],['AP','Amapá'],['AM','Amazonas'],['BA','Bahia'],['CE','Ceará'],['DF','Distrito Federal'],['ES','Espírito Santo'],['GO','Goiás'],['MA','Maranhão'],['MT','Mato Grosso'],['MS','Mato Grosso do Sul'],['MG','Minas Gerais'],['PA','Pará'],['PB','Paraíba'],['PR','Paraná'],['PE','Pernambuco'],['PI','Piauí'],['RJ','Rio de Janeiro'],['RN','Rio Grande do Norte'],['RS','Rio Grande do Sul'],['RO','Rondônia'],['RR','Roraima'],['SC','Santa Catarina'],['SP','São Paulo'],['SE','Sergipe'],['TO','Tocantins']];
export const costTypes=['Registro de imóveis','ITBI','Gravame / Detran','Escritura','Certidões','Avaliação','Selos','Outros'];
const norm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export function validRule(r) {
  const errors=[];
  if(!states.some(s=>s[0]===r.uf))errors.push('UF inválida');
  if(!String(r.name||'').trim())errors.push('Nome obrigatório');
  if(!Number.isFinite(r.fixed)||r.fixed<0||!Number.isFinite(r.percent)||r.percent<0)errors.push('Valor e percentual não podem ser negativos');
  if(!Number.isFinite(r.min)||r.min<0||(r.max!==null&&(!Number.isFinite(r.max)||r.max<r.min)))errors.push('Faixa inválida');
  if(!r.source?.trim())errors.push('Fonte obrigatória');
  if(r.type==='ITBI'&&!r.city?.trim())errors.push('Informe o município do ITBI');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(r.from)||!Number.isFinite(Date.parse(r.from)))errors.push('Vigência inicial inválida');
  if(r.to&&(!/^\d{4}-\d{2}-\d{2}$/.test(r.to)||!Number.isFinite(Date.parse(r.to))||r.to<r.from))errors.push('Vigência final inválida');
  return errors;
}
export function resolveCosts(p,rules) {
  const items=[],pending=[];
  if(!p.uf)return {items,pending};
  const relevant=rules.filter(r=>r.uf===p.uf);
  if(!relevant.length)pending.push(`Sem custos cadastrados para ${p.uf}. O resultado não inclui despesas locais desconhecidas.`);
  const selected=rules.filter(r=>p.enabledCosts.includes(r.id));
  if(relevant.length&&!selected.length)pending.push('Nenhuma cobrança local ativada. Selecione as despesas aplicáveis.');
  const matched=[];
  for(const id of p.enabledCosts) {
    const r=rules.find(r=>r.id===id);
    if(!r){pending.push('Uma regra ativada não existe mais. Selecione novamente.');continue;}
    const problems=validRule(r);
    if(r.uf!==p.uf)problems.push('UF diferente');
    if(r.city&&norm(r.city)!==norm(p.city))problems.push('município diferente');
    if(p.base<r.min||(r.max!==null&&p.base>r.max))problems.push('fora da faixa');
    if(p.startDate<r.from||(r.to&&p.startDate>r.to))problems.push('fora da vigência');
    if(problems.length){pending.push(`${r.name}: ${problems.join(', ')}.`);continue;}
    matched.push(r);
  }
  for(const r of matched){
    if(matched.some(x=>x.id!==r.id&&norm(x.name)===norm(r.name)&&norm(x.city)===norm(r.city))){pending.push(`${r.name}: regras sobrepostas; cobrança excluída até revisão.`);continue;}
    items.push({name:r.name,value:r.fixed+p.base*r.percent/100,ruleId:r.id,source:r.source});
  }
  return {items,pending:[...new Set(pending)]};
}
export function parseCostRows(matrix) {
  if(matrix.length<2)throw new Error('Inclua o cabeçalho e ao menos uma cobrança.');
  const aliases={uf:'uf',estado:'uf',nome:'name',name:'name',tipo:'type',type:'type',municipio:'city',city:'city',fixo:'fixed',fixed:'fixed',percentual:'percent',percent:'percent',de:'min','faixa de':'min',min:'min',ate:'max','faixa ate':'max',max:'max',inicio:'from',from:'from',fim:'to',to:'to',fonte:'source',source:'source'};
  const headers=matrix[0].map(h=>aliases[norm(h)]||norm(h));
  if(!headers.includes('uf')||!headers.includes('name'))throw new Error('Cabeçalhos obrigatórios: uf e nome.');
  return matrix.slice(1).filter(row=>row.some(v=>String(v).trim())).map((row,k)=>{
    const obj=Object.fromEntries(headers.map((h,i)=>[h,String(row[i]??'').trim()]));
    const rule={id:crypto.randomUUID(),uf:obj.uf?.toUpperCase(),name:obj.name||'',type:obj.type||'Outros',city:obj.city||'',fixed:obj.fixed?numberBR(obj.fixed):0,percent:obj.percent?numberBR(obj.percent):0,min:obj.min?numberBR(obj.min):0,max:obj.max?numberBR(obj.max):null,from:obj.from||'',to:obj.to||'',source:obj.source||'',updatedAt:new Date().toISOString()};
    return {line:k+2,rule,errors:validRule(rule)};
  });
}
export function parseDelimited(text) {
  const first=text.replace(/^\uFEFF/,'').split(/\r?\n/)[0];
  const sep=first.includes('\t')?'\t':first.includes(';')?';':',';
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===sep&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}
  if(quoted)throw new Error('Aspas não fechadas na tabela.');
  if(cell||row.length){row.push(cell);rows.push(row);}
  return rows;
}

import {defaults,validate} from './finance.js';
import {validRule} from './costs.js';
const KEY='credisim.local.v1';
export function initial(){return {schema:1,sim:defaults(),proposals:[],rules:[]};}
export function validateBackup(data){
  if(!data||data.schema!==1||!Array.isArray(data.proposals)||!Array.isArray(data.rules)||!data.sim)throw new Error('Backup incompatível.');
  if(data.proposals.length>200||data.rules.length>5000)throw new Error('Backup excede o limite de registros.');
  const sims=[data.sim,...data.proposals.map(p=>p.params)];
  for(const s of sims){if(!s||!Array.isArray(s.stages)||!Array.isArray(s.expenses)||!Array.isArray(s.enabledCosts)||validate(s).length)throw new Error('Backup contém uma simulação inválida.');}
  for(const r of data.rules)if(validRule(r).length||typeof r.id!=='string')throw new Error('Backup contém regra inválida.');
  if(data.simRules!==null&&data.simRules!==undefined){if(!Array.isArray(data.simRules)||data.simRules.some(r=>validRule(r).length))throw new Error('Regras históricas da simulação inválidas.');}
  for(const p of data.proposals){if(typeof p.id!=='string'||!Array.isArray(p.rules)||!p.createdAt)throw new Error('Proposta inválida.');for(const r of p.rules)if(validRule(r).length)throw new Error('Regra histórica inválida.');}
  return data;
}
export function load(){try{const text=localStorage.getItem(KEY);return text?validateBackup(JSON.parse(text)):initial();}catch{throw new Error('Não foi possível ler os dados locais. Exporte o armazenamento antes de limpar os dados do navegador.');}}
export function save(data){try{localStorage.setItem(KEY,JSON.stringify(data));}catch{throw new Error('Não foi possível salvar neste navegador. Faça um backup JSON.');}}

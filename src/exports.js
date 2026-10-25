// Minimal OOXML workbook writer: valid XLSX ZIP, numeric cells, inline strings.
const enc=new TextEncoder();
export const xml=s=>String(s??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
const crcTable=Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function binary(size,writes){const b=new Uint8Array(size),v=new DataView(b.buffer);for(const [at,value,bits]of writes)bits===16?v.setUint16(at,value,true):v.setUint32(at,value,true);return b;}
export function zip(files){
  const chunks=[],central=[];let offset=0;
  for(const [name,text]of Object.entries(files)){
    const filename=enc.encode(name),data=typeof text==='string'?enc.encode(text):text,crc=crc32(data);
    const header=binary(30,[[0,0x04034b50],[4,20,16],[6,0x800,16],[14,crc],[18,data.length],[22,data.length],[26,filename.length,16]]);
    chunks.push(header,filename,data);
    central.push(binary(46,[[0,0x02014b50],[4,20,16],[6,20,16],[8,0x800,16],[16,crc],[20,data.length],[24,data.length],[28,filename.length,16],[42,offset]]),filename);
    offset+=header.length+filename.length+data.length;
  }
  const size=central.reduce((s,b)=>s+b.length,0),count=Object.keys(files).length;
  return new Blob([...chunks,...central,binary(22,[[0,0x06054b50],[8,count,16],[10,count,16],[12,size],[16,offset]])],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function column(n){let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
export function workbook(sheets){
  const files={
    '[Content_Types].xml':`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`,
    '_rels/.rels':'<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml':`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${xml(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels':`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}</Relationships>`
  };
  sheets.forEach((s,i)=>{files[`xl/worksheets/sheet${i+1}.xml`]=`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols><col min="1" max="20" width="23" customWidth="1"/></cols><sheetData>${s.rows.map((row,r)=>`<row r="${r+1}">${row.map((v,c)=>`<c r="${column(c)}${r+1}" ${typeof v==='number'&&Number.isFinite(v)?`t="n"><v>${v}</v>`:`t="inlineStr"><is><t xml:space="preserve">${xml(v)}</t></is>`}</c>`).join('')}</row>`).join('')}</sheetData></worksheet>`;});
  return zip(files);
}
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
export async function readXlsx(file){
  const bytes=new Uint8Array(await file.arrayBuffer()),view=new DataView(bytes.buffer);let end=bytes.length-22;
  while(end>=0&&view.getUint32(end,true)!==0x06054b50)end--;
  if(end<0)throw new Error('XLSX inválido.');
  const count=view.getUint16(end+10,true),files={};let at=view.getUint32(end+16,true),total=0;
  for(let k=0;k<count;k++){
    if(view.getUint32(at,true)!==0x02014b50)throw new Error('Diretório ZIP inválido.');
    const method=view.getUint16(at+10,true),compressed=view.getUint32(at+20,true),size=view.getUint32(at+24,true),nl=view.getUint16(at+28,true),el=view.getUint16(at+30,true),cl=view.getUint16(at+32,true),local=view.getUint32(at+42,true);
    total+=size;if(total>25e6)throw new Error('Planilha excede 25 MB descompactada.');
    const name=new TextDecoder().decode(bytes.slice(at+46,at+46+nl));
    const begin=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true),payload=bytes.slice(begin,begin+compressed);
    if(/^(xl\/(worksheets\/sheet\d+\.xml|sharedStrings\.xml|workbook\.xml|_rels\/workbook\.xml\.rels))$/.test(name)){
      if(method===0)files[name]=new TextDecoder().decode(payload);
      else if(method===8){const stream=new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));files[name]=await new Response(stream).text();}
      else throw new Error('Compressão de XLSX não suportada. Exporte CSV.');
    }
    at+=46+nl+el+cl;
  }
  const parser=new DOMParser(),parse=s=>{const d=parser.parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw new Error('XML da planilha inválido.');return d;};
  const strings=files['xl/sharedStrings.xml']?[...parse(files['xl/sharedStrings.xml']).getElementsByTagName('si')].map(n=>n.textContent):[];
  const book=files['xl/workbook.xml']?parse(files['xl/workbook.xml']):null;
  const first=book?.getElementsByTagName('sheet')[0];
  const relId=first?.getAttribute('r:id');
  const rels=files['xl/_rels/workbook.xml.rels']?parse(files['xl/_rels/workbook.xml.rels']):null;
  const target=[...(rels?.getElementsByTagName('Relationship')||[])].find(r=>r.getAttribute('Id')===relId)?.getAttribute('Target');
  const name=target?(target.startsWith('/')?target.slice(1):'xl/'+target.replace(/^\.\//,'')):Object.keys(files).find(n=>n.startsWith('xl/worksheets/'));
  if(!files[name])throw new Error('Não foi possível ler a primeira aba.');
  return [...parse(files[name]).getElementsByTagName('row')].map(row=>{
    const result=[];for(const cell of row.getElementsByTagName('c')){
      const ref=cell.getAttribute('r')||'A1',letters=ref.replace(/\d/g,'');let c=0;for(const l of letters)c=c*26+l.charCodeAt(0)-64;c--;
      const value=cell.getElementsByTagName('v')[0]?.textContent||'';
      result[c]=cell.getAttribute('t')==='s'?strings[Number(value)]||'':cell.getAttribute('t')==='inlineStr'?cell.getElementsByTagName('is')[0]?.textContent||'':value;
    }return Array.from({length:result.length},(_,i)=>result[i]??'');
  });
}

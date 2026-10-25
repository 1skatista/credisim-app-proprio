import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const mime = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.json':'application/json', '.webmanifest':'application/manifest+json', '.md':'text/plain; charset=utf-8' };
const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    if (url.pathname==='/health') { res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({app:'credisim-local',version:'1.0.0'})); return; }
    const name = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const target = path.resolve(root,'.'+name);
    if (!target.startsWith(root) || name.includes('..') || name.includes('\\')) { res.writeHead(403).end(); return; }
    const body = await readFile(target);
    res.writeHead(200,{'Content-Type':mime[path.extname(target)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'}).end(body);
  } catch { res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}).end('Arquivo não encontrado'); }
});
server.listen(port,'127.0.0.1',()=>console.log(`CrediSim disponível em http://localhost:${port}`));
server.on('error',error=>{ console.error(error.message); process.exitCode=1; });

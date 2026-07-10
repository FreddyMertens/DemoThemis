// Convenience static server for the grant-review portal.
//   node docs/grant-portal/_serve.mjs   →   http://localhost:8099
// (The portal is fully self-contained, so you can also just open index.html directly.)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const types = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.ico':'image/x-icon' };

http.createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/' || p.endsWith('/')) p += 'index.html';
    const f = join(root, normalize(p).replace(/^(\.\.[\/\\])+/, ''));
    const data = await readFile(f);
    res.writeHead(200, { 'content-type': types[extname(f)] || 'application/octet-stream' });
    res.end(data);
  } catch { res.writeHead(404); res.end('not found'); }
}).listen(8099, () => console.log('Grant portal: http://localhost:8099'));

import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const types = { html: 'text/html', css: 'text/css', js: 'text/javascript', png: 'image/png' };
export function appServer(read) {
  return createServer((req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (!/^\/[a-zA-Z0-9._/-]*$/.test(path) || path.split('/').includes('..')) { res.writeHead(400).end(); return; }
    const name = path === '/' ? 'index.html' : path.slice(1);
    try {
      const data = read(name);
      if (!data) throw new Error('Not found');
      res.writeHead(200, { 'Content-Type': `${types[name.split('.').pop()] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
      res.end(data);
    } catch { res.writeHead(404).end('Not found'); }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = fileURLToPath(new URL('../app/', import.meta.url));
  const port = Number(process.env.PORT || 4178);
  appServer(name => readFileSync(resolve(root, name))).listen(port, '127.0.0.1', () => console.log(`Station Desk: http://127.0.0.1:${port}`));
}

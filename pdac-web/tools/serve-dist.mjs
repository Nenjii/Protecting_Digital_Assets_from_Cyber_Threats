// Minimal static server for dist/ (used by the screenshot and smoke-test tools).
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.json': 'application/json',
  '.mp4': 'video/mp4', '.ico': 'image/x-icon', '.md': 'text/markdown; charset=utf-8',
};

export function serveDist(port = 0) {
  const dist = fileURLToPath(new URL('../dist/', import.meta.url));
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://x');
      let p = normalize(join(dist, decodeURIComponent(url.pathname)));
      if (!p.startsWith(dist)) throw new Error('outside');
      if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
      const body = await readFile(p);
      res.writeHead(200, { 'content-type': TYPES[extname(p)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, port: server.address().port })));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { port } = await serveDist(Number(process.argv[2] ?? 4173));
  console.log(`Serving dist/ at http://localhost:${port}`);
}

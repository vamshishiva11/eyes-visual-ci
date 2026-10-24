import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = join(process.cwd(), 'app');
const PORT = Number(process.env.PORT ?? 4173);
const TYPES: Record<string, string> = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml' };

createServer(async (req, res) => {
  const path = normalize(new URL(req.url ?? '/', 'http://x').pathname).replace(/^(\.\.[/\\])+/, '');
  try {
    const file = await readFile(join(ROOT, path.endsWith('/') ? `${path}index.html` : path));
    res.writeHead(200, { 'Content-Type': TYPES[extname(path) || '.html'] ?? 'text/plain' }).end(file);
  } catch {
    res.writeHead(404).end('Not found');
  }
}).listen(PORT, () => console.log(`App on http://localhost:${PORT}`));

import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createRelay } from './relay';
const host = process.env.PLEASE_BIND ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3210);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('Invalid port');
const relay = createRelay({
  token: process.env.PLEASE_RELAY_TOKEN ?? '', apiKey: process.env.JEV_API_KEY ?? '',
  allowedOrigins: (process.env.PLEASE_ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean),
  perMinute: Number(process.env.PLEASE_PER_MINUTE ?? 20), perDay: Number(process.env.PLEASE_PER_DAY ?? 200),
});
const server = createServer(async (req, res) => {
  try {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (typeof value === 'string') headers.set(key, value);
    const init: RequestInit & { duplex?: string } = { method: req.method, headers };
    if (req.method !== 'GET' && req.method !== 'HEAD') { init.body = Readable.toWeb(req) as ReadableStream; init.duplex = 'half'; }
    const request = new Request(`http://127.0.0.1:${port}${req.url ?? '/'}`, init);
    const response = await relay.handle(request);
    res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(Buffer.from(await response.arrayBuffer()));
  } catch { res.writeHead(400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end('{"error":"Invalid request"}'); }
});
server.requestTimeout = 10_000; server.headersTimeout = 5_000; server.timeout = 12_000; server.maxConnections = 64;
server.listen(port, host, () => console.log(`Please.exe relay listening at ${host}:${port}. Drafts and credentials are not logged.`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));

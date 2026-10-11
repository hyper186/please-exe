import { createHash, timingSafeEqual } from 'node:crypto';
import { validText, isJevVerdict, type JevVerdict } from '../core/protocol';
import { classifyWithJev } from './jev';
export interface RelayConfig {
  token: string; apiKey: string; allowedOrigins: string[];
  perMinute?: number; perDay?: number; maxConcurrent?: number;
  classify?: (text: string, key: string) => Promise<JevVerdict>;
}
export function createRelay(config: RelayConfig) {
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(config.token)) throw new Error('Set a relay token of 32–128 random letters, digits, underscores or hyphens.');
  if (!config.allowedOrigins.length || config.allowedOrigins.some(o => !/^chrome-extension:\/\/[a-p]{32}$/.test(o))) throw new Error('Allow only explicit Chrome extension origins.');
  const minuteLimit = config.perMinute ?? 20; const dailyLimit = config.perDay ?? 200; const concurrentLimit = config.maxConcurrent ?? 3;
  for (const n of [minuteLimit, dailyLimit, concurrentLimit]) if (!Number.isSafeInteger(n) || n < 1) throw new Error('Invalid relay budget');
  let minute = Math.floor(Date.now() / 60_000); let day = Math.floor(Date.now() / 86_400_000); let minuteCount = 0; let dayCount = 0; let active = 0;
  const digest = (s: string) => createHash('sha256').update(s).digest(); const expected = digest(`Bearer ${config.token}`);
  async function handle(request: Request): Promise<Response> {
    const origin = request.headers.get('origin') ?? '';
    const allowed = config.allowedOrigins.includes(origin);
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Vary': 'Origin', ...(allowed ? { 'Access-Control-Allow-Origin': origin } : {}) };
    const reply = (status: number, data: unknown) => new Response(JSON.stringify(data), { status, headers });
    if (new URL(request.url).pathname !== '/v1/tone') return reply(404, { error: 'Not found' });
    if (!allowed) return reply(403, { error: 'Origin not allowed' });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '600' } });
    if (request.method !== 'POST') return reply(405, { error: 'POST required' });
    if (!timingSafeEqual(digest(request.headers.get('authorization') ?? ''), expected)) return reply(401, { error: 'Relay access token is missing or invalid' });
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return reply(415, { error: 'JSON required' });
    if (!config.apiKey) return reply(503, { error: 'Jev API key has not been configured on the relay' });
    const nowMinute = Math.floor(Date.now() / 60_000); const nowDay = Math.floor(Date.now() / 86_400_000);
    if (nowMinute !== minute) { minute = nowMinute; minuteCount = 0; }
    if (nowDay !== day) { day = nowDay; dayCount = 0; }
    if (minuteCount >= minuteLimit || dayCount >= dailyLimit || active >= concurrentLimit) return reply(429, { error: 'Relay budget reached. Try later; local checks still work.' });
    // Reserve a slot before reading a body; slow uploads cannot bypass concurrency accounting.
    active++;
    try {
      if (Number(request.headers.get('content-length') ?? 0) > 32_768) return reply(413, { error: 'Request too large' });
      const reader = request.body?.getReader(); const chunks: Uint8Array[] = []; let size = 0;
      if (!reader) return reply(400, { error: 'Draft required' });
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 32_768) { await reader.cancel(); return reply(413, { error: 'Request too large' }); } chunks.push(part.value); }
      let body: unknown;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return reply(400, { error: 'Invalid JSON' }); }
      if (!body || typeof body !== 'object' || Object.keys(body).some(k => k !== 'text') || !validText((body as { text?: unknown }).text)) return reply(400, { error: 'Provide a draft of 1–8,000 characters' });
      // Recheck after awaits: simultaneous uploads cannot consume the same final budget slot.
      if (minuteCount >= minuteLimit || dayCount >= dailyLimit) return reply(429, { error: 'Relay budget reached' });
      minuteCount++; dayCount++;
      try {
        const result = await (config.classify ?? classifyWithJev)((body as { text: string }).text, config.apiKey);
        if (!isJevVerdict(result)) throw new Error('Invalid verdict');
        return reply(200, result);
      } catch { return reply(502, { error: 'Jev is temporarily unavailable. Local checks still work.' }); }
    } catch { return reply(400, { error: 'Could not read the request' }); }
    finally { active--; }
  }
  return { handle };
}

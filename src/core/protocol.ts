import type { Level, Mode } from './analyze';
export const CLOUD_LIMIT = 8_000;
export const HOSTS = ['claude.ai', 'chatgpt.com'] as const;
export interface Preferences { mode: Mode; pausedSites: string[]; relayEndpoint: string }
export const DEFAULT_PREFERENCES: Preferences = { mode: 'playful', pausedSites: [], relayEndpoint: '' };
export type JevReason = 'direct' | 'insult' | 'dismissal' | 'accusation' | 'context' | 'uncertain';
export interface JevVerdict { level: Level; reason: JevReason; confidence: number; model: string; latencyMs: number; inputTokens: number }
export function validRelayEndpoint(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 256) return null;
  try {
    const u = new URL(value);
    if (u.username || u.password || u.search || u.hash || (u.pathname !== '/' && u.pathname !== '')) return null;
    if (u.origin === 'http://127.0.0.1:3210') return u.origin;
    if (u.protocol !== 'https:' || u.port || !u.hostname.includes('.') || /[\[\]:]/.test(u.hostname) || /^[\d.]+$/.test(u.hostname) || /\.(?:local|localhost|internal|test|invalid)$/.test(u.hostname)) return null;
    return u.origin;
  } catch { return null; }
}
export function validText(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0 && value.length <= CLOUD_LIMIT; }
export interface Sender { id?: string; url?: string; frameId?: number; tab?: { id?: number } }
export function allowedSender(sender: Sender, id: string): boolean {
  if (sender.id !== id || !sender.url || sender.frameId !== 0 || !Number.isInteger(sender.tab?.id)) return false;
  try { const u = new URL(sender.url); return u.protocol === 'https:' && (HOSTS as readonly string[]).includes(u.hostname); } catch { return false; }
}
export function sanitizePreferences(value: Partial<Preferences> | undefined): Preferences {
  return {
    mode: value?.mode === 'plain' ? 'plain' : 'playful',
    pausedSites: Array.isArray(value?.pausedSites) ? value.pausedSites.filter(s => (HOSTS as readonly string[]).includes(s)) : [],
    relayEndpoint: validRelayEndpoint(value?.relayEndpoint) ?? '',
  };
}
export function isJevVerdict(value: unknown): value is JevVerdict {
  if (!value || typeof value !== 'object') return false;
  const v = value as JevVerdict;
  return ['neutral', 'green', 'yellow', 'red'].includes(v.level) && ['direct','insult','dismissal','accusation','context','uncertain'].includes(v.reason)
    && Number.isFinite(v.confidence) && v.confidence >= 0 && v.confidence <= 1
    && typeof v.model === 'string' && /^jev-[\w.-]{1,40}$/.test(v.model)
    && Number.isFinite(v.latencyMs) && v.latencyMs >= 0 && v.latencyMs <= 120_000
    && Number.isSafeInteger(v.inputTokens) && v.inputTokens >= 0 && v.inputTokens <= 1_000_000;
}
export const JEV_REASONS: Record<JevReason, string> = {
  direct: 'Jev reads this as a direct or constructive request. Being firm is fine.',
  insult: 'Jev detects a personal insult. Describe the error and the fix you want.',
  dismissal: 'Jev detects dismissive phrasing. Name what makes the answer unhelpful.',
  accusation: 'Jev detects accusatory wording. Point to the requirement that was missed.',
  context: 'Jev reads the wording in a quoted, creative, or analytical context.',
  uncertain: 'Jev is unsure about the context. Use your judgment; this is not a policy verdict.',
};

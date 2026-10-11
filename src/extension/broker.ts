import { allowedSender, isJevVerdict, sanitizePreferences, validRelayEndpoint, validText, type Preferences, type Sender } from '../core/protocol';
interface Credential { endpoint: string; token: string }
interface BrokerDeps {
  id: string;
  loadPreferences: () => Promise<Partial<Preferences> | undefined>;
  savePreferences: (p: Preferences) => Promise<void>;
  loadCredential: () => Promise<Credential | null>;
  saveCredential: (c: Credential | null) => Promise<void>;
  hasPermission: (origin: string) => Promise<boolean>;
  openSettings: () => Promise<void>;
  fetcher: typeof fetch;
}
export function createBroker(deps: BrokerDeps) {
  const active = new Set<string>();
  let pending: { id: string; text: string; host: string; endpoint: string; expiresAt: number } | null = null;
  let expiration: ReturnType<typeof setTimeout> | undefined;
  let lastReviewAt = 0;
  function clearReview() { pending = null; clearTimeout(expiration); }

  return async (message: unknown, sender: Sender) => {
    const fail = (error: string) => ({ ok: false as const, error });
    const settingsPage = sender.id === deps.id && sender.url === `chrome-extension://${deps.id}/options.html`;
    const content = allowedSender(sender, deps.id);
    if ((!settingsPage && !content) || !message || typeof message !== 'object') return fail('Request not allowed');
    const m = message as Record<string, unknown>;
    const preferences = sanitizePreferences(await deps.loadPreferences());
    if (m.type === 'prepare-review' && content) {
      if (!validText(m.text) || preferences.pausedSites.includes(new URL(sender.url!).hostname)) return fail('Cannot review this draft.');
      if (Date.now() - lastReviewAt < 5000) return fail('A review was just opened. Use the extension tab.');
      clearReview(); lastReviewAt = Date.now();
      pending = { id: crypto.randomUUID(), text: m.text, host: new URL(sender.url!).hostname, endpoint: preferences.relayEndpoint, expiresAt: Date.now() + 120_000 };
      expiration = setTimeout(clearReview, 120_000);
      (expiration as unknown as { unref?: () => void }).unref?.();
      await deps.openSettings();
      return { ok: true as const };
    }
    if (m.type === 'get-review' && settingsPage) {
      if (pending && pending.expiresAt <= Date.now()) clearReview();
      return { ok: true as const, review: pending };
    }
    if (m.type === 'clear-review' && settingsPage) { clearReview(); return { ok: true as const }; }
    if (m.type === 'settings') {
      const credential = await deps.loadCredential();
      return { ok: true as const, preferences, tokenConfigured: !!credential && credential.endpoint === preferences.relayEndpoint };
    }
    if (m.type === 'open-settings' && content) { await deps.openSettings(); return { ok: true as const }; }
    if (m.type === 'pause' && content) {
      const host = new URL(sender.url!).hostname;
      await deps.savePreferences({ ...preferences, pausedSites: [...new Set([...preferences.pausedSites, host])] });
      return { ok: true as const };
    }
    if (m.type === 'save-settings' && settingsPage) {
      if (!m.preferences || typeof m.preferences !== 'object') return fail('Invalid preferences');
      const input = m.preferences as Partial<Preferences>;
      if (input.relayEndpoint && !validRelayEndpoint(input.relayEndpoint)) return fail('Use an HTTPS origin, or http://127.0.0.1:3210 for local testing.');
      if (m.token !== undefined && (typeof m.token !== 'string' || (m.token !== '' && !/^[A-Za-z0-9_-]{32,128}$/.test(m.token)))) return fail('Use the relay access token, 32–128 characters. Never enter a Jev API key here.');
      const next = sanitizePreferences(input);
      if (next.relayEndpoint !== preferences.relayEndpoint || m.clearToken === true || !next.relayEndpoint) await deps.saveCredential(null);
      if (typeof m.token === 'string' && m.token && next.relayEndpoint) await deps.saveCredential({ endpoint: next.relayEndpoint, token: m.token });
      await deps.savePreferences(next);
      return { ok: true as const };
    }
    // The host page can request a local handoff, but only extension-owned UI can transmit.
    if (!settingsPage || m.confirmed !== true) return fail('Confirm the check in the Please.exe extension tab.');
    let text: unknown = m.text;
    if (m.type === 'classify-review') {
      if (!pending || pending.id !== m.reviewId || pending.expiresAt <= Date.now() || pending.endpoint !== preferences.relayEndpoint) { clearReview(); return fail('The review expired or the relay changed. Open a fresh review from your chat.'); }
      text = pending.text; clearReview();
    } else if (m.type !== 'classify' || m.endpoint !== preferences.relayEndpoint) return fail('The relay changed. Review the destination again.');
    if (!validText(text)) return fail('Review and confirm a draft of 1–8,000 characters.');
    if (content && preferences.pausedSites.includes(new URL(sender.url!).hostname)) return fail('Please.exe is paused on this site.');
    const endpoint = validRelayEndpoint(preferences.relayEndpoint);
    const credential = await deps.loadCredential();
    if (!endpoint || !credential || credential.endpoint !== endpoint) return fail('Connect your Jev relay in Settings. Local checks still work.');
    if (!await deps.hasPermission(`${endpoint}/*`)) return fail('Grant access to your configured relay in Settings.');
    const scope = content ? `tab:${sender.tab!.id}` : 'settings';
    if (active.has(scope) || active.size >= 3) return fail('A Jev check is already running.');
    active.add(scope);
    try {
      const response = await deps.fetcher(`${endpoint}/v1/tone`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${credential.token}` }, body: JSON.stringify({ text }), credentials: 'omit', redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(10_000) });
      if (!response.ok) {
        const errors: Record<number, string> = { 401: 'The relay access token is invalid. Reconnect in Settings.', 403: 'The relay must allow this extension’s ID. See Settings.', 429: 'The relay’s usage limit was reached. Local checks still work.', 503: 'The relay needs a Jev API key. Local checks still work.' };
        return fail(errors[response.status] ?? 'Jev is unavailable. Local checks still work.');
      }
      // Never expose arbitrary relay HTML/errors to the page or UI.
      const reader = response.body?.getReader(); if (!reader) return fail('Invalid relay response.');
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 4096) { await reader.cancel(); return fail('Invalid relay response.'); } chunks.push(part.value); }
      const bytes = new Uint8Array(size); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      const result: unknown = JSON.parse(new TextDecoder().decode(bytes));
      if (!isJevVerdict(result)) return fail('Invalid relay response. Local checks still work.');
      return { ok: true as const, result };
    } catch { return fail('Could not reach Jev. Check your relay; local checks still work.'); }
    finally { active.delete(scope); }
  };
}

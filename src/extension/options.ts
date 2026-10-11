import { analyze } from '../core/analyze';
import { SAMPLES } from '../core/samples';
import { DEFAULT_PREFERENCES, JEV_REASONS, sanitizePreferences, validRelayEndpoint, type Preferences, type JevVerdict } from '../core/protocol';
import { createPanel } from './panel';
import { checkSnapshot } from './snapshot';
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let preferences: Preferences = DEFAULT_PREFERENCES;
const inExtension = typeof chrome !== 'undefined' && !!chrome.runtime?.id;
const endpointField = $<HTMLInputElement>('relay-endpoint');
const tokenField = $<HTMLInputElement>('relay-token');
const draft = $<HTMLTextAreaElement>('playground-draft');
const toast = (text: string) => { $('toast').textContent = text; };
const send = async (body: unknown) => {
  if (!inExtension) throw new Error('Open this page from the installed Please.exe extension to save settings or connect Jev.');
  const response = await chrome.runtime.sendMessage(body);
  if (!response?.ok) throw new Error(response?.error ?? 'Could not connect to the extension. Reload this page.');
  return response;
};
function fields(): Preferences {
  const mode = (document.querySelector<HTMLInputElement>('input[name=mode]:checked')?.value === 'plain' ? 'plain' : 'playful');
  const pausedSites = ['claude', 'chatgpt'].filter(name => !$<HTMLInputElement>(`${name}-enabled`).checked).map(name => name === 'claude' ? 'claude.ai' : 'chatgpt.com');
  return { mode, pausedSites, relayEndpoint: preferences.relayEndpoint };
}
const panel = createPanel({ doc: document, shadowMode: 'open', endpoint: () => preferences.relayEndpoint,
  onCopy: text => navigator.clipboard.writeText(text),
  onCloud: (text, endpoint) => checkSnapshot(text, () => draft.value, async () => (await send({ type: 'classify', text, endpoint, confirmed: true })).result as JevVerdict),
  onSettings: () => { $('relay').scrollIntoView({ behavior: 'smooth', block: 'start' }); endpointField.focus(); },
  onPause: () => toast('This is a practice draft. Use the site toggles to pause on Claude or ChatGPT.'),
});
$('playground-meter').append(panel.host);
function render() { panel.update(analyze(draft.value, fields().mode), draft.value); }
draft.addEventListener('input', render);
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-sample]')) button.addEventListener('click', () => { draft.value = SAMPLES[button.dataset.sample!]; render(); });
for (const radio of document.querySelectorAll('input[name=mode]')) radio.addEventListener('change', render);
async function refresh() {
  if (!inExtension) { $('extension-origin').textContent = 'Shown after installing the extension.'; render(); return; }
  const response = await send({ type: 'settings' }); preferences = sanitizePreferences(response.preferences);
  $<HTMLInputElement>('claude-enabled').checked = !preferences.pausedSites.includes('claude.ai');
  $<HTMLInputElement>('chatgpt-enabled').checked = !preferences.pausedSites.includes('chatgpt.com');
  document.querySelector<HTMLInputElement>(`input[name=mode][value=${preferences.mode}]`)!.checked = true;
  endpointField.value = preferences.relayEndpoint;
  $('extension-origin').textContent = `chrome-extension://${chrome.runtime.id}`;
  $('connection-state').textContent = response.tokenConfigured ? 'Relay configured for this browser session · checks are manual' : preferences.relayEndpoint ? 'Reconnect your relay token for this browser session' : 'Local mode · no cloud connection';
  render();
}
$('preferences-form').addEventListener('submit', async event => {
  event.preventDefault();
  try { await send({ type: 'save-settings', preferences: fields() }); await refresh(); $('preferences-status').textContent = 'Saved. Your open chats will update automatically.'; }
  catch (error) { $('preferences-status').textContent = (error as Error).message; }
});
$('relay-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (!event.isTrusted) return;
  const endpoint = validRelayEndpoint(endpointField.value.trim());
  if (!endpoint) { $('relay-status').textContent = 'Use an HTTPS origin without a path, or http://127.0.0.1:3210.'; return; }
  if (!inExtension) { $('relay-status').textContent = 'Install the extension to connect a relay.'; return; }
  if (tokenField.value && !/^[A-Za-z0-9_-]{32,128}$/.test(tokenField.value)) { $('relay-status').textContent = 'Enter a separate relay access token of 32–128 characters. Do not enter your provider API key.'; return; }
  const previous = preferences.relayEndpoint;
  try {
    const granted = await chrome.permissions.request({ origins: [`${endpoint}/*`] });
    if (!granted) { $('relay-status').textContent = 'Access was not granted. Local checks are still available.'; return; }
    await send({ type: 'save-settings', preferences: { ...fields(), relayEndpoint: endpoint }, token: tokenField.value });
    tokenField.value = '';
    if (previous && previous !== endpoint) await chrome.permissions.remove({ origins: [`${previous}/*`] });
    await refresh(); $('relay-status').textContent = 'Saved. Use the sample below to verify the connection.';
  } catch (error) { $('relay-status').textContent = (error as Error).message; }
});
$('disconnect').addEventListener('click', async () => {
  try { const previous = preferences.relayEndpoint; await send({ type: 'save-settings', preferences: { ...fields(), relayEndpoint: '' }, clearToken: true }); tokenField.value = ''; if (previous) await chrome.permissions.remove({ origins: [`${previous}/*`] }); $<HTMLInputElement>('relay-consent').checked = false; await refresh(); $('relay-status').textContent = 'Disconnected. Relay credentials and optional access removed.'; }
  catch (error) { $('relay-status').textContent = (error as Error).message; }
});
$('test-jev').addEventListener('click', async event => {
  if (!event.isTrusted) return;
  const button = event.currentTarget as HTMLButtonElement; button.disabled = true;
  $('jev-test-result').textContent = 'Sending the fixed sample to your configured relay and TypeSafe…';
  try { const { result } = await send({ type: 'classify', text: 'That answer is incorrect. Check the calculation.', endpoint: preferences.relayEndpoint, confirmed: true }); const v = result as JevVerdict; $('jev-test-result').textContent = `${v.level === 'neutral' ? 'Uncertain' : v.level.toUpperCase()} · ${JEV_REASONS[v.reason]} ${v.model} · ${v.latencyMs} ms · ${v.inputTokens} input tokens.`; }
  catch (error) { $('jev-test-result').textContent = (error as Error).message; }
  finally { button.disabled = false; }
});
type Review = { id: string; text: string; host: string; endpoint: string; expiresAt: number };
let review: Review | null = null;
let reviewTimer: ReturnType<typeof setTimeout> | undefined;
function clearReviewUI(message: string) {
  clearTimeout(reviewTimer); review = null;
  $('review-draft').textContent = ''; $('review-details').hidden = true;
  $('review-status').textContent = message;
}
async function loadReview() {
  if (!inExtension) return;
  const response = await send({ type: 'get-review' });
  if (!response.review) return;
  review = response.review as Review;
  $('chat-review').hidden = false; $('review-details').hidden = false;
  $('review-source').textContent = `Draft snapshot from ${review.host}. Your chat may have changed since opening this review.`;
  $('review-draft').textContent = review.text;
  $('review-destination').textContent = `Send this exact snapshot to ${review.endpoint}, then to TypeSafe AI. Their data policies apply. This review expires after two minutes.`;
  $('review-status').textContent = 'Nothing has been sent. Review the text and destination before confirming.';
  $<HTMLButtonElement>('approve-review').disabled = false;
  clearTimeout(reviewTimer);
  reviewTimer = setTimeout(() => clearReviewUI('This review expired. Open a fresh review from your chat.'), Math.max(0, review.expiresAt - Date.now()));
  $('chat-review').scrollIntoView({ block: 'start' });
}
$('approve-review').addEventListener('click', async event => {
  if (!event.isTrusted || !review) return;
  const id = review.id;
  clearReviewUI('Sending the reviewed snapshot to your relay and TypeSafe…');
  try {
    const { result } = await send({ type: 'classify-review', reviewId: id, confirmed: true });
    const v = result as JevVerdict;
    $('review-status').textContent = `${v.level === 'neutral' ? 'Uncertain' : v.level.toUpperCase()} · ${JEV_REASONS[v.reason]} ${v.model} · ${v.latencyMs} ms. This verdict applies to the snapshot you approved. Your chat was not changed.`;
  } catch (error) { $('review-status').textContent = (error as Error).message; }
});
$('cancel-review').addEventListener('click', async () => {
  clearReviewUI('Cancelled. Nothing sent.');
  try { await send({ type: 'clear-review' }); } catch { /* The worker also expires pending reviews. */ }
});
if (inExtension) chrome.runtime.onMessage.addListener((message: { type?: string }) => {
  if (message.type === 'review-ready') void loadReview().catch(error => toast(error.message));
});
void refresh().then(loadReview).catch(error => toast(error.message));

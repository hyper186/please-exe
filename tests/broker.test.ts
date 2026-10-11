import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBroker } from '../src/extension/broker.ts';
const id = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const content = { id, url: 'https://claude.ai/new', frameId: 0, tab: { id: 1 } };
const options = { id, url: `chrome-extension://${id}/options.html` };
function setup() {
  let prefs: any = { mode: 'playful', pausedSites: [], relayEndpoint: 'https://relay.example.com' };
  let credential: any = { endpoint: 'https://relay.example.com', token: 'test-only-secret-token-32-characters' };
  let calls = 0;
  const broker = createBroker({ id, loadPreferences: async () => prefs, savePreferences: async (p: any) => { prefs = p; }, loadCredential: async () => credential, saveCredential: async (c: any) => { credential = c; }, hasPermission: async () => true, openSettings: async () => {}, fetcher: async () => { calls++; return Response.json({ level: 'red', reason: 'insult', confidence: 0.9, model: 'jev-1.13.0', latencyMs: 123, inputTokens: 900 }); } });
  return { broker, calls: () => calls, credential: () => credential };
}
test('content scripts can get preferences but never the relay credential', async () => {
  const { broker } = setup(); const r = await broker({ type: 'settings' }, content);
  assert.equal(r.ok, true); assert.doesNotMatch(JSON.stringify(r), /test-only-secret/);
});
test('only settings page can change relay configuration', async () => {
  const { broker } = setup();
  assert.equal((await broker({ type: 'save-settings', preferences: { relayEndpoint: 'https://evil.example' } }, content)).ok, false);
  assert.equal((await broker({ type: 'settings' }, { ...content, id: 'other' })).ok, false);
});
test('endpoint changes invalidate rather than forward existing credentials', async () => {
  const { broker, credential, calls } = setup();
  const saved = await broker({ type: 'save-settings', preferences: { mode: 'plain', pausedSites: [], relayEndpoint: 'https://different.example.com' } }, options);
  assert.equal(saved.ok, true); assert.equal(credential(), null);
  assert.equal((await broker({ type: 'classify', text: 'You are useless.', confirmed: true }, content)).ok, false);
  assert.equal(calls(), 0);
});
test('cloud calls require explicit consent and bounded text', async () => {
  const { broker, calls } = setup();
  for (const msg of [{ type: 'classify', text: 'You are useless.' }, { type: 'classify', text: 'x'.repeat(8001), confirmed: true }]) assert.equal((await broker(msg, content)).ok, false);
  assert.equal(calls(), 0);
  assert.equal((await broker({ type: 'classify', text: 'You are useless.', confirmed: true, endpoint: 'https://relay.example.com' }, options)).ok, true);
  assert.equal(calls(), 1);
});
test('host pages cannot invoke classification even if they claim consent', async () => {
  const { broker, calls } = setup();
  assert.equal((await broker({ type: 'classify', text: 'You are useless.', confirmed: true }, content)).ok, false);
  assert.equal(calls(), 0);
});
test('a prepared review is visible only to extension UI and consumed once', async () => {
  const { broker, calls } = setup();
  const prep = await broker({ type: 'prepare-review', text: 'You are useless.' }, content);
  assert.equal(prep.ok, true); assert.equal(calls(), 0);
  assert.equal((await broker({ type: 'get-review' }, content)).ok, false);
  const reply = await broker({ type: 'get-review' }, options);
  assert.equal(reply.ok, true);
  if (!reply.ok || !reply.review) throw new Error('Review unavailable');
  const review = reply.review;
  assert.equal(review.text, 'You are useless.'); assert.equal(review.host, 'claude.ai');
  assert.equal((await broker({ type: 'classify-review', reviewId: review.id, confirmed: true }, options)).ok, true);
  assert.equal((await broker({ type: 'classify-review', reviewId: review.id, confirmed: true }, options)).ok, false);
  assert.equal(calls(), 1);
});
test('cancelled reviews cannot be transmitted', async () => {
  const { broker, calls } = setup();
  await broker({ type: 'prepare-review', text: 'You are useless.' }, content);
  const r = await broker({ type: 'get-review' }, options);
  if (!r.ok || !r.review) throw new Error('Review missing');
  await broker({ type: 'clear-review' }, options);
  assert.equal((await broker({ type: 'classify-review', reviewId: r.review.id, confirmed: true }, options)).ok, false);
  assert.equal(calls(), 0);
});
test('a destination change invalidates the already previewed consent', async () => {
  const { broker, calls } = setup();
  await broker({ type: 'prepare-review', text: 'You are useless.' }, content);
  const r = await broker({ type: 'get-review' }, options);
  if (!r.ok || !r.review) throw new Error('Review missing');
  await broker({ type: 'save-settings', preferences: { mode: 'playful', pausedSites: [], relayEndpoint: 'https://new.example.com' }, token: 'new-test-only-token-32-characters-long' }, options);
  assert.equal((await broker({ type: 'classify-review', reviewId: r.review.id, confirmed: true }, options)).ok, false);
  assert.equal((await broker({ type: 'classify', text: 'Check this.', confirmed: true, endpoint: 'https://relay.example.com' }, options)).ok, false);
  assert.equal(calls(), 0);
});

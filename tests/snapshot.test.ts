import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkSnapshot } from '../src/extension/snapshot.ts';
test('silent draft changes during a request cannot attach a verdict to different text', async () => {
  let draft = 'original';
  await assert.rejects(checkSnapshot('original', () => draft, async () => { draft = 'changed silently'; return 'verdict'; }), /draft changed/i);
});
test('a changed draft never starts a request', async () => {
  let calls = 0;
  await assert.rejects(checkSnapshot('original', () => 'new', async () => { calls++; return 'verdict'; }), /draft changed/i);
  assert.equal(calls, 0);
});
test('unchanged draft returns its result', async () => {
  assert.equal(await checkSnapshot('original', () => 'original', async () => 'verdict'), 'verdict');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { findComposer, readDraft } from '../src/extension/adapters.ts';
import { validRelayEndpoint, validText, allowedSender } from '../src/core/protocol.ts';
function dom(html: string) { const w = new Window(); w.document.body.innerHTML = html; return w.document as unknown as Document; }
test('selects ChatGPT composer without inspecting an unrelated editor', () => {
  const d = dom('<textarea name="search">private search</textarea><div id="prompt-textarea" contenteditable="true">Fix this.</div>');
  assert.equal(findComposer(d, 'chatgpt.com')?.id, 'prompt-textarea');
  assert.equal(findComposer(d, 'unrelated.example'), null);
});
test('selects Claude editor and rejects hidden duplicates', () => {
  const d = dom('<div hidden><div class="tiptap" contenteditable="true">old</div></div><div id="draft" class="tiptap ProseMirror" contenteditable="true" role="textbox">Please help.</div>');
  assert.equal(findComposer(d, 'claude.ai')?.id, 'draft');
});
test('does not fall back to unrelated textareas when composer changes', () => {
  assert.equal(findComposer(dom('<textarea name="billing">secret</textarea>'), 'claude.ai'), null);
});
test('reads text literally, retaining newlines and no markup', () => {
  const d = dom('<textarea id="t">Line one\n&lt;script&gt;bad&lt;/script&gt;</textarea>');
  assert.equal(readDraft(d.getElementById('t')!), 'Line one\n<script>bad</script>');
});
test('returns no ambiguous composer', () => {
  const d = dom('<div class="tiptap" contenteditable="true">one</div><div class="tiptap" contenteditable="true">two</div>');
  assert.equal(findComposer(d, 'claude.ai'), null);
});
for (const bad of ['http://example.com', 'https://user:pass@example.com', 'file:///etc/passwd', 'javascript:alert(1)', 'https://example.com/?secret=x', 'https://example.com/#fragment', 'https://127.0.0.1', 'https://192.168.0.1', 'http://localhost:9000', 'https://example.com/path', null]) {
  test(`reject unsafe relay endpoint ${String(bad)}`, () => assert.equal(validRelayEndpoint(bad), null));
}
test('allows HTTPS relay origin and explicit loopback development relay', () => {
  assert.equal(validRelayEndpoint('https://relay.example.com/'), 'https://relay.example.com');
  assert.equal(validRelayEndpoint('http://127.0.0.1:3210'), 'http://127.0.0.1:3210');
});
test('cloud text validation bounds the entire submitted draft', () => {
  assert.equal(validText('Please check this.'), true);
  for (const value of ['', '   ', null, {}, 'x'.repeat(8001)]) assert.equal(validText(value), false);
});
test('only this extension and supported top-frame content scripts are trusted senders', () => {
  assert.equal(allowedSender({ id: 'self', url: 'https://claude.ai/new', frameId: 0, tab: { id: 4 } }, 'self'), true);
  for (const sender of [
    { id: 'other', url: 'https://claude.ai/new', frameId: 0, tab: { id: 4 } },
    { id: 'self', url: 'https://claude.ai.evil.com', frameId: 0, tab: { id: 4 } },
    { id: 'self', url: 'https://chatgpt.com', frameId: 1, tab: { id: 4 } },
    { id: 'self', url: 'http://claude.ai', frameId: 0, tab: { id: 4 } },
  ]) assert.equal(allowedSender(sender, 'self'), false);
});

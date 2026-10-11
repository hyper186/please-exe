import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { createPanel } from '../src/extension/panel.ts';
import { analyze } from '../src/core/analyze.ts';
function setup() {
  const w = new Window(); let root: any;
  const original = w.HTMLElement.prototype.attachShadow;
  w.HTMLElement.prototype.attachShadow = function(options) { root = original.call(this, options); return root; };
  let cloudCalls = 0;
  const panel = createPanel({ doc: w.document as unknown as Document, onCopy: async () => {}, onCloud: async () => { cloudCalls++; throw new Error('unavailable'); }, onSettings() {}, onPause() {}, endpoint: () => 'https://relay.example.com' });
  if (panel.host) (w.document as unknown as Document).body.append(panel.host);
  return { w, panel, getRoot: () => root, cloudCalls: () => cloudCalls };
}
test('renders user text literally and isolates its DOM from the host page', () => {
  const { panel, getRoot } = setup();
  const text = "You're an idiot. <img src=x onerror=alert(1)>";
  panel.update(analyze(text), text);
  assert.ok(panel.host);
  assert.equal(panel.host.shadowRoot, null);
  const root = getRoot();
  assert.equal(root.querySelector('img'), null);
  assert.ok(root.textContent.includes('<img src=x onerror=alert(1)>'));
});
test('updates the accessible tone label when the draft changes', () => {
  const { panel, getRoot } = setup();
  panel.update(analyze('You are useless.'), 'You are useless.');
  assert.match(getRoot().querySelector('[aria-live]').textContent, /harsh/i);
  panel.update(analyze('Please check the calculation.'), 'Please check the calculation.');
  assert.match(getRoot().querySelector('[aria-live]').textContent, /clear/i);
  assert.equal(getRoot().querySelector('[data-suggestion]'), null);
});
test('synthetic page events cannot trigger Jev transmission', () => {
  const { panel, getRoot, cloudCalls } = setup();
  panel.update(analyze('You are useless.'), 'You are useless.');
  getRoot().querySelector('[data-cloud]').click();
  assert.equal(cloudCalls(), 0);
});

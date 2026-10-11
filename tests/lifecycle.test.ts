import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import { bindPageLifecycle } from '../src/extension/lifecycle.ts';
test('suspends on leaving and resumes exactly once on a cached-page restoration', () => {
  const window = new Window(); let suspended = 0; let resumed = 0;
  // Happy DOM aliases PageTransitionEvent to Event, so provide the real browser property.
  const transition = (type: string, persisted: boolean) => Object.assign(new window.Event(type), { persisted });
  const dispose = bindPageLifecycle(window as unknown as globalThis.Window, () => suspended++, () => resumed++);
  window.dispatchEvent(transition('pagehide', true));
  window.dispatchEvent(transition('pageshow', true));
  assert.equal(suspended, 1); assert.equal(resumed, 1);
  window.dispatchEvent(transition('pageshow', false));
  assert.equal(resumed, 1);
  dispose(); window.dispatchEvent(new window.PageTransitionEvent('pagehide'));
  assert.equal(suspended, 1);
});

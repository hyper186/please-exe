import { analyze } from '../core/analyze';
import { DEFAULT_PREFERENCES, sanitizePreferences, type Preferences } from '../core/protocol';
import { findComposer, readDraft } from './adapters';
import { createPanel } from './panel';
import { bindPageLifecycle } from './lifecycle';
const stateWindow = window as Window & { __pleaseExeInstalled?: boolean };
if (!stateWindow.__pleaseExeInstalled) {
  stateWindow.__pleaseExeInstalled = true;
  let preferences: Preferences = DEFAULT_PREFERENCES;
  let composer: HTMLElement | null = null;
  let panel: ReturnType<typeof createPanel> | null = null;
  let detach: (() => void) | null = null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let scanTimer: ReturnType<typeof setTimeout> | undefined;
  let lastText = ''; let lastMode = ''; let composing = false; let stopped = false;
  const message = async (body: unknown) => {
    try { return await chrome.runtime.sendMessage(body); }
    catch { stop(); throw new Error('Extension updated. Reload this chat to reconnect Please.exe.'); }
  };
  function unmount() { detach?.(); detach = null; panel?.dispose(); panel = null; composer = null; lastText = ''; clearTimeout(timer); }
  function stop() { if (stopped) return; stopped = true; unmount(); observer.disconnect(); clearTimeout(scanTimer); scanTimer = undefined; chrome.runtime.onMessage.removeListener(onMessage); }
  function render() {
    if (!composer || !panel || composing) return;
    const text = readDraft(composer);
    if (text === lastText && preferences.mode === lastMode) return;
    lastText = text; lastMode = preferences.mode; panel.update(analyze(text, preferences.mode), text);
  }
  function changed() { panel?.invalidate(); clearTimeout(timer); if (!composing) timer = setTimeout(render, 160); }
  function scan() {
    if (stopped) return;
    if (preferences.pausedSites.includes(location.hostname)) { unmount(); return; }
    const found = findComposer(document, location.hostname);
    if (found === composer && panel?.host.isConnected) { render(); return; }
    unmount(); if (!found) return;
    composer = found;
    panel = createPanel({ doc: document, reviewInExtension: true,
      onCopy: text => navigator.clipboard.writeText(text),
      onSettings: () => { void message({ type: 'open-settings' }).catch(() => {}); },
      onPause: () => { void message({ type: 'pause' }).then(() => { preferences.pausedSites.push(location.hostname); unmount(); }).catch(() => {}); },
      endpoint: () => preferences.relayEndpoint,
      onCloud: async text => { if (!composer || readDraft(composer) !== text) throw new Error('Your draft changed. Review the new version before sending.'); const reply = await message({ type: 'prepare-review', text }); if (!reply.ok) throw new Error(reply.error); return null; },
    });
    found.insertAdjacentElement('afterend', panel.host);
    const startComposition = () => { composing = true; panel?.invalidate(); clearTimeout(timer); };
    const endComposition = () => { composing = false; changed(); };
    found.addEventListener('input', changed); found.addEventListener('compositionstart', startComposition); found.addEventListener('compositionend', endComposition);
    detach = () => { found.removeEventListener('input', changed); found.removeEventListener('compositionstart', startComposition); found.removeEventListener('compositionend', endComposition); composing = false; };
    lastMode = ''; render();
  }
  const observer = new MutationObserver(() => { if (!scanTimer) scanTimer = setTimeout(() => { scanTimer = undefined; scan(); }, 180); });
  async function load() { try { const reply = await message({ type: 'settings' }); if (reply.ok) { preferences = sanitizePreferences(reply.preferences); lastMode = ''; scan(); } } catch { /* stop() leaves the host composer untouched. */ } }
  function onMessage(m: { type?: string }) { if (m.type === 'preferences-changed') void load(); }
  chrome.runtime.onMessage.addListener(onMessage);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'aria-hidden', 'contenteditable'] });
  bindPageLifecycle(window, stop, () => { if (!stopped) return; stopped = false; chrome.runtime.onMessage.addListener(onMessage); observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['hidden', 'aria-hidden', 'contenteditable'] }); void load(); });
  void load();
}

import { createBroker } from './broker';
import { sanitizePreferences } from '../core/protocol';
// Restrict both stores before handling messages. Content scripts never get credential access.
const ready = Promise.all([
  chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
  chrome.storage.session.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' }),
]);
const broker = createBroker({
  id: chrome.runtime.id,
  loadPreferences: async () => sanitizePreferences((await chrome.storage.local.get('preferences')).preferences as Parameters<typeof sanitizePreferences>[0]),
  savePreferences: async preferences => { await chrome.storage.local.set({ preferences }); },
  loadCredential: async () => { const c = (await chrome.storage.session.get('relayCredential')).relayCredential as { endpoint?: unknown; token?: unknown } | undefined; return c && typeof c.endpoint === 'string' && typeof c.token === 'string' ? { endpoint: c.endpoint, token: c.token } : null; },
  saveCredential: async relayCredential => { if (relayCredential) await chrome.storage.session.set({ relayCredential }); else await chrome.storage.session.remove('relayCredential'); },
  hasPermission: async origin => chrome.permissions.contains({ origins: [origin] }),
  openSettings: async () => { await chrome.runtime.openOptionsPage(); void chrome.runtime.sendMessage({ type: 'review-ready' }).catch(() => {}); },
  fetcher: fetch,
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  ready.then(() => broker(message, sender)).then(sendResponse).catch(() => sendResponse({ ok: false, error: 'Please.exe needs a reload. Your draft has not been changed.' }));
  return true;
});
chrome.action.onClicked.addListener(() => { void chrome.runtime.openOptionsPage(); });
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.preferences) return;
  void chrome.tabs.query({ url: ['https://claude.ai/*', 'https://chatgpt.com/*'] }).then(tabs => {
    for (const tab of tabs) if (tab.id !== undefined) void chrome.tabs.sendMessage(tab.id, { type: 'preferences-changed' }).catch(() => {});
  });
});

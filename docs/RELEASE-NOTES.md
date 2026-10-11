## Please.exe 0.1.0 — early-access beta

A private tone coach for Claude and ChatGPT: traffic-light feedback, useful targeted edits, gentle humor and no mandatory compliment sandwiches.

- Local analysis with no account, telemetry or API key.
- Playful/plain settings, per-site pause, quoted/code-text handling.
- Interactive playground and a fixed-text share card that never includes your draft.
- Optional Jev classifier relay with server-side provider key, session-only browser credential, explicit snapshot review in extension-owned UI, request limits and safe failures.
- Source, tests, privacy/security documentation and CI included.

### Download and install

Download **please-exe-0.1.0.zip**, unzip it, open `chrome://extensions`, enable Developer mode and choose Load unpacked. Select the folder containing `manifest.json`, then reload Claude or ChatGPT. No Chrome Web Store listing has been published.

**please-exe-playground-0.1.0.zip** contains the standalone website, including the extension download. **SHA256SUMS.txt** verifies both archives.

### Beta boundaries

Local feedback is heuristic and English-first. Colors do not predict policy compliance or account safety. Authenticated live-site integration and real-key Jev validation remain acceptance checks. The optional relay is intended for local/private testing, not public multi-user hosting. See README, SECURITY.md and docs/JEV-SETUP.md.

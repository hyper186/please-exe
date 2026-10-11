# Please.exe — product brief

Initial scope: an installable Chrome beta, public source, security-focused defaults, and optional Jev classification.

## Experience
A private, lightweight Chrome extension for Claude and ChatGPT. Green / amber / coral meter beside the current composer, plain-language reasons, constructive suggestions and optional gentle humor. Direct criticism remains acceptable. Never block, send, or silently modify messages. Targeted suggested edits are copied after review; rich editors are not overwritten. English-first local rules state their limitations. Gray means empty, unsupported, uncertain, or too long. Users can pause by site and choose playful/plain feedback.

## Architecture
TypeScript shared rule engine, isolated Manifest V3 content script, closed shadow-root UI, extension settings and interactive standalone playground. No runtime third-party libraries, remote scripts, analytics, user accounts, or draft persistence. Build/test dependencies are pinned. Read the composer only; don't scrape history, cookies, network requests or credentials.

Optional Jev: explicit per-check disclosure and user action. Service worker validates the sender and fetches only the endpoint the user configured and granted permission to. Relay access token stays in trusted extension session storage; provider key stays in server environment. Node relay binds loopback by default, uses bearer authentication, origin allowlist, request/body/concurrency/rate budgets, timeout, strict response validation, no content logs, no upstream redirects. No public deployment or live Jev claims without a key and validation. Jev is a classifier, not a prose generator. Guidance is curated.

## Quality
Test classifications and exclusions, suggestion preservation, untrusted text rendering, stale results, lifecycle cleanup, input composition, adapter failures, server auth/origin checks, input limits, failure recovery and provider response contracts. Exercise the browser playground and extension-owned pages. Record limits on authenticated live-site testing. Package an installable ZIP, maintain documentation and CI. Publish only generated project code to GitHub, never parent project files or secrets.

## Release boundary
Usable local-first beta with Jev wiring ready for a server-side key. No store approval, broad human-rated accuracy claims, or production scalability claim. Gemini remains follow-up scope.

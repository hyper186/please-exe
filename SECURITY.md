# Security

## Reporting

Use this repository’s GitHub **Security → Report a vulnerability** feature for private reports when available. If unavailable, open an issue asking for a private contact without publishing exploit details, prompts or credentials. Rotate any exposed relay/provider key immediately. No security certification or bug-bounty program is implied.

## Protections in this beta

- MV3, bundled scripts, a restrictive extension script policy, no remotely loaded code, no runtime third-party dependencies.
- Exact supported-site/top-frame checks and sender validation; only the extension settings page can change credentials or initiate cloud classification.
- Cloud consent lives in an extension-owned tab. The host chat cannot hide/reposition its final confirmation UI. A chat can only request a short-lived local handoff.
- Draft snapshot bounds, revision checks, timeout/response-size limits and typed outputs; no raw upstream HTML/errors displayed.
- Untrusted text rendered with textContent. Curated replacements preserve unmatched text; protected spans cannot bridge regex matches.
- Relay provider key stays server-side; a separate endpoint-bound browser token stays in trusted session storage. Destination changes invalidate it; redirects are rejected.
- Loopback binding by default, exact extension-origin allowlist, constant-time token comparison, bounded requests/concurrency, daily and minute budgets, no content logs.
- Tests cover forged senders, repeated review consumption, injection text, prompt/code preservation and network failure conditions.

## Boundaries

The optional relay is for local use or a small private beta. Its global counters live in process memory and reset on restart. They are not durable billing caps. Origin headers are not authentication: non-browser clients can forge them, so the bearer token is essential. A leaked shared token can consume the shared budget.

Before offering a public multi-user service: add per-user authentication and quotas, persistent rate/cost accounting, provider-side spend controls, operational monitoring without prompt logging, HTTPS and deployment hardening. Do not expose the loopback relay publicly by simply binding all interfaces.

A compromised browser, malicious installed extension, local machine, provider, relay operator or chat website is outside the protection boundary. A host website can alter the composer and surrounding UI; users should review the exact snapshot in the extension tab. Local tone labels are estimates, not security or policy decisions.

The private review snapshot expires after two minutes. MV3 worker suspension can clear it earlier; reopen the review if necessary. Session-only credentials must be reconnected after browser restart. Settings and consent have no extension network access until an exact origin is granted.

## Verification status

Automated regression tests, static checks, dependency audit, package inspection and an independent code review were performed for the initial beta. The review identified consent placement, protected-text matching, stale results and Back navigation lifecycle issues, which were addressed. This is not a professional security audit.

No live Jev call was made without an API key. Authenticated Claude/ChatGPT extension behavior and Chrome Web Store acceptance remain release-expansion gates. See [testing](docs/TESTING.md).

# Contributing

Small, explainable improvements are welcome. Run `npm ci` and `npm run verify` before submitting a change. Include a focused regression test when fixing classification, preservation, lifecycle or security behavior. Please avoid tests that merely duplicate implementation details.

For a tone rule, include examples that should trigger and nearby examples that should not (quotes, technical language, criticism, dialect, etc.). Preserve user intent and every unmatched character in suggested edits. Never add mandatory politeness, shame users, auto-send messages or silently modify a draft.

For site adapters, use explicit composer selectors and fail closed when ambiguous. Do not scrape history. Keep production code bundled and local. New permissions, network destinations, retention, telemetry or provider changes need explicit design and privacy documentation.

Use synthetic examples in public issues and pull requests. No real private chats or keys. Report exploitable vulnerabilities privately as described in SECURITY.md.

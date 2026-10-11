# Build record

- Decision: copy reviewed suggestions instead of directly replacing rich-editor content. This avoids draft/formatting loss and framework-state corruption; costs one paste action.
- Decision: Jev is explicit per-check, not continuous cloud analysis. This reduces accidental disclosure and service costs.
- Pre-flight: engine result shared by panel and playground; worker/relay use a bounded typed verdict; session-only relay token never returned to content scripts.

- Independent review fixes: extension-owned cloud consent; protected-span sentinel matching; before/after snapshot checks; cached-page lifecycle restoration.
- Final scope: local-first beta; real-key Jev and signed-in host acceptance remain documented follow-up gates.

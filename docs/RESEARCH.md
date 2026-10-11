# Product research and decisions

Research informed the brief; sources and third-party products may change.

- [OurFamilyWizard ToneMeter](https://www.ourfamilywizard.com/product-features/tonemeter) demonstrates feedback at the moment of writing. Please.exe adopts the general traffic-light idea with original branding, visual design and copy. It is not affiliated with or a clone of OFW.
- [Grammarly tone detector](https://www.grammarly.com/tone) is another example of helping writers notice how wording may land. Please.exe deliberately limits its scope to an LLM composer and keeps the core local.
- [Anthropic's 2026 policy announcement](https://www.anthropic.com/news/2026-usage-policy-update) distinguishes sustained, needless abuse from ordinary frustration and pushback. Its announced update takes effect November 12, 2026. Conversation-ending is not the same as an account ban. The product never predicts enforcement.
- [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) and [permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) support a narrowly scoped MV3 extension with optional access to the user's relay.
- [Chrome user-data policy](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq) informs the explicit data disclosure, minimum access and privacy documentation. Store compliance still requires actual submission and review.
- [TypeSafe API documentation](https://docs.typesafe.ai/api.md) describes Jev as a structured decision model. The adapter pins `jev-1.13.0`, requests typed choices, validates probabilities and maps reasons to curated text. A real provider key is needed to finish live validation.

A basic word blacklist is too blunt: “kill the process,” quoted insults and useful criticism should not trigger the same response as a directed insult. This beta uses contextual local patterns and protects common quoted/code regions, with an explicit uncertainty state. It does not claim to understand every context.

Cloud-on-every-keystroke was rejected because it creates unnecessary privacy exposure, network delay and cost. Optional Jev checks require a draft preview and an explicit action in extension-owned UI. Copy-and-review suggestions preserve the user's control and avoid corrupting rich-text editors.

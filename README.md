# Please.exe

**Less heat. Better prompts.** A tiny, private tone coach for Claude and ChatGPT—with just enough personality to suggest that your keyboard take a minute.

[Try the playground](https://hyper186.github.io/please-exe/) · [Download the beta](https://github.com/hyper186/please-exe/releases/tag/v0.1.0-beta.1) · [Privacy](PRIVACY.md) · [Optional Jev setup](docs/JEV-SETUP.md)

## What it does

- Adds a green, amber or red tone meter beside your current message. Gray means not rated.
- Explains potentially harsh phrasing and offers a targeted edit to review and copy.
- Keeps direct criticism green: “That is incorrect. Check the calculation.”
- Skips common quotes and code, with English-first rules and clear limitations.
- Offers playful or plain feedback, plus per-site pause controls.
- Provides an optional, explicitly confirmed Jev second opinion in a separate extension tab.

It never presses Send, blocks a message, silently rewrites a draft, reads chat history, or requires “please.” No account, telemetry, ads, remote scripts or runtime third-party dependencies. No API key is needed for local mode.

## Install the beta

1. Download `please-exe-0.1.0.zip` from [Releases](https://github.com/hyper186/please-exe/releases).
2. Unzip it into a folder you will keep.
3. In desktop Chrome 116+, open `chrome://extensions`, enable **Developer mode**, then choose **Load unpacked**.
4. Select the folder containing `manifest.json` and reload Claude or ChatGPT.
5. Type in the message composer. Click the meter for feedback; click the extension icon for settings and practice prompts.

This is an early-access beta, not a Chrome Web Store listing. Claude is the primary integration; ChatGPT is included. Authenticated live-site installation still needs manual acceptance testing. Website changes can break composer detection; Please.exe then leaves the chat alone. Gemini is planned.

Updating: unzip the new release, load its folder (or replace the existing folder), click Reload in Chrome’s extension manager, then reload your chat. Unpacked extensions do not update automatically.

## Jev: an optional second opinion

[Jev](https://docs.typesafe.ai/api.md) classifies tone; it does **not** generate prose. We use a typed verdict and curated explanations. A small Node relay keeps the provider key off the browser. Your own separate relay token is stored only for the browser session.

A check from a chat opens an extension-owned review screen with an exact draft snapshot and the destination. Nothing is sent until you confirm there. [Set up the relay](docs/JEV-SETUP.md). No live provider request has been tested without a supplied key; the contract, validation and failure behavior are tested with fixtures.

## Build and run

Requires Node 22+ and npm.

```sh
npm ci
npm run verify
npm run package
npm run preview
```

Open `http://127.0.0.1:4173` for the playground. Load `dist/extension` as an unpacked Chrome extension. Packaged extension and playground ZIPs plus SHA-256 checksums appear in `artifacts/`.

```sh
npm test        # behavior, safety boundaries, adapters and relay tests
npm run check  # TypeScript checks
npm run relay  # after following docs/JEV-SETUP.md
```

## Why the joke exists

It’s fun to give your very expensive autocomplete a tiny workplace etiquette department. It’s useful to replace “You never listen” with a specific missed requirement.

This is **tone feedback, not an account-ban detector**. A green bar promises neither correct interpretation nor policy compliance. Ordinary frustration, blunt feedback and fictional dialogue need context. See the [research notes](docs/RESEARCH.md).

## Architecture and limits

The local rule engine is shared between the extension and the live playground. The MV3 content script reads only the current composer, with site-specific adapters and an isolated UI. The service worker validates senders and handles optional authenticated relay requests. Jev access is manual, bounded and rate-limited.

No local ruleset can reliably infer intent, sarcasm, all dialects or all languages. Quotation/code handling is heuristic. These tests are regression coverage, not a human-rated accuracy benchmark. The private relay uses in-memory, single-process budgets; do not deploy it as a public multi-user service without additional controls.

See [security](SECURITY.md), [privacy](PRIVACY.md), [test coverage and release checks](docs/TESTING.md), and the [launch plan](docs/LAUNCH.md). MIT licensed. Independent; not affiliated with Anthropic, OpenAI, OurFamilyWizard or TypeSafe AI.

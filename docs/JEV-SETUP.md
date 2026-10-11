# Optional Jev setup

Local tone feedback works immediately with no API key. Jev adds contextual classification, not a generated rewrite. This release is wired against [TypeSafe’s API documentation](https://docs.typesafe.ai/api.md), using the pinned `jev-1.13.0` model. A real-key check is still required before claiming live provider compatibility.

## 1. Build and install

Install Node 22+, clone the repository, then run:

```sh
npm ci
npm run build
```

Load `dist/extension` in Chrome via `chrome://extensions` → Developer mode → Load unpacked. Click its toolbar icon to open Settings. Copy the exact extension origin displayed there. The ID can change when you use a different unpacked location.

## 2. Prepare the local relay

```sh
cp .env.example .env
chmod 600 .env
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Edit `.env` locally:

- `JEV_API_KEY`: your TypeSafe/Jev API key. Never put it in extension settings, source code, GitHub issues, screenshots or chat.
- `PLEASE_RELAY_TOKEN`: the new random token printed above. This is a different credential, used only between your browser and relay.
- `PLEASE_ALLOWED_ORIGINS`: the exact `chrome-extension://...` origin from Settings. Comma-separated exact origins are supported for a small private test.

Keep the default loopback address and conservative limits. Then:

```sh
npm run relay
```

If you leave the provider key empty, the authenticated endpoint safely returns a setup-needed response; it makes no provider request.

## 3. Connect and test

In extension Settings:

1. Enter `http://127.0.0.1:3210` as the relay address.
2. Enter the separate relay access token, acknowledge the disclosure, and click **Connect relay**. Approve access to that exact origin.
3. Click **Send sample to Jev**. Only the displayed fixed sample is transmitted.
4. Confirm a structured tone verdict, model identifier, latency and input-token count appear. An unavailable/key-needed message is not a successful provider test.
5. In a Claude or ChatGPT draft, click **Review with Jev**. A new extension page shows the exact snapshot and destination. Click **Send this snapshot to Jev** only after reviewing it. The snapshot expires after two minutes and is consumed once.

Jev returns a second opinion; it doesn't change your draft. The local meter remains independent. Tokens expire with your Chrome session; reconnect after restarting Chrome. Disconnect revokes the selected optional host permission and clears credentials.

## Costs and limits

[TypeSafe’s launch article](https://typesafe.ai/blog/introducing-system-one-models-and-jev?render=full) listed Jev input at **$0.042 per million input tokens**, with output tokens free. Pricing can change; check the provider before funding usage. For illustration, 1,000 checks at 1,000 billed input tokens each would cost about $0.042 for model input, excluding hosting and any other fees. Actual inputs include instructions and choices, not just your draft.

This relay defaults to 20 calls per minute, 200 per day and three concurrent requests, with an 8-second upstream timeout. Counters reset on process restart and apply to a single process; they do not replace a provider-side spending limit. Never embed a shared paid key into the downloadable extension.

## Troubleshooting

- **Connect your relay:** token missing, expired browser session, or endpoint changed.
- **Invalid token:** replace the browser token with the value in `.env`; do not use the Jev key.
- **Allow this extension’s ID:** copy the installed ID again and restart the relay.
- **API key needed:** set `JEV_API_KEY` on the server, then restart it.
- **Could not reach Jev:** check relay process, exact origin permission and provider availability. Server logs intentionally omit prompts and provider response bodies.
- **Expired review:** reopen it from the chat. Browser worker suspension may clear pending snapshots early.

For a remote private relay, use HTTPS and an appropriately secured host. Review [SECURITY.md](../SECURITY.md) before deployment. Public multi-user hosting is deliberately outside this beta’s operational design.

# Privacy

Effective October 11, 2026 · beta 0.1.0

## Local mode

Please.exe reads the text in the current composer on `claude.ai` and `chatgpt.com`. Tone checks run in the browser. It does not read chat history, cookies, account data or network traffic. It does not send drafts to us and has no analytics, ads or tracking identifiers.

Preferences (feedback style, paused sites and relay address) stay in Chrome’s local extension storage, not sync storage. Drafts are not written to persistent storage. Copying a suggestion uses your clipboard only when requested. Share cards contain a fixed joke, never your draft. The separate playground does not transmit what you type.

## Optional Jev checks

Jev is off until you configure a relay. A chat review temporarily holds a draft snapshot in extension-worker memory for up to two minutes, until consumed, cancelled, replaced, or the worker stops. The review tab displays that snapshot; closing the tab removes its page memory. The snapshot may differ from a subsequently edited chat draft.

Only an explicit confirmation inside the extension-owned page sends text. The approved draft goes to your configured relay, then to TypeSafe AI’s Jev endpoint. The request contains the draft, task instructions and classifier choices; not chat history or your account identity. The relay and provider may observe ordinary request metadata, including IP addresses. Their policies apply. We do not operate a shared relay in this release.

The bundled relay does not log prompts, responses or credentials. A hosting provider, proxy, monitoring integration, or independently modified relay could log them. Do not assume a third-party relay is private. Confirm the destination and avoid sending confidential data without permission. Consult [TypeSafe](https://typesafe.ai/) for its current terms and data-handling practices; this project does not promise provider retention behavior.

The Jev provider key belongs only in your server environment. The browser holds a different relay access token in trusted extension session storage, cleared when the browser session ends or when you disconnect. The token is not returned to website content scripts. Changing destinations clears it. The credential is a bearer secret: anyone possessing it can use the relay within its limits.

## Permissions

- `storage`: local preferences and trusted, session-only relay credentials.
- Content scripts: only Claude and ChatGPT, only in the top frame.
- Optional HTTPS host access: requested only for the exact relay origin you configure. The manifest must declare the broader possible HTTPS range so a user can choose their own relay. Broad access is not granted by default.
- Optional loopback HTTP access: for `http://127.0.0.1:3210` local testing.

There is no cookies, browsing history, debugger, web-request interception or general clipboard-read permission. Clipboard writes occur on user action.

## Remove your data

Disconnect in Settings to remove the relay token/address and revoke the selected origin permission. Uninstall to remove extension preferences. Close the review/playground tab to clear its text. Delete your local `.env` to remove relay secrets. If text was sent to a third-party relay/provider, any deletion request must be directed to that operator.

GitHub hosts the source, releases and public playground, and handles visits under [GitHub’s privacy policy](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement). Please.exe adds no visitor analytics. Public issue reports are public: never include private drafts or credentials.

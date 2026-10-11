# Testing and release status

## Automated checks

`npm run verify` runs TypeScript, the regression suite, and production builds. The suite covers local tone cases, quote/code exclusions, exact preservation of unmatched draft text, neutral/direct examples, safe untrusted rendering, site-specific composer fixtures, hidden/ambiguous editors, trusted sender boundaries, credentials, one-use Jev handoffs, stale draft responses, browser Back restoration, typed provider responses, origins/authentication, size limits, concurrency/rate limits and failures.

Tests use synthetic drafts and mocked provider responses. They do not establish tone accuracy across populations or prove live model behavior. DOM fixtures are not a substitute for signed-in site testing. Happy DOM cannot simulate genuine trusted browser clicks; final cloud consent also requires a manual installed-extension test.

## Browser checks

The standalone playground is exercised in a real browser: direct, sharp, harsh and quoted sample states; expanded explanations and suggestions; settings preview; no-network fallback; responsive layout; console errors. Local HTTP relay smoke checks confirm the built server's rejection/setup behavior without an API key.

## Remaining acceptance gates

- Install the beta on authenticated Claude and ChatGPT and exercise their current editors. Claude login is required and wasn't available in the test browser.
- Confirm optional host permission prompts, trusted extension review consent and session-token restart behavior in a regular Chrome profile.
- Supply a Jev key locally, run the fixed sample and review a synthetic chat snapshot. No live provider result is claimed before this succeeds.
- Test screen readers, macOS/Windows keyboard flows, dark mode and site variations with beta users.
- Complete Chrome Web Store review before claiming marketplace availability.

## Release checks

Run `npm ci`, `npm run verify`, `npm audit --audit-level=high`, and `npm run package`. Inspect ZIP integrity and entries; extension archives must contain no server bundle, `.env`, source maps, credentials or test data. Verify SHA-256 checksums. Review the staged source before publishing. Never package the parent workspace or synced project references.

CI repeats static checks, tests, builds, dependency audit and ZIP validation on pushes and pull requests. Site integration checks should be repeated after host UI changes. Unpacked installations update manually.

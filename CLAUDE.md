# Claude instructions for the `sds` repo

This repo is the deploy target (`gh-pages`) for `sartinezmelgarejo-eng/sds`. The live site is at https://sartinezmelgarejo-eng.github.io/sds/.

Two ways Claude works on this repo:

## 1. Translations pipeline (most common in cloud sandbox / claude.ai/code)

If Samuel sends `translate: <url>` or `traduce: <url>` (or pastes a Spanish article body asking for translation), follow the protocol in [`inbox/TRANSLATIONS_PROTOCOL.md`](inbox/TRANSLATIONS_PROTOCOL.md). For Gutenberg/Kadence block markup specifics, consult [`inbox/WP_BLOCKS_REFERENCE.md`](inbox/WP_BLOCKS_REFERENCE.md). The protocol covers the full flow: fetch, image download + WP Media Library upload, featured-image dual-size, translation, `article.html` + `meta.json` + manifest update, git push.

### Credentials in this sandbox

The protocol's step 5a says to read `htmls/inbox/.wp-creds.json` first. **In the cloud sandbox that file does NOT exist** — it lives only on Samuel's Mac. In the sandbox, fall back to **environment variables** (set in claude.ai/code Project Settings):

- `WP_SITE` — `https://mexicosolidarity.com`
- `WP_USERNAME` — WP username
- `WP_APP_PASSWORD` — WP application password (NOT the regular login password)

If any of these is missing, ABORT the upload step, tell Samuel which env var is missing, and don't leave placeholder URLs in `article.html`.

### Cloudflare-protected outlets

The Mac has a local Playwright fetcher (`fetch_browser.py`) that the sandbox doesn't. If `WebFetch` returns 403 / "Just a moment..." for an outlet (La Jornada often does this), tell Samuel and ask him to paste the article body directly. Don't try to install Playwright unless he explicitly asks — the install adds significant time to the session.

### Posting the result card

The Mac bot posts a 5-line card to a Telegram topic after pushing. In the sandbox you can't post to Telegram (no bot token). Instead, **reply in the chat** with the same card content + the link to `https://sartinezmelgarejo-eng.github.io/sds/translations/viewer.html?slug=<slug>`. Samuel opens it from there.

## 2. Direct edits to deployed files

If Samuel asks for changes to anything else in this repo (e.g. `guitar-multichord.html`, `index.html`, `translations/viewer.html`), edit directly, validate (extract `<script>` blocks → `node`/`jsc` parse for HTML files), commit, push to `gh-pages`. No special protocol needed.

## What's NOT in this repo

- The Telegram inbox bot (`inbox-v2.py`) — lives at `~/scripts/inbox/` on Samuel's Mac, doesn't deploy.
- `.wp-creds.json` — local on the Mac, never committed.
- The full `htmls/` source folder — that's in Google Drive on the Mac; only build artifacts land here.

So if Samuel mentions "the bot" or "fetch_browser.py" he's referring to Mac-only files. You can read the protocol files to understand them but can't modify them from this sandbox.

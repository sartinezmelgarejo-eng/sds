# AGENTS.md — operating manual for AI coding agents

Auto-loaded by opencode, Claude Code, Cursor, Codex. Distilled from `LEEME.html` for daily operations. When in doubt about historical context, read `LEEME.html` (this file is the rulebook, that one is the reference).

Owner: Samuel Martínez. Language for replies: Spanish unless user writes in English.

---

## 1. Project map

This folder is part of a sync'd Google Drive volume at `/Users/samuelmartinez/Library/CloudStorage/GoogleDrive-sartinezmelgarejo@gmail.com/Other computers/My Mac/htmls/` that deploys to GitHub Pages (`sartinezmelgarejo-eng/sds`, branch `gh-pages`, served from `sartinezmelgarejo-eng.github.io/sds/`).

```
htmls/                          ← this folder
├── index.html                  ← launcher + Telegram feed
├── monitoring.html             ← Sala de Situación dashboard (React + Recharts)
├── BUSCADOR-MANANERAS.html     ← search over Mañaneras conferences
├── libreria.html               ← interactive library + Atlas (232 books, 49 conceptos)
├── guitar-multichord.html      ← Music 3.0 lab (source of truth — deploys to guitar.html)
├── guitar.html                 ← stable build
├── sacred-texts.html
├── Iglesia-contra-Mexico.html
├── schedules.html
├── LEEME.html                  ← full reference (855 lines, historical context)
├── AGENTS.md                   ← this file (operating rules)
├── feed.json                   ← translations index
├── tg-feed.json + sends.ndjson ← Telegram feed canonical log
├── translations/               ← EN translations for mexicosolidarity.com
│   ├── index.html, viewer.html, manifest.json
│   └── <slug>/                 ← per-article folder
├── inbox/                      ← Telegram bot config (creds, protocols)
├── decks/                      ← NotebookLM slide JPGs (one folder per bookId)
│   └── registry.json           ← bookId → {notebook_id, title}
├── pwa/                        ← service worker + manifests + icons
└── backups/                    ← max 4 per file

Books/                          ← PDFs/EPUBs (215+ files, in author subfolders or root)
```

External pieces:
- `~/scripts/notebooklm/` — slide pipeline (deploy-new-decks.sh, process-queue.sh, retry-pending-decks.sh)
- `~/scripts/inbox/` — Telegram bot scripts (fetch_browser.py, treat_featured.py, resize_social.py)
- `~/.claude/scheduled-tasks/` — launchd-fired skills (dailyt, scant, onmexico, monitoring jobs)
- `~/Library/LaunchAgents/com.resisres.*.plist` + `com.user.notebooklm-retry.plist` — schedules
- `/tmp/sds/` — local clone of gh-pages branch (deploy staging)

---

## 2. Hard rules

These come from the LEEME and reinforced feedback. Break any of them and the user notices.

1. **No invented data.** Quotes, page numbers, dates, statistics — all must be verifiable in the actual source. If you can't verify, say so explicitly instead of guessing.
2. **Validate JS before deploy.** Single-file HTMLs (libreria, guitar, index) keep all JS in one `<script>` block. After edits run:
   ```bash
   /usr/local/bin/python3 -c "import re; src=open('FILE').read(); m=re.findall(r'<script>(.*?)</script>',src,re.DOTALL); open('/tmp/lib.js','w').write('\n'.join(m))"
   /System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc -e "try{new Function(read('/tmp/lib.js'));print('PARSE OK')}catch(e){print('PARSE ERROR: '+e)}"
   ```
   Must print `PARSE OK`. If `PARSE ERROR`, do NOT push.
3. **Backup before destructive edits.** `cp file backups/file.pre-<change>-YYYYMMDD.html`. Cap at 4 per file (delete oldest).
4. **Never rename or move files in `Books/`.** Library entries reference them via `filePath` — paths break links.
5. **Two book ID formats coexist**: bare IDs (`marxcapital`) and indexed (`marxcapital1`, `marxcapital2`). Preserve whatever's there; don't normalize.
6. **`QUOTE_PAGES` only with verified pages.** Search the quote verbatim in the PDF with PyMuPDF first. Front-matter offsets vary by book (-14 to +6). Never guess.
7. **No em-dashes (—) in prose.** Use commas, periods, parentheses, semicolons. Em-dashes are reserved for quoted material (which is preserved verbatim). En-dashes (–) same rule.
8. **No emojis in concept content.** Atlas + libreria visual elements use SVG glyphs or typographic ornaments, not emoji. Emojis OK in casual user-facing chat text only.
9. **No meta-links in book prose** that send the reader somewhere unrelated. A link's visible text must match the link target. Cross-refs belong in `conexiones[]` cards with explicit `razon`.
10. **No fake URLs / placeholders.** If you don't have a real source URL, omit the field. Don't write `[outlet]` or `https://example.com`.

---

## 3. Deploy protocol

The flow Google Drive → `/tmp/sds` → `git push gh-pages` has a known failure mode: Google Drive locks files mid-sync and `cp` fails with "Operation not permitted."

### The cp-rescue pattern (lessons learned the hard way)

Plain `cp` fails ~10% of deploys when Drive is syncing. The fix that's now in `deploy-new-decks.sh`:

```bash
retry_cp() {
  local src="$1" dst="$2"
  local tmp=$(mktemp "/tmp/deploy-cp.XXXXXX") || return 1
  for attempt in 1 2 3 4 5 6 7 8 9 10 11 12; do
    if cat "$src" > "$tmp" 2>/dev/null && [ -s "$tmp" ]; then
      mv "$tmp" "$dst" 2>/dev/null && return 0
    fi
    echo "  cp attempt $attempt failed for $src — sleeping 60s"
    sleep 60
  done
  rm -f "$tmp"
  return 1
}
```

Two reasons it works: (a) `cat` streams instead of `cp`, bypassing the FUSE-level file lock semantics; (b) 12×60s = 12 min budget covers a full Drive sync window (was 5×30s = 2.5 min, which kept losing batches).

**If a deploy script failed with cp errors and you find orphan deck/registry/libreria updates locally but not in gh-pages, the rescue is manual**:
```bash
SRC="/Users/samuelmartinez/Library/CloudStorage/GoogleDrive-sartinezmelgarejo@gmail.com/Other computers/My Mac/htmls"
DST="/tmp/sds"
cp "$SRC/libreria.html" "$DST/libreria.html"
cp "$SRC/decks/registry.json" "$DST/decks/registry.json"
for bid in <list-from-log>; do
  mkdir -p "$DST/decks/$bid"
  cp "$SRC/decks/$bid/"slide-*.jpg "$DST/decks/$bid/"
done
cd "$DST" && git add libreria.html decks/registry.json decks/<bid> ...
git commit -m "libreria: deploy missing decks (cp-failure rescue)" && git push
```

### Pre-push guard

A pre-push hook on `/tmp/sds` blocks destructive pushes to `gh-pages` (deletions). Override only with explicit user permission via `ALLOW_DELETIONS=1 git push`. Hook installer: `~/scripts/sds-hooks/install.sh`.

### Xcode license workaround

If `/usr/bin/git` errors with the Xcode license prompt, use `/Library/Developer/CommandLineTools/usr/bin/git` instead — no sudo needed.

---

## 4. Adding a new book to `libreria.html` — complete protocol

This is the single most asked-about workflow. End-to-end checklist:

### 4.1 PDF placement
- Drop the PDF into `/Users/samuelmartinez/Library/Mobile Documents/com~apple~CloudDocs/Documents/Books/` (or a subfolder by author, if author has multiple works).
- **Do not rename.** Preserve the original filename exactly — including curly apostrophes (`'` U+2019 vs straight `'` U+0027). The browser will not find the file if you normalize the apostrophe.
- The `BOOKS_BASE_PATH` is configurable per-machine via localStorage in libreria.html (default: `/Users/samuelmartinez/Library/Mobile Documents/com~apple~CloudDocs/Documents/Books`).

### 4.2 Curation (the content)

Run a subagent that **reads the actual PDF** (not from memory). The subagent fills these fields:

| Field | Required | What |
|---|---|---|
| `id` | yes | bare ID like `marxcapital`, or indexed `marxcapital1` if multi-volume |
| `estante` | yes | one of the 6 shelves (see existing `estantes` array in libreria.html) |
| `coverId` | yes | same as `id` typically (used to map to cover image) |
| `filePath` | yes | exact relative path from Books/ root (e.g. `"Marx/El-Capital-Vol1.pdf"`) |
| `coverUrl` | yes | URL to cover image — **verify it's the right book!** see 4.4 |
| `title` | yes | exact title from cover |
| `author` | yes | "Apellido, Nombre" or "Nombre Apellido" — match the convention of existing entries by same author |
| `year` | yes | publication year (number, not string) |
| `desc` | yes | 1-2 sentence summary, editorial voice |
| `tesis` | yes | 5-8 sentences — the book's central argument, in the author's framing |
| `ideas` | yes | array of 5-8 strings, each a specific claim from the book (NOT generic) |
| `contexto` | yes | when/where written, why it matters at that moment |
| `porqueLeer` | yes | 2-3 sentences answering "why should I read this NOW" |
| `tags` | yes | array of tags from the existing taxonomy (search `tags:` in libreria.html for vocab) |
| `quotes` | yes | array of 3+ objects: `{text: "VERBATIM", page: "p. 42"}`. Quotes are sacred — copy character-for-character |
| `conexiones` | recommended | see 4.5 |
| `alerta` | optional | 1-line warning if the book has caveats (translation flaws, ideological context, etc.) |

The curation output should be a JSON file at `/tmp/curated/<bookId>.json` so the next steps can read it programmatically.

### 4.3 Verify quote pages with PyMuPDF

Generic page numbers (printed page in the book) vs actual PDF page rarely match — front matter, index, prefaces add offsets of -14 to +6. Verify each quote:

```python
import fitz, json, re
doc = fitz.open(pdf_path)
for i, page in enumerate(doc, start=1):
    text = page.get_text()
    if quote_substring in text:
        print(f"quote → PDF page {i}")
```

Save verified PDF pages to `QUOTE_PAGES` dict (top of libreria.html JS block) with key `"<bookId>::<quoteIndex>"`. The `getQuotePageLink()` helper uses this map + the `PDF_PAGE_OFFSET` table to build `#page=X` deep links.

### 4.4 Cover image — VERIFY IT'S THE RIGHT BOOK

Lesson learned (2026-06-25): `tutino2` had a cover URL pointing to a John Gwynne fantasy novel ("El Hambre de los Dioses") for weeks. The bot grabbed the wrong Amazon image. **Always view the image you pick before committing.**

Where to look (in this preference order):
1. Publisher's site (University of Texas Press, FCE, Siglo XXI, etc.) — most reliable
2. BiblioVault (`bibliovault.org`) — clean covers, accessible URLs
3. Google Books — `books.google.com/books?id=...` has a thumbnail endpoint
4. Amazon — last resort, ASINs can collide between editions

Pre-flight: download the image you picked, open it visually, verify it shows the right title + author. Five seconds saves weeks of embarrassment.

```bash
curl -sL -o /tmp/check-cover.jpg "<URL>" && open /tmp/check-cover.jpg
```

Store the URL in `coverUrl`. The `getCoverHTML()` helper handles fallback to placeholder if the URL 404s.

### 4.5 Connections (`conexiones[]`)

Each entry: `{bookId: "other-id", razon: "..."}`. The `razon` says **why** this book talks to that one — contrapunto, continuation, refutation, applies-the-theory, etc. Concrete examples (not "interesante read"):

```js
conexiones: [
  { bookId: "marxcapital", razon: "Marx teorizó la acumulación originaria; Galeano la narra con nombres y lugares concretos." },
  { bookId: "wallerstein1", razon: "Wallerstein da el marco macro; este libro hace el micro de la misma dinámica." }
]
```

Bidirectional is nice but not required — if Book A has conexión to Book B with razón X, Book B's conexión back to A can have razón Y (different angle).

### 4.6 Atlas concept references (`ref-concept` links)

When the book's `tesis`, `desc`, `contexto`, or `porqueLeer` mentions a concept that exists in the Atlas (`conceptos[]` array), wrap that mention in a `ref-concept` link. Pattern:

```html
<a class='ref-concept' onclick='event.stopPropagation(); showView("conceptos"); setTimeout(function(){openConcepto("sistema_mundo");},80);'>sistema-mundo</a>
```

Visible text must be the EXACT name of the concept (case-insensitive match OK, but no creative paraphrasing). Don't link generic words like "capitalism" if the concept is `capitalismo_industrial` — the reader expects the link to land on that exact node.

**Don't link more than 1-2 concept refs per paragraph.** Visual clutter; user explicitly asked for this restraint (`feedback_no_meta_links`).

### 4.7 Atlas timeline citas

If your book has a quote that directly comments on a historical event already in an Atlas concept's `timeline[]`, add it as a cita on that event:

```js
// Inside the concepto's timeline array, on a specific event:
{ year: '1521', text: 'Cae Tenochtitlan', citas: [
    { autor: 'Bernal Díaz', texto: 'verbatim quote...', libro: 'diazcastillo', pagina: 'p. 412' }
  ]
}
```

The page must be verifiable; `pagina` field uses the format `"p. 412"` (the `getQuotePageLink` helper extracts the number and applies `PDF_PAGE_OFFSET[libroId]` to get the PDF page).

### 4.8 Inject into `books[]`

Find the `const books = [` declaration (~line 4500+ in libreria.html). Add your entry. **Add a trailing comma** to the previous entry (which previously was the array's last and didn't need one).

```bash
# Then validate JS — must print PARSE OK
/usr/local/bin/python3 -c "import re; src=open('libreria.html').read(); m=re.findall(r'<script>(.*?)</script>',src,re.DOTALL); open('/tmp/lib.js','w').write('\n'.join(m))"
/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc -e "try{new Function(read('/tmp/lib.js'));print('PARSE OK')}catch(e){print('PARSE ERROR: '+e)}"
```

### 4.9 Queue the slide generation

NotebookLM slides are generated by an automated pipeline (launchd job `com.user.notebooklm-retry` fires 6×/day). To add the book to its queue, edit `/tmp/process-queue.json`:

```json
{
  "bookId": "yourbookid",
  "filePath": "Author/File-Name.pdf",
  "title": "Public-facing Title",
  "lang": "es",
  "existing_notebook": null
}
```

**`lang` is critical** — drives `notebooklm generate slide-deck --language es` vs `en`. If the book is in Spanish, set `es`. Wrong `lang` = slides come out in wrong language and have to be regenerated.

Append at the end of the array. The pipeline picks pairs from the front each fire, so older entries process first.

### 4.10 Deploy

```bash
SRC="/Users/samuelmartinez/Library/CloudStorage/GoogleDrive-sartinezmelgarejo@gmail.com/Other computers/My Mac/htmls"
DST="/tmp/sds"
cp "$SRC/libreria.html" "$DST/libreria.html"
cd "$DST"
git add libreria.html
git commit -m "libreria: add <bookId> — <Title>"
git push origin gh-pages
```

Slides will deploy themselves once generated (the launchd-fired `deploy-new-decks.sh` injects the `deck:` field automatically).

---

## 5. NotebookLM slide pipeline

State as of 2026-06-26: **87 / 232 decks done, 145 remaining.**

Pipeline overview:
- Launchd job `com.user.notebooklm-retry.plist` fires 6×/day (01:17, 07:11, 11:13, 15:23, 19:29, 22:37)
- Wrapper: `~/scripts/notebooklm/retry-pending-decks.wrapper.sh`
- Worker: `~/scripts/notebooklm/process-queue.sh` — processes pairs in parallel, stops on Google rate-limit, 7-min cool-down between pairs
- Deployer: `~/scripts/notebooklm/deploy-new-decks.sh` — injects `deck:` field into libreria.html for completed gens, cp+commit+push
- Logs: `~/scripts/notebooklm/last-run.log` and `deploy.log`

To fire manually (e.g. after lang fix in queue):
```bash
launchctl start com.user.notebooklm-retry
```

Google's quota is **rolling 24h** — bursts get rate-limited fast. Patience required. A typical day = 1-2 fires actually produce decks, the rest get throttled.

If you see `cp permanently failed` in `deploy.log` after a successful generation round, you need to run the manual rescue (see §3).

---

## 6. Atlas concept detail design system

The Atlas detail view (clicking a concept card in libreria.html → Atlas tab) was redesigned 2026-06-25 with these elements:

- **Per-concept color combo** — `--accent` from `c.group` (8 groups: América/Eurasia/Ideas/México/Recursos/Sistemas/África/Global), `--accent-2` from `c.modo` (comunal/imperial/colonial/socialista/soberanista). ~40 unique combos.
- **Per-era background tint** — auto-detected from `c.periodo` or first timeline event year. Prehispánica (sepia), colonial (vellum), decimonónica (gold), contemporánea (cool blue/green).
- **SVG glyph badge** — one of 8 line-art glyphs per group (pyramid for América, concentric circles for Eurasia, spiral for Ideas, sun for México, diamond for Recursos, nodes for Sistemas, crescent for África, globe for Global).
- **Layout dispatcher** — `pickConceptLayout(c)`. If `timeline.length >= 4`, layout is `cronologico` (timeline-led, full-width hero). Else `editorial` (2-col with sticky rail).
- **Timeline event glyphs** — keyword-matched mini SVG icons (12 total: battle, treaty, revolution, crown, ship, document, foundation, construction, trade, death, book, discovery). When `getEventGlyph(t.text)` returns non-empty, replaces the timeline dot with an icon-bearing circle.

Helper functions (all top of openConcepto):
- `getConceptAccent(c)` → group color
- `getConceptAccent2(c)` → modo color
- `getConceptEra(c)` → era class
- `getConceptGlyph(c)` → SVG glyph for badge
- `pickConceptLayout(c)` → 'editorial' | 'cronologico'
- `getEventGlyph(text)` → SVG glyph for timeline event (or empty string)

Future layouts to build (not yet implemented): `dossier` (numbered editorial for discrete events), `dialectico` (thesis/antithesis split), `cartografico` (territory-led).

---

## 7. Translations workflow (mexicosolidarity.com)

When user sends `translate: <url> [draft]` in Telegram (or asks here directly), the protocol lives in `htmls/inbox/TRANSLATIONS_PROTOCOL.md`. Highlights:

- **Image fetch from La Jornada (Cloudflare-protected)**: must use Playwright **non-headless** to bypass the bot detection. Headless gets 403. The image URL pattern `_mediarawimage=true` works; `_medialjnimgndimage=fullsize` doesn't.
- **Featured image dual versions**: `-large.jpg` (2048-wide, treated with `treat_featured.py` grain ramp if source <1900) and `-sm.jpg` (1400-max raw for social).
- **WP draft creation** opt-in via `draft` keyword. Uses `htmls/inbox/.wp-creds.json` (local-only, not committed).
- **Manifest update**: prepend new entry to `translations/manifest.json`, sort by `last_modified` desc.
- **Auto-cleanup**: at ≥18 translation folders, oldest get pruned.

---

## 8. What NOT to touch

- **`tg-feed.json`, `sends.ndjson`** — written by automated tasks. Don't hand-edit.
- **`monitoring.html` data tables** — fed by 8 launchd jobs. Edits get overwritten.
- **`BUSCADOR-MANANERAS.html` line 681 (the base64 blob)** — 55MB compressed data. Regenerated by `actualizar-mananeras` daily.
- **`pwa/sw.js`** — service worker is finicky. Test on a fresh browser tab if you touch it.
- **Pre-existing book entries' `id` field** — changing breaks `QUOTE_PAGES`, `conexiones[]`, all cross-refs.
- **`launchd` plists** without coordinating — they're loaded into the user's launchd domain.
- **Anything under `Books/`** — never rename, never move.

---

## 9. User preferences (sticky)

From feedback memory accumulated across sessions:

- **Terse responses, no trailing summaries** — show the diff, don't recap it.
- **No em-dashes / no clusters of dashes** in prose (`—`, `–`). Reads as AI.
- **No emojis in concept content** — SVG glyphs only.
- **No meta-links** that send to unrelated targets.
- **For unfinished tasks, don't say "I'll continue"** — just continue.
- **Spanish replies unless user writes English.**
- **Don't ask before validating JS** — just do it (it's part of "done").

---

## 10. Quick reference

| Need to... | Command |
|---|---|
| Validate JS in an HTML file | `python3 -c "import re; ..."` + `jsc -e "..."` (see §2.2) |
| Backup before edit | `cp file backups/file.pre-<tag>-YYYYMMDD.html` |
| Deploy libreria.html | `cp` to `/tmp/sds`, `git add`, `git commit`, `git push origin gh-pages` |
| Fire slide pipeline now | `launchctl start com.user.notebooklm-retry` |
| Check pipeline state | `tail -50 ~/scripts/notebooklm/last-run.log` |
| Manual rescue orphan decks | see §3 |
| View a cover before committing | `curl -sL -o /tmp/c.jpg "URL" && open /tmp/c.jpg` |
| Re-auth opencode (chevron-bug fix) | `python3 -c "..."` to strip prefix (see end of LEEME) |

When uncertain, read the relevant section of `LEEME.html` for historical context. This file is the operating rulebook; that file is the lore.

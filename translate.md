# Translations Protocol — PORTABLE MODE

> **What this is.** A self-contained version of the local translation pipeline I run on my Mac for mexicosolidarity.com. Use this when I'm away from my computer and want to draft a translation from any Claude session (web claude.ai, mobile, etc.).
>
> **How to use.** Paste this entire document into a fresh Claude session as the first message. Then send a follow-up like `translate: <article URL>` or paste the Spanish article body directly.
>
> **What's different from the full pipeline.** No Mac, no local credentials, no automatic WordPress Media Library upload, no git commit/push. Claude produces the editable HTML + metadata + image URLs; I handle WordPress posting manually from the WP mobile app.

---

## Your job (Claude reading this)

When I send you `translate: <url>` or paste Spanish article text:

1. **Get the article.**
   - If I gave you a URL: fetch it with `WebFetch` (or your browsing tool).
   - If you can't fetch (Cloudflare, 403, paywall): tell me so and I'll paste the full text.
   - If I pasted the article text directly: use that.

2. **Extract metadata.**
   - Original title (Spanish, verbatim)
   - Author(s) — comma-separated if multiple
   - Original publication date (`YYYY-MM-DD`)
   - Outlet (e.g. "La Jornada", "Revista Contralínea")
   - Original URL
   - Image URLs that appear in the article body (list them so I can download)

3. **Translate to English.** Literal, journalistic tone. Specifically:
   - **Translate quotes** to English (don't leave them in Spanish).
   - **Keep proper nouns untouched**: AMLO, Sheinbaum, Morena, EZLN, CNTE, person names, city names that don't have an English form.
   - **Translate translatable place names**: Ciudad de México → Mexico City, Estados Unidos → United States.
   - **Outlet names stay**: La Jornada stays La Jornada (and gets italicized in the body when referenced).
   - **Acronyms in CAPS**: ISSSTE, INEGI, IMSS, SEP, SAT, CFE, etc.
   - **Mexican government terminology**:
     - `Secretaría` → `Secretariat` (NOT Ministry)
     - `secretario/a` → `Secretary` (NOT Minister)
     - `Jefa de Gobierno` / Sheinbaum's old role → use `Mayor` (NOT Mayoress)
   - **Don't add explanatory context** that isn't in the original. If it says "el Zócalo", just "the Zócalo". No "Mexico City's main square, the Zócalo".
   - If a phrase is ambiguous or has a hard-to-translate colloquialism, **ask me** before guessing.

4. **Produce three outputs** (see "Output format" below):
   - **A. `article.html`** — full Gutenberg block markup, editable, ready to paste into WordPress code view.
   - **B. Metadata block** — title, slug, category, tags, meta description.
   - **C. Image manifest** — URLs to download manually + notes on what each image should caption.

## Output format

When you're done, respond with EXACTLY these three sections in this order:

### A. article.html

Put this inside a markdown code block tagged `html` (or in an Artifact if you're on claude.ai). I'll copy → paste into WP Code View → switch to Visual editor.

Template (copy this structure verbatim, fill in the brackets):

```html
<!-- FEATURED IMAGE — the FIRST <figure> in the HTML is automatically detected
     by WordPress as the post's featured image. Use the ORIGINAL outlet URL
     here as a placeholder; I'll replace it via WP's media uploader on my
     phone. -->
<!-- wp:image -->
<figure class="wp-block-image"><img src="<original-outlet-image-URL>" alt="<short alt text>"/><figcaption class="wp-element-caption">Photo: <Photographer Name or just "Photo:">.</figcaption></figure>
<!-- /wp:image -->

<!-- ATTRIBUTION — always first paragraph, italic. The <a> wraps
     "<Month Day, Year> edition of <Outlet>" (starts at the month, NOT at "in"). -->
<!-- wp:paragraph -->
<p><em>This article by <Author Name(s)> originally appeared in the <a href="<original-URL>"><Month Day, Year> edition of <Outlet Name></a>, <one-line outlet descriptor — e.g. "Mexico's premier left-wing daily newspaper" for La Jornada, "an independent investigative magazine" for Contralínea>.</em></p>
<!-- /wp:paragraph -->

<!-- BODY — one <!-- wp:paragraph --> wrapper per paragraph.
     Quotes stay INLINE in paragraphs (with English quotation marks),
     NOT as <blockquote>. -->
<!-- wp:paragraph -->
<p>First body paragraph.</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Second body paragraph with a quote: "Quote translated to English," said Marcos.</p>
<!-- /wp:paragraph -->

<!-- INLINE IMAGES — distribute at natural narrative pauses (every 2-3
     paragraphs if there are several). If only one image, leave it as
     the featured image and don't add it again inline. -->
<!-- wp:image -->
<figure class="wp-block-image"><img src="<original-outlet-image-URL>" alt="<desc>"/><figcaption class="wp-element-caption">Photo: <Name>.</figcaption></figure>
<!-- /wp:image -->

<!-- BLOCKQUOTE — use SPARINGLY (max 1-2 per article). Reserve for:
     a thesis-summarizing quote, a provocative line, or quotes the
     original article visually highlighted. Otherwise keep inline. -->
<!-- wp:quote -->
<blockquote class="wp-block-quote">
  <p>One memorable quote that summarizes the article's argument.</p>
</blockquote>
<!-- /wp:quote -->
```

**Hard rules**:
- NO drop caps, NO subheads (`<h2>`/`<h3>`) unless the original has them clearly.
- NO translator credit at the end (site doesn't use it).
- NO inline CSS.
- NO `<blockquote>` for ordinary quotations — those go inline in their paragraph.
- Outlet names referenced inside body text (other than the attribution link) should be in `<em>`.

### B. Metadata

Output as a fenced JSON block so I can scan it quickly:

```json
{
  "translated_title": "<English headline, 1-2 lines max>",
  "original_title": "<verbatim Spanish>",
  "slug": "YYYY-MM-DD-<2-or-3-word-english-headline-kebab>",
  "category": "<one of: Analysis, News Briefs, Labor, Mañaneras, Interviews, Historical, Photos, Soberanía, Migrant Justice, Compañeros>",
  "tags": ["#Tag1", "#Tag2", "#Tag3"],
  "meta_description": "<140-160 chars, ONE sentence, reusable for excerpt + meta + social + X descriptions>",
  "focus_keyphrase": "<2-5 word SEO phrase, e.g. 'Peñasquito mine workers' or 'Sheinbaum press conference'>"
}
```

**Category notes**:
- `News Briefs` → default for everyday news coverage.
- `Analysis` → long opinion / interpretive pieces.
- `Labor` → unions (CNTE, SNTE, SME, CATEM, SITUAM), strikes, worker movements.
- `Mañaneras` → presidential press conference recaps.
- `Interviews` → Q&A format.
- `Historical` → backgrounders / anniversaries.
- `Photos` → photo essays.
- `Soberanía` → sovereignty, US-Mexico relations, anti-imperialism framing.
- `Migrant Justice` → migration policy.
- `Compañeros` → solidarity profiles.

**Tag hints** — use hashtag format. Include where applicable:
- State name (`#Chihuahua`, `#Sinaloa`, `#Zacatecas`, etc.) if the story is rooted in a specific Mexican state.
- Union acronyms if labor (`#SME`, `#CNTE`, `#SNTE`, `#CATEM`, `#SITUAM`).
- Thematic: `#Mining`, `#Public Education`, `#Pemex`, `#Foreign Policy`, `#US Imperialism`, `#Mexican Sovereignty`, `#AMLO`, `#Sheinbaum`, `#Cuba`, `#EZLN`.

### C. Image manifest

List image URLs as a bullet list, with one line of context each:

```
- https://<outlet>/.../image1.jpg — Featured. <short caption description>. Photo credit: <Name or "unknown">.
- https://<outlet>/.../image2.jpg — Body image #1. <description>.
- ...
```

If the original article has no images, write: `No images in original article.`

**Image size targets (for manual download/upload)**:
- Featured image: ideally ≥ 2048 × 1365 (3:2 ratio). If the original is smaller, flag it: `⚠ Original is 1280×853 — under the 2048×1365 target. Consider finding a higher-res alternative.`
- Body images: ideally ≥ 1200px wide.

## What I (Samuel) do next on my phone

1. Copy the `article.html` from your output → WordPress mobile app → New Post → Code View → paste → switch to Visual.
2. Tap each `<figure>` → WP shows the placeholder image broken → tap "Replace" → Upload from camera roll (after I download from the URLs you gave me) → done.
3. Title → paste from `translated_title`.
4. Right sidebar:
   - **Discussion** → set to **Closed** (always; keep pingbacks enabled).
   - **Excerpt** → paste `meta_description`.
   - **Category** → set to `category`.
   - **Tags** → add `tags`.
   - **Author** → dropdown if MSP regular; **Guest Author** field if outlet author (probably).
5. Yoast SEO bar at bottom:
   - **Focus keyphrase** → `focus_keyphrase`.
   - **Meta description** → same as `meta_description`.
   - **Social** + **X** tabs → social title = title, social/X description = `meta_description`, social/X image = the featured image I uploaded.
6. Publish.

## Refinement (while we're chatting)

If I reply "cambia X por Y", "rehaz el primer párrafo", "el título no me gusta, ponle: ..." → output ONLY the changed section (the updated `article.html` paragraph or the new metadata field). Don't regenerate the whole thing.

If I send a replacement image: just tell me its dimensions if I ask. I'll handle the WP swap manually since you don't have my WP credentials.

## What you should NOT do in portable mode

- **Don't try to upload to WordPress.** No `wp-creds.json` available here. The featured image and body images use the original outlet URLs as placeholders; I swap them in WP manually.
- **Don't try to write to my Mac filesystem or git push.** This session has no access to my local repo.
- **Don't shorten or omit the Gutenberg block delimiters** — those `<!-- wp:... -->` comments are critical. Without them WordPress collapses the article into one un-editable "Classic" block.
- **Don't add a translator credit** at the end of the article.
- **Don't translate names of outlets, unions, or people.**

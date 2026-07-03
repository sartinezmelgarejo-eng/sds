# Protocolo de Traducción para mexicosolidarity.com

Este protocolo se activa cuando:
1. Un mensaje empieza con `traduce:` o `translate:` (en DM o en el topic de Traducciones) → workflow de **traducción de artículo** (resto del documento).
2. Un mensaje empieza con `mañanera:` o `mananera:` → workflow de **draft de mañanera** (ver sección "Mañanera mode" al final del documento).
3. Un mensaje en el topic de Traducciones (grupo `-1003957818672`, thread `289`) es respuesta a un artículo previo que mandaste tú (refinamiento)

## Workflow de traducción nueva

### Trigger
```
traduce: <URL>
```
o (cuando es reply al post de scant que ya tiene el URL embedded):
```
traduce este
```

### Tokens opcionales en el mensaje

El mensaje de `traduce:` / `translate:` puede llevar tokens sueltos (en cualquier orden, después del URL):

- `draft` → crea el draft en WordPress (opt-in, ver step 10b).
- `filter:<name>` (o `filtro:<name>`) → aplica un tratamiento editorial a la **featured image** (ver **Catálogo de filtros de featured** más abajo). Si no se especifica, el default es `natural` (sin filtro de color, solo el treat/upscale de siempre).
- `filter:preview` (o `filtro:preview`) → **NO** finaliza nada: genera todos los filtros del catálogo sobre la foto del artículo y los postea como álbum en el topic para que Samuel elija. Después él responde con `filter:<name>` para aplicar el elegido (flujo de refinamiento de imagen).

Ejemplos:
```
translate: <URL> draft filter:poster
traduce: <URL> filtro:cine draft
traduce este filter:preview
```

### Pasos

1. **Descargar el artículo original** con `WebFetch` u otra fuente.
   - **Fallback para Cloudflare / 403:** si `WebFetch` o `curl` devuelven 403 o una página tipo "Just a moment...", usa el fetcher con navegador real:
     ```bash
     /usr/local/bin/python3 /Users/samuelmartinez/scripts/inbox/fetch_browser.py "<URL>" --text --out /tmp/article.txt
     ```
     Luego lee `/tmp/article.txt` con tu Read tool. Tarda ~5–10s. Cubre La Jornada y cualquier otro outlet detrás de Cloudflare managed challenge. Si quieres el HTML crudo (para extraer URLs de imágenes con regex), omite `--text`. Exit codes: `0` ok, `2` timeout de navegación, `3` sigue bloqueado tras esperar el challenge.
2. **Extraer metadata**:
   - Título original (español)
   - Autor
   - Fecha de publicación original
   - Outlet (La Jornada, Revista Contralínea, etc.)
   - URLs de imágenes (todas las que aparezcan en el cuerpo)
3. **Crear slug** = `YYYY-MM-DD-<2-3-palabras-del-headline-en-ingles-lowercase-con-guiones>`
4. **Crear directorio**: `htmls/translations/<slug>/`
5. **Descargar imágenes** a `htmls/translations/<slug>/img/` con nombres `01-feature.jpg`, `02-something.jpg`, etc.
   - Para imágenes usar `requests` o `curl`, no inventar paths
5a. **Subir cada imagen a WordPress Media Library** via REST API (esto reemplaza las URLs de GitHub en `article.html` con las de mexicosolidarity.com):
   - **Credenciales**: primero busca `htmls/inbox/.wp-creds.json` (modo local Mac, vive solo localmente, NO en el repo).
     ```json
     {"site": "https://mexicosolidarity.com", "username": "...", "app_password": "..."}
     ```
     Si NO existe el archivo (estás corriendo en sandbox / claude.ai/code Project), cae a variables de entorno: `WP_SITE`, `WP_USERNAME`, `WP_APP_PASSWORD`. Si tampoco están, aborta y avísale a Samuel — no inventes URL fake ni dejes placeholders del outlet.
   - Endpoint: `POST {site}/wp-json/wp/v2/media`
   - Auth: Basic Auth con `username:app_password` (base64 en `Authorization` header)
   - Headers: `Content-Disposition: attachment; filename="<filename>.jpg"`, `Content-Type: image/jpeg` (o el mime correcto)
   - Body: bytes binarios de la imagen
   - Response: JSON con `source_url` que es la URL pública en mexicosolidarity.com (tipo `https://mexicosolidarity.com/wp-content/uploads/2026/05/01-feature.jpg`)
   - **Usa esa `source_url` en el `<img src>` del `article.html`, NO la URL de GitHub Pages**
   - Si la subida falla (error 401, 5xx, timeout): **NO** mezcles URLs de WP y GitHub en el mismo artículo. Aborta la traducción, reporta el error en el topic con detalle (qué imagen falló, qué status code), y deja que Samuel decida si reintenta. Si falla solo una de varias, borra las que sí subieron (`DELETE /wp-json/wp/v2/media/<id>?force=true`) para no dejar huérfanos
   - Mantén las imágenes locales en `img/` igual (sirven de backup y de preview en el viewer si WP cae)
   - **Manda todas las subidas en paralelo** con `concurrent.futures.ThreadPoolExecutor` o `asyncio` para no tardar 5×el tiempo si hay 5 imágenes

5a-bis. **Featured image: SIEMPRE dos versiones** (la no-upscale fue una lección específica de la mañanera mode, donde presidencia.gob.mx ya entrega fotos profesionales de alta-res — ahí upscalear no aporta nada. Para news translation drafts, los outlets mexicanos suelen servir fuentes 1200×900 o menos, y el theme del sitio necesita una imagen 2048-wide para que el header de post no se vea chico, así que **sí upscaleamos** al estándar 2048).
   - La **primera imagen** que aparece en el artículo se trata como featured. Las demás son body images.
   - **Hard floor: 800 px wide**. Si la fuente original es **< 800 wide**, NO subas nada. Aborta el step de upload de la featured (las body images siguen). Agrega warning grande al card:
     > `⚠️ Featured image: <W>×<H> — below 800-wide hard floor. NOT uploaded. Reply with a higher-res replacement as a FILE (no como foto, para evitar compresión de Telegram).`
   - **Si la fuente está ≥ 800 wide**, genera dos versiones:

       **A) `<slug>-large.jpg` → Featured**
       Si source `> 2048 wide`: downscale Lanczos a 2048 wide, quality 92 progressive. (sin treatment — grain ramp da factor 0 en ≥ 1900)
       Si source `< 2048 wide` y ≥ 800: **treat_featured.py → upscale Lanczos a 2048 wide**, quality 92 progressive (aplica a news translation drafts).
       Si source `= 2048 wide`: re-save nativo, quality 92 progressive.

       **Orden estricto para low-res sources** (< 1900 wide):
       1. Guarda source como JPG temporal a quality 95 progressive.
       2. `/usr/local/bin/python3 ~/scripts/inbox/treat_featured.py <source.jpg> <treated.jpg>` — el helper aplica grain + blur + contrast/saturate boost con strength factor calculado del ancho DEL SOURCE (no del upscale). Ramp: width ≤ 1000 = factor 1.0, width = 1450 = 0.5, width ≥ 1900 = 0.0.
       3. Upscale Lanczos a 2048 wide el `treated.jpg` → `<slug>-large.jpg` quality 92 progressive.
       El treatment ANTES del upscale es crítico: el helper decide strength en función del ancho que ve, y si le pasas el upscale (2048) factor sale 0 y no hace nada. La grain mascara los artifacts de compresión + el blur Lanczos del upscale.

       **B) `<slug>-sm.jpg` → Social/OG/Twitter (raw)**
       ```bash
       /usr/local/bin/python3 ~/scripts/inbox/resize_social.py <source.jpg> /tmp/<slug>-sm.jpg
       ```
       El helper hace downscale Lanczos a 1400 wide solo si source > 1400. Si source ≤ 1400, re-save nativo. Quality 88.
       NO grain, NO blur. (`-sm` es para social cards en feed — la versión "raw" del source. El grain está solo en `-large` porque es la que se ve grande en el sitio.)

       **Mañanera mode override**: en mañanera mode (cuando el source viene de presidencia.gob.mx), NO upscale ni treatment — solo downscale o native. Ver Featured image section del mañanera mode al final del doc.

     - **Respeta la proporción original**: NO center-crop a 3:2 a la fuerza. Si la fuente es 16:9 o 4:3, escala proporcionalmente al ancho objetivo y deja la altura natural. Solo si la fuente es EXTREMA (cuadrada 1:1 o más vertical que horizontal) avisa en el card y deja que Samuel decida — no hagas crop creativo.
     - Sube ambas a WP Media Library en paralelo. Cada una devuelve su `id`. Usa la `source_url` de `-large` en el `<img src>` del article HTML. Guarda la `source_url` y el `id` de `-sm` en `meta.json` bajo `social_image` (para el bloque `meta` del POST del paso 10b).
   - **El card SIEMPRE reporta dimensiones originales + qué se hizo**, así Samuel decide si pide reemplazo aunque haya quedado funcional:
     ```
     📐 Featured: original <W>×<H>
        → -large <W>×<H> (<downscaled to 2048 | upscaled to 2048 | kept native — source = 2048>)
        → -sm <W>×<H> (<downscaled to 1400 | kept native — source ≤ 1400>)
     ```
     Si la fuente es < 1500 wide (Featured se va a ver chica en el header del sitio), agrega línea adicional:
     > `⚠️ Featured source is <W>×<H> (under 1500 wide). It'll display at native size — if you want it bigger in the sidebar, reply with a higher-res replacement as a FILE.`
   - **NUNCA duplicas la featured en el body**: en `article.html` aparece como la PRIMERA `<figure>`; el viewer la muestra en preview pero la excluye automáticamente del clipboard cuando Samuel pica Body, porque la featured va en el sidebar Featured Image de WP, no pegada en el cuerpo.

5a-quater. **Catálogo de filtros de featured** (token `filter:<name>` del mensaje).

   Todos los tratamientos viven en un solo helper reutilizable, puro Pillow (sin numpy):
   ```bash
   /usr/local/bin/python3 ~/scripts/inbox/apply_filter.py <source.jpg> <name> <out-large.jpg> <out-sm.jpg>
   /usr/local/bin/python3 ~/scripts/inbox/apply_filter.py --list
   /usr/local/bin/python3 ~/scripts/inbox/apply_filter.py <source.jpg> preview <out-dir>   # 1 JPG por filtro (1400w)
   ```
   El helper hace TODO el redimensionamiento: escala el source a 2048 wide (Lanczos), aplica el filtro, y escribe `-large` 2048/q92 + `-sm` 1400/q88 con el MISMO look (el `-sm` es downscale del `-large` tratado, no un tratamiento aparte). La paleta guinda de Morena está fija adentro (`#9F2241`).

   **Principio de diseño — TODOS los filtros ocultan la baja resolución.** Ese es el propósito central del catálogo, no solo verse cool: las fuentes de los outlets mexicanos casi siempre vienen < 2048 wide, y al escalarlas a la featured se ven blandas/borrosas. Por eso `apply_filter.py` mete una **capa de enmascarado adaptativa** debajo de cada filtro: (1) pre-sharpen (UnsharpMask) sobre la imagen NATIVA antes de escalar, para recuperar micro-bordes; (2) después del look, grano de enmascarado con fuerza que rampa según cuánto se escaló (full a ≤1000 wide, 0 a ≥1900 — misma filosofía que `treat_featured.py`). Los looks que ya destruyen detalle solos (`poster`, `halftone`, `riso`, `duotone`) llevan grano ligero encima; los suaves (`wash`, `cine`, `bicolor`) llevan más. Resultado: elijas el que elijas, la baja resolución queda enmascarada. No hace falta pasar por `treat_featured.py` cuando usas un filtro — `apply_filter.py` ya incluye ese enmascarado.

   **Nombres del catálogo:**

   | `name` | Descripción | Cuándo |
   |---|---|---|
   | `natural` | Sin filtro de color. **Default.** Usa el pipeline de siempre (`treat_featured.py` + upscale para news, ver step 5a-bis) — NO llames `apply_filter.py` para esto. | News del día, tono periodístico neutro |
   | `wash` | Tinte guinda sutil (~30%), sigue pareciendo foto | Sello de marca discreto, seguro para news |
   | `poster` | Cartel propaganda 3 tonos (tinta/guinda/crema), serigrafía revolucionaria | El más on-brand y con carácter; opinión/portada o look fijo |
   | `riso` | Serigrafía risograph: posterize + guinda/crema + desregistro de imprenta | Versión suave del poster; aún se lee como foto |
   | `halftone` | Trama de puntos guinda sobre crema (periódico / pop-art) | Fotos con fondo claro; se come al sujeto si el fondo es oscuro |
   | `bicolor` | Duotono a dos colores guinda + teal | Tomas abiertas; el teal en piel/pelo se ve raro en retratos |
   | `cine` | Cinematográfico: sombras teal, piel cálida, bloom, viñeta, grano | Mantener tono periodístico pero premium; NO editorializa |
   | `duotone` | Duotono guinda → crema (monocromo de marca total) | Look editorial fuerte |
   | `duotone-soft` | 60% duotono + 40% original (conserva algo de naturalismo) | Punto medio del duotono |

   **Flujo cuando el mensaje trae `filter:<name>` (name ≠ `natural`):**
   1. En vez del `treat_featured.py` + upscale del step 5a-bis, llama `apply_filter.py <source.jpg> <name> <slug>-large.jpg <slug>-sm.jpg` con el source original descargado (el crudo del outlet, antes de tratar).
   2. Sigue igual: hard floor 800 wide (si el source es < 800, NO subas featured — mismo warning). Respeta proporción (sin crop).
   3. Sube `-large` + `-sm` a WP Media Library igual que siempre; usa `-large` como featured y `-sm` como `social_image`.
   4. En el card, la línea de Featured reporta también el filtro aplicado: `→ filter: <name>`.

   **Flujo cuando el mensaje trae `filter:preview`:**
   1. Descarga el artículo + la foto normalmente, pero NO trates/subas nada todavía.
   2. Corre `apply_filter.py <source.jpg> preview /tmp/prev` y postea los 9 JPG como `sendMediaGroup` en el topic (chat `-1003957818672`, thread `289`), cada uno con caption = nombre del filtro.
   3. Responde: "Elige uno: responde `filter:<name>` y lo aplico en final." No crees carpeta, manifest, ni draft aún — espera la elección.
   4. Cuando Samuel responde con `filter:<name>` (reply en el topic), retoma el flujo normal desde ese punto usando ese filtro.

   **Reemplazo de filtro sobre un post ya hecho** (Samuel responde `filter:<name>` a un card existente, o "cámbiale el filtro a X"): trátalo como el **Image replacement** de más abajo — regenera `-large`/`-sm` con `apply_filter.py` desde el source original, súbelas, actualiza `featured_media` del draft vía `POST /posts/<id>`, borra las medias viejas (`DELETE /media/<old-id>?force=true`), actualiza `article.html` (`<img src>` + `id` del `wp:image`), `meta.json` (`social_image`), y el `featured_image` del `manifest.json`. Push.

5a-quinquies. **Title overlay + watermark para redes** (token `title` / `title:<color>` del mensaje en modo `translate:`; **default automático en modo mañanera**).

   - En **modo `translate:` / `traduce:`**: sigue siendo opt-in con token `title`. Si el mensaje no lo trae, no se genera nada.
   - En **modo mañanera** (con o sin prefijo): se genera **siempre por default** y se manda por Telegram al DM de Samuel (`chat_id: 6855761084`) como `sendDocument`. No hace falta pedirlo. Aprobado 2026-07-03.

   En ambos casos: el featured que sube a WP es la versión CLEAN (sin overlay). La versión con overlay solo va por Telegram (nunca a WP), para no duplicar el título con el `<h1>` del theme.

   Superpone el headline traducido a la featured con el **font real del sitio** (Caprasimo, MAYÚSCULAS) + el logo **MSM** de watermark. Un solo comando hace texto + banner + watermark:
   ```bash
   /usr/local/bin/python3 ~/scripts/inbox/headline_overlay.py <image.jpg> "<headline>" <out.jpg> \
       --color white --size-frac 0.048 --outline none --no-shadow --no-scrim --banner --banner-color red \
       --watermark ~/scripts/inbox/assets/msm-logo.jpg --wm-frac 0.095 \
       --side-pad-frac 0.04 --bottom-pad-frac 0.07
   ```
   - Font: `~/scripts/inbox/fonts/Caprasimo-Regular.ttf` (OFL, el mismo tipo que el sitio carga como woff2 para `.entry-title`/`h1`).
   - Logo watermark: `~/scripts/inbox/assets/msm-logo.jpg`, **top-right**, badge redondeado, **sin sombra**, `--wm-frac 0.095` del ancho.
   - **Defaults fijos (lo que Samuel aprobó 2026-07-03, usa exactamente estos):**
     - **Banner ROJO** (`--banner --banner-color red` = `#b92525` = header-bar del sitio): sale del borde izquierdo y termina justo donde acaba el texto. Es el fondo del título (reemplaza al scrim y a la barrita kicker).
     - **Texto BLANCO** (`--color white`): sobre el rojo lee limpio. **NO** uses cream/rojo sobre banner blanco — Samuel prefiere el rojo saturado como elemento gráfico dominante.
     - **MAYÚSCULAS** (allcaps, default; NO uses `--no-caps`) — en el banner pegan más como elemento gráfico.
     - `--size-frac 0.048` (mediano, 1 línea).
     - `--outline none`, `--no-shadow`, `--no-scrim`.
     - Watermark `--wm-frac 0.095`.
     - **Padding**: `--side-pad-frac 0.04` (banner arranca cerca del borde izquierdo, no en 6% default) y `--bottom-pad-frac 0.07` (banner queda un poco arriba del borde inferior, no pegado).

   **REGLA DURA de destino — NO hornear el title en la featured de WordPress:**
   1. El **featured que sube a WP** es la versión **SIN title** (foto limpia + filtro si lo hay, pero sin overlay). Esto evita duplicar el título con el `<h1>` que el theme ya pone sobre la featured.
   2. La versión **CON title + watermark** NO se sube al draft: se **manda por Telegram como archivo** (`sendDocument`, no `sendPhoto`, para full-res sin compresión) para que Samuel la use en **redes sociales**.
      - **Destino:** DM directo a Samuel (`chat_id: 6855761084`) si el draft nació de `translate:`/`t:` o mañanera detectada. Caption: `📱 Para redes — <slug o fecha>`.
      - Si Samuel pidió explícitamente que vaya al topic de Traducciones (raro), mándala ahí en su lugar.
   3. El pipeline: source → filtro (`apply_filter.py`, o plain resize a 2048 si pidió "sin efectos") → esa versión limpia es la featured de WP; sobre una copia de esa misma versión corre `headline_overlay.py` → esa es la de redes.
   4. **Cuándo se omite:** si el draft se creó sin featured (source < 800 wide, o mañanera sin foto de presidencia todavía), obvio no hay socials. Reportar en el card: `📱 Socials: skipped — no featured image`.

5a-tris. **Body images: dimension check** (solo aviso, no redimensiona):
   - Si una body image es < **1200 wide**, agrega línea al warning del card:
     > `⚠️ Body image #N (filename): <W>×<H> — under 1200-wide target.`
   - Súbelas tal cual (sin resize) — el sitio igual las renderea, el warning es para que Samuel decida si pide reemplazo.
5b. **Guardar el original ES** en `htmls/translations/<slug>/original.json` con la estructura:
   ```json
   {
     "paragraphs": [
       "Primer párrafo en español verbatim del artículo original.",
       "Segundo párrafo en español...",
       "..."
     ]
   }
   ```
   El array debe contener SOLO los párrafos del cuerpo (no metadata, no captions, no la firma del autor) **en el mismo orden** en que aparecen los párrafos traducidos en `article.html` (excluyendo el párrafo de attribution, que es invento nuestro y no tiene counterpart en ES). Esto permite la vista Compare & Edit lado a lado.
6. **Traducir literalmente** el artículo al inglés:
   - Mantén tono periodístico mexicano original
   - **Traduce los quotes en español** al inglés (a diferencia de algunos sitios que los dejan en español)
   - **Mantén nombres propios sin traducir**: "AMLO", "Sheinbaum", "Morena", "EZLN", "CNTE", nombres de personas, ciudades
   - **Términos políticos**: "el priato" → "the PRI era", "neoliberales" → "neoliberals", "transformación" → "transformation"
   - Si hay una frase ambigua o un coloquialismo difícil, **pregunta a Samuel en español antes de inventar** una traducción

   ### Título: PRESERVA la estructura del original

   Samuel ya te ha llamado la atención sobre esto. Es REGLA DURA, no preferencia:

   - **NO reordenes** las cláusulas del headline original. Si el español dice "[hecho], [caracterización]: [fuente]", el inglés debe leer en el MISMO ORDEN.
   - **NO inviertas** "X dijo que Y" a "Y, según X" (o viceversa).
   - **NO conviertas** "X: [fuente]" en una construcción sin atribución. La atribución después de los dos puntos (": Sheinbaum", ": Gabinete de Seguridad", ": INEGI") se PRESERVA en inglés como `: <Source>` al final del headline.
   - **NO sustituyas** un verbo concreto del original por otro "más literario". `hubo 28 homicidios` traduce literal a `had 28 homicides` o `there were 28 homicides`, NO a `recorded 28 cases`.
   - **NO agregues** información implícita ("Mexico's fewest..." cuando el original solo dice "el día con menos..."). El contexto de México es obvio dado el outlet; no metas "Mexico's" salvo que aparezca explícito.
   - **NO conviertas** un número en cláusula subordinada ("with 28 cases") cuando en el original era el sujeto/objeto principal ("hubo 28 homicidios").
   - **Sí ajusta** sintaxis mínima necesaria para que el inglés sea gramatical (artículos, preposiciones, orden de adjetivos), pero NADA MÁS.
   - **Sí mantén** signos de puntuación equivalentes: la coma del medio del headline se queda coma; el `:` se queda `:`; el `;` se queda `;`.
   - Si el headline tiene un giro coloquial (e.g. "Sheinbaum: 'no nos van a mover'"), tradúcelo literal con las comillas y el dos puntos intactos.

   **Test mental**: si Samuel pudiera reverse-traducir tu título al español sin cambiar el orden de las frases, está bien. Si tendría que reorganizar para que matcheara el original, te equivocaste.

   ### Capitalización: Headline Title Case (AP-style)

   El título DEBE usar headline title case, igual que NYT, La Jornada English, WSJ y mexicosolidarity.com. Reglas:

   - **Mayúscula** en: nouns, verbs (incluso `Is`, `Be`, `Are`), pronouns (`He`, `She`, `It`, `Their`, `This`, `That`), adjectives, adverbs (incluyendo `Off`, `Up`, `Down` cuando son adverbios), subordinating conjunctions (`Because`, `Although`, `If`, `Since`, `While`).
   - **Minúscula** en: articles (`a`, `an`, `the`), short prepositions ≤4 letters (`in`, `on`, `of`, `to`, `by`, `at`, `for`, `with`, `from`, `into`, `over`), coordinating conjunctions (`and`, `but`, `or`, `nor`, `yet`, `so`), infinitive `to`.
   - **SIEMPRE mayúscula**: primera palabra del título, última palabra del título, y la primera palabra después de un dos puntos (`:`) o em-dash (`—` cuando es válido).
   - **Hyphenated compounds**: cada parte significativa lleva mayúscula → `Self-Described`, `Anti-Imperialism`, `Long-Term`. Si la segunda parte es un sufijo trivial (`-style`, `-like`) sí va minúscula.
   - **Siglas / acrónimos**: como aparezcan en uso normal (`U.S.`, `DHS`, `T-MEC`, `ISSSTE` ALL-CAPS; `Pemex`, `Telmex` solo inicial).
   - **Nombres propios y palabras en idioma extranjero**: como se escriban natural (`Sheinbaum`, `Mañaneras`, `Zócalo`, `Cuartoscuro`).

   **Ejemplos correctos**:
   - ✅ `Mexico Can't Go On This Way`
   - ✅ `June 7 Had 28 Homicides, the Day With Fewest Killings in the Last Decade: Security Cabinet`
   - ✅ `DHS Denies Alfonso Durazo and Américo Villarreal Hold Special Permits to Enter the US`
   - ✅ `Mexico's Sheinbaum to U.S. Ambassador: Hands Off My Country's Politics`
   - ✅ `Wastewater Treatment Plant Inaugurated in Puerto Peñasco; Reverses 50-Year Backlog`

   **Errores comunes a evitar**:
   - ❌ `mexico can't go on this way` (todo minúsculas)
   - ❌ `Mexico Can't Go On THIS Way` (mayúsculas inventadas)
   - ❌ `Mexico can't Go on this Way` (mezcla inconsistente)
   - ❌ `Mexico Can't Go on this Way` (`on` minúscula es OK pero `this` debe ir mayúscula porque es pronoun)
   - ❌ `Mexico Can't Go On This way` (última palabra siempre mayúscula, hasta si es preposición)

   Esta regla aplica a TODOS los headlines:
   - `translated_title` en `meta.json`
   - La entry del `translations/manifest.json`
   - El card de Telegram
   - El campo `title` del draft de WP
   - Los **section headers** del mañanera mode (e.g. `Mexico–United States: Cooperation With Respect for Sovereignty`, NOT `with` minúscula porque viene después de dos puntos pero `for` sí minúscula porque es preposition corta no después de `:`).

   Esta regla aplica IGUAL a:
   - El campo `translated_title` de `meta.json`
   - La entry en `translations/manifest.json`
   - El card de Telegram
   - El campo `title` del draft de WP si está prendido el opt-in
7. **Generar `article.html`** con el template exacto (ver más abajo)
8. **Generar `meta.json`** con metadata estructurada
8b. **Actualizar `translations/manifest.json`** (índice usado por `translations/index.html`):
   - Estructura: array de objetos, ordenado por `last_modified` desc (más reciente primero)
   - Campos por entry: `slug`, `translated_title`, `original_title`, `author`, `outlet`, `original_date`, `translated_date`, `status`, `last_modified` (Unix timestamp en segundos, ej. `time.time()`). Campos opcionales que se llenan al crear el WP draft (step 10b): `wp_post_id` (int), `wp_status` (string como devuelve WP — `draft`, `pending`, `publish`), `wp_link` (URL pública del post — usada por el dashboard cuando ya está `publish`), `featured_image` (string — copia el `source_url` del `social_image` de `meta.json` aquí; es la URL que el dashboard usa como thumb del card, sobrevive aunque borren el local `img/` durante la limpieza).
   - **Traducción nueva**: prepend el objeto al inicio del array
   - **Refinamiento**: encontrar la entry por `slug` y actualizar `last_modified` (y cualquier campo que haya cambiado, ej. `translated_title` si se editó). Después re-sortear por `last_modified` desc
   - **Status cambia a posted**: encontrar la entry y actualizar `status`. Re-sortear no necesario
   - **Cleanup borra carpetas**: eliminar también esas entries del manifest
   - Mantener el manifest en sincronía siempre. Si el archivo no existe, créalo escaneando las carpetas existentes
9. **Git push** (backup + cp a /tmp/sds/ + commit + push). Incluye `manifest.json` en el commit.
10. **Postear en el topic de Traducciones** (no en DM):
    - chat_id `-1003957818672`, message_thread_id `289`
    - Formato del mensaje (más abajo)
10b. **Crear draft en WordPress (OPT-IN, solo cuando Samuel lo pide)**:
    - **Trigger**: el mensaje contiene la palabra `draft` (e.g. `translate: <url> draft`, `traduce: <url> draft`) O Samuel responde al card con algo tipo `draft`, `crea draft`, `make a draft`. Si NO está presente, **no hagas draft** — el flujo termina en el push + card como siempre.
    - **Endpoint**: `POST {WP_SITE}/wp-json/wp/v2/posts` con misma Basic Auth que step 5a.
    - **Payload mínimo**:
      ```json
      {
        "status": "draft",
        "title": "<meta.translated_title>",
        "slug": "<meta.slug sin el prefijo YYYY-MM-DD>",
        "content": "<article.html SIN la primera <figure> (la featured va en featured_media, no embebida) + sin los delimitadores wp:image de esa figura. Reusa la misma lógica que el botón Body del viewer.>",
        "excerpt": "<meta.meta_description>",
        "featured_media": <id del -large.jpg subido en step 5a-bis>,
        "comment_status": "closed",
        "ping_status": "open",
        "categories": [<id>],
        "tags": [<id>, ...]
      }
      ```
    - **Categories**: traduce `meta.suggested_category` a id buscando `GET /wp-json/wp/v2/categories?slug=<lower-kebab>` (e.g. "News Briefs" → slug `news-briefs`). Si el slug exacto no aparece, intenta `?search=<name>`. Si tampoco existe, NO crees una nueva — deja `categories: []` y agrega línea al card pidiéndole a Samuel que la elija.
    - **Tags**: para cada `#Tag` en `meta.suggested_tags`, busca `GET /wp-json/wp/v2/tags?slug=<lower-kebab>`. Si NO existe, créalo con `POST /wp-json/wp/v2/tags` (el guide dice los tags son para sorting interno; está OK crearlos). Acumula los ids.
    - **Yoast fields** (depende de Yoast REST extension — Yoast Premium 23+ los expone por default).
      Agrega un objeto `meta` al payload que cubra Social (Facebook/OG) **y** X (Twitter card):
      ```json
      "meta": {
        "_yoast_wpseo_metadesc": "<meta.meta_description>",
        "_yoast_wpseo_focuskw":  "<meta.focus_keyphrase>",
        "_yoast_wpseo_opengraph-title":       "<meta.translated_title>",
        "_yoast_wpseo_opengraph-description": "<meta.meta_description>",
        "_yoast_wpseo_opengraph-image":       "<source_url de -sm.jpg>",
        "_yoast_wpseo_opengraph-image-id":    <id de -sm.jpg>,
        "_yoast_wpseo_twitter-title":         "<meta.translated_title>",
        "_yoast_wpseo_twitter-description":   "<meta.meta_description>",
        "_yoast_wpseo_twitter-image":         "<source_url de -sm.jpg>",
        "_yoast_wpseo_twitter-image-id":      <id de -sm.jpg>
      }
      ```
      **Convención por default:** OG y Twitter usan el mismo title/description/image que el post (sin variantes). Si Samuel quiere variantes específicas (más cortas, distinto framing para X), los ajusta manual en el panel Yoast — la rutina solo llena la base.
      Si la respuesta del API muestra que esos campos NO se aplicaron (el JSON de la respuesta no los lista o los lista vacíos), avísale a Samuel en el card que probablemente falta el mu-plugin de Yoast meta registration (ver `htmls/inbox/SOBERANIA_PROTOCOL.md` → "Edge case: Yoast meta no se aplican" para el snippet). NO falles toda la creación del draft por esto.
    - **Respuesta**: del JSON devuelto, extrae `id` (post ID) y `link` (URL pública del draft).
    - **URL del editor**: `{WP_SITE}/wp-admin/post.php?post=<id>&action=edit` — eso te lleva directo al editor en escritorio. En móvil la app de WP suele abrirlo desde el botón "Posts → Drafts".
    - **Persistir el post ID** (CRÍTICO para que el dashboard de Translations linkee al editor / al post live en vez del HTML local):
      - En `meta.json`: agrega/actualiza `wp_post_id` (int), `wp_status` (string como devuelve WP — `draft`, `pending`, `publish`), `wp_edit_url` (`{WP_SITE}/wp-admin/post.php?post=<id>&action=edit`), `wp_link` (campo `link` de la respuesta REST — la URL pública del post, ej. `https://mexicosolidarity.com/<slug-sin-fecha>/`).
      - En `translations/manifest.json`: encuentra la entry por `slug` y agrega/actualiza `wp_post_id`, `wp_status`, `wp_link`, `featured_image` (`= social_image.source_url`). Sin `wp_post_id` las cards caen al fallback `viewer.html?slug=...` (HTML local). Sin `featured_image` el card aparece sin thumb (gradient placeholder).
      - Para drafts el `wp_link` igual viene en la respuesta (apunta al preview público con `?preview_id=...`). Guárdalo igual; el dashboard solo lo usa si `wp_status==='publish'`.
      - Si en algún refinamiento futuro el status cambia (ej. el draft pasó a `publish`), re-leer el post via `GET {WP_SITE}/wp-json/wp/v2/posts/<id>?_fields=status,link` y actualizar `wp_status` + `wp_link` en ambos archivos. El dashboard también hace un poll silencioso por su cuenta, así que esto es opcional para refinamientos; lo importante es que el draft inicial los guarde.
    - **Reporta en el card** una sección extra:
      ```
      📝 Draft created: <translated_title>
      🔗 <a href="{WP_SITE}/wp-admin/post.php?post=<id>&action=edit">Open in WordPress editor</a>
      <opcionales: ✅ Featured set · ✅ Category set · ✅ Tags set · ⚠️ Yoast meta not applied (set manually)>
      ```
    - Si la creación del draft FALLA: reporta error específico (status code, mensaje), NO bloquees el resto del flujo (el card del viewer sigue siendo útil, Samuel puede pegar manualmente con el flujo viejo).

11. **Limpieza automática** (después del push, antes de cerrar):
    - Cuenta las carpetas en `htmls/translations/` (excluyendo `viewer.html` y `.gitkeep`)
    - Si el total es **≥ 18**: borra las **4 más viejas** por orden lexicográfico del slug (el prefijo `YYYY-MM-DD-...` hace que ordenar alfabéticamente = ordenar por fecha)
    - Borra en ambos lados: `htmls/translations/<slug>/` Y `/tmp/sds/translations/<slug>/`
    - Hacer un segundo commit + push solo de las eliminaciones para que GitHub Pages las refleje
    - **NO** anunciar la limpieza en el topic de Traducciones (ensucia el canal). Tampoco mandes mensaje al DM privado — si Samuel quiere saber qué se limpió, mira `git log` del repo
    - Si el total es < 18, no hacer nada. NO crear archivo nuevo, NO commit vacío.

## Template HTML exacto (`article.html`)

El sitio mexicosolidarity.com usa Gutenberg block editor + plugin Kadence Blocks. **CRÍTICO**: el HTML debe emitirse con **delimitadores de bloque Gutenberg** (comentarios `<!-- wp:... -->` ... `<!-- /wp:... -->`) envolviendo cada elemento. Sin ellos, WP pega todo como un solo "Classic block" del editor viejo, que la app móvil NO soporta (Samuel tiene que pegar en Code View, switchear a Visual, y darle "Convert to Blocks" cada vez). Con delimitadores, WP reconoce cada pieza como bloque nativo al instante en desktop y móvil. NO inyectes CSS inline.

**📚 Referencia completa de blocks disponibles**: `WP_BLOCKS_REFERENCE.md` (en este mismo folder). Consúltalo cuando necesites algo más complejo que párrafos + imágenes + blockquotes simples. Cubre: paragraph, heading, quote, pullquote, list, image, gallery, media+text, columns, group, buttons, embeds (YouTube/X), separator, table, details, y los Kadence-específicos (Row Layout, Info Box, Icon List, Testimonial, Table of Contents).

**Para artículos típicos de noticias** (default): usa los bloques básicos del template más abajo. Solo consulta WP_BLOCKS_REFERENCE.md si el artículo tiene:
- Imágenes que merecen layout especial (galería, side-by-side con texto)
- Citas dramáticas que ameritan pullquote (NO blockquote simple)
- Listas claramente estructuradas en el original
- Tablas de datos
- Embeds (tweet, video)
- Otra estructura no-prose

```html
<!-- FEATURED IMAGE: la primera <figure> del article.html ES la featured.
     El viewer la muestra en preview pero la EXCLUYE del clipboard cuando
     Samuel pica "Body" (porque la featured va manualmente en el widget
     Featured Image del sidebar de WP, no pegada en el cuerpo). URL es la
     de mexicosolidarity subida en step 5a-bis (versión -large.jpg), NO la
     del outlet original. -->
<!-- wp:image -->
<figure class="wp-block-image"><img src="https://mexicosolidarity.com/wp-content/uploads/YYYY/MM/<slug>-large.jpg" alt="<descripción corta>"/><figcaption class="wp-element-caption">Photo: <Photographer Name></figcaption></figure>
<!-- /wp:image -->

<!-- ATTRIBUTION (siempre en cursiva, primer párrafo).
     IMPORTANTE: el <a> envuelve "<Month Day, Year> edition of <Outlet Name>" — empieza en el mes.
     "in the" queda FUERA del link. NO subrayes solo el nombre del outlet. -->
<!-- wp:paragraph -->
<p><em>This article by <Author Name> originally appeared in the <a href="<original-URL>"><Month Day, Year> edition of <Outlet Name></a>, <descripción breve del outlet si es relevante: "Mexico's premier left wing daily newspaper" para La Jornada, etc.>.</em></p>
<!-- /wp:paragraph -->

<!-- CUERPO: cada párrafo envuelto en su propio delimitador.
     No drop caps, no pull quotes, no h3 subheads salvo que el original los tenga.
     Quotes integrados inline en párrafos, no como <blockquote>. -->
<!-- wp:paragraph -->
<p>Body paragraph 1...</p>
<!-- /wp:paragraph -->

<!-- wp:paragraph -->
<p>Body paragraph 2 con cita: "Quote traducido al inglés," said Marcos.</p>
<!-- /wp:paragraph -->

<!-- INLINE IMAGES (si las hay): -->
<!-- wp:image -->
<figure class="wp-block-image"><img src="https://mexicosolidarity.com/wp-content/uploads/YYYY/MM/02-marcos-speaking.jpg" alt="<descripción>"/><figcaption class="wp-element-caption">Photo: <Photographer></figcaption></figure>
<!-- /wp:image -->

<!-- wp:paragraph -->
<p>More body...</p>
<!-- /wp:paragraph -->

<!-- KADENCE POSTS BLOCK al FINAL del article.html — siempre 3 most recent.
     Es el "1g. Posts" del MSM Posting Guide. Pedro lo agrega manual en
     cada post; nosotros lo emitimos automático en el output del bot para
     que el copy/paste del viewer (o el draft auto-creado vía REST) ya
     lo lleve. NO requiere separator antes en el caso de news translations
     (a diferencia del mañanera mode, que lo separa del YouTube embed).
     `uniqueID` debe ser único por post — genera uno random tipo
     "<6-hex>-<2-digit>" la primera vez y úsalo siempre. -->
<!-- wp:kadence/posts {"uniqueID":"REPLACE_WITH_FRESH_ID","postsToShow":3,"imageSize":"large","author":false,"readmore":false,"titleFont":[{"level":4,"size":["","",""],"sizeType":"px","lineHeight":["","",""],"lineType":"px","letterSpacing":["","",""],"letterType":"px","textTransform":""}]} /-->
```

### Delimitadores de bloque por tipo

Lista de los más usados (consultar `WP_BLOCKS_REFERENCE.md` para el resto):

| Bloque | Delimitador apertura | Cierre |
|---|---|---|
| Paragraph | `<!-- wp:paragraph -->` | `<!-- /wp:paragraph -->` |
| Heading h2/h3 | `<!-- wp:heading {"level":2} -->` (default level=2; omitir `{"level":2}`. Para h3: `{"level":3}`) | `<!-- /wp:heading -->` |
| Image | `<!-- wp:image -->` | `<!-- /wp:image -->` |
| Quote / blockquote | `<!-- wp:quote -->` | `<!-- /wp:quote -->` |
| Pullquote | `<!-- wp:pullquote -->` | `<!-- /wp:pullquote -->` |
| List | `<!-- wp:list -->` | `<!-- /wp:list -->` |
| Separator | `<!-- wp:separator -->` `<hr class="wp-block-separator"/>` | `<!-- /wp:separator -->` |

Para bloques con atributos (ej. imágenes con `align`, `id` de Media Library), incluir el JSON en la apertura: `<!-- wp:image {"id":16325,"sizeSlug":"large"} -->`. El `id` es el `id` que devuelve la API al subir cada imagen — guardarlo en `meta.json` y usarlo en el delimitador para que WP la enlace con la entrada de Media Library.

### Reglas del template
- **NO** drop caps
- **NO** subheads `<h3>` salvo que el original los tenga claramente marcados como secciones
- **NO** translator credit al final (el sitio no lo usa)
- **Featured image**: primera `<figure>` del HTML, antes del attribution paragraph
- **Attribution paragraph**: SIEMPRE en `<em>`, SIEMPRE con el link al artículo original embebido en el nombre del outlet
- **Caption de imágenes**: `Photo: <Name>` o solo `Photo:` si no hay crédito visible
- **Kadence Posts block** SIEMPRE al final del `article.html` (después del último párrafo del cuerpo), como muestra el template. Pedro siempre lo agrega en cada post; el bot lo emite automático para que el copy/paste del viewer y el draft auto-creado vía REST ya lo lleven sin acción manual.

### Quotes — dos tratamientos según fuerza:

**Quote inline** (default — la mayoría): cita corta o periodística normal, integrada en el párrafo entre comillas tipográficas en inglés (`"..."`), seguida de `said X` o `, X explained`. NO usar `<blockquote>` para esto.

```html
<p>The governor was unapologetic: "respect the mobilization," she said, claiming "here there are guarantees of legality and freedom of expression."</p>
```

**Pull quote / blockquote destacado** (uso selectivo): cuando la cita es:
- Una frase contundente que sintetiza la tesis del artículo
- Una opinión fuerte del autor o de un actor central
- Un statement provocador o memorable
- (Cuando ves en el original que ya está destacada como blockquote en su layout)

Úsalo como `wp:quote` (NO `wp:pullquote`):
```html
<!-- wp:quote -->
<blockquote class="wp-block-quote">
  <p>Morena legislators? As always: caught up in petty squabbles, idling, managed by the infiltrator and defender of the opposition (read: Ricardo Monreal), and really busy positioning themselves for the next electoral process.</p>
</blockquote>
<!-- /wp:quote -->
```

El tema de mexicosolidarity.com automáticamente le pone borde izquierdo + indentación. **No agregues attribution dentro del blockquote** — el sitio no lo usa. Si necesitas atribuir, hazlo en el párrafo siguiente o anterior (cada uno como su propio `wp:paragraph`).

Regla de pulgar: **máximo 1-2 blockquotes por artículo**. Si todos son blockquote pierde el énfasis. Si dudas, déjala inline.

### Imágenes — distribución
- Una `<figure>` por cada imagen del original
- Distribuirlas en **puntos naturales de pausa narrativa** del artículo, NO todas al principio ni todas al final
- Si el original tiene 8 imágenes, intercalarlas cada 2-3 párrafos
- Si el original tiene 1 imagen, ponerla solo como featured arriba

## Template `meta.json`

```json
{
  "slug": "2026-05-18-marcos-cuba-ezln",
  "translated_title": "Capitán Marcos of the EZLN says Cuba Maintains its 'social project amidst all possible threats'",
  "original_title": "El capitán Marcos del EZLN: Cuba mantiene su proyecto social...",
  "author": "Elio Henríquez",
  "original_date": "2026-05-17",
  "translated_date": "2026-05-18",
  "outlet": "La Jornada",
  "original_url": "https://www.jornada.com.mx/2026/05/17/...",
  "suggested_category": "News Briefs",
  "suggested_tags": ["#Cuba", "#EZLN"],
  "meta_description": "One-line summary, 140-160 chars. Reused as Yoast meta description, post Excerpt, Social description, X description, and social post text.",
  "focus_keyphrase": "EZLN Cuba solidarity",
  "social_image": {
    "id": 16842,
    "source_url": "https://mexicosolidarity.com/wp-content/uploads/2026/05/marcos-cuba-sm.jpg"
  },
  "image_count": 2,
  "image_warnings": [
    "Featured image: 1280×853 — under 2048-wide target"
  ],
  "status": "pending"
}
```

- `meta_description` es CRÍTICO: Samuel lo pega en 4 lugares en WP (Excerpt en sidebar, Meta description Yoast, Social description Yoast, X description Yoast). Una sola oración, concrete, hook-y. **Debe COMPLEMENTAR el título, no repetirlo.** Asume que el lector ya leyó la headline — el meta agrega lo que el headline NO dice: backstory, stakes, número específico, los actores afectados, el siguiente paso, o el ángulo que la headline no captura. **NO parafrasear el headline**; si el meta se puede reverse-traducir a una versión del título, está mal. **Target 110-155 chars**, una sola oración. Buen ejemplo de la posting guide: para un título tipo "AMLO Statement on US Attacks", el meta dice "Mexico's former President has released a statement on US attacks on Mexico, only his second political statement since his term's end, accusing US officials of plotting to 'weaken Morena.'" — agrega "segunda declaración desde fin de término" + "acusación específica", info que NO está en el headline. **Mal ejemplo**: título "No New Talks Between CNTE, Segob, and SEP, Sheinbaum Affirms" + meta "Sheinbaum says no new talks between CNTE, Segob, and SEP" → 100% redundante.
- `focus_keyphrase` 2-5 palabras SEO-style (e.g. "Sandra Polaski interview", "Peñasquito mine workers", "Sheinbaum press conference").
- `social_image` es la URL/id de la versión `-sm.jpg` (1400×933). Si la featured estaba sub-dimensionada y no se generó la versión chica, omite este campo y el card lo refleja.
- `image_warnings` es array de strings; vacío si todo cumple. Aparecen también en el card del topic.

### Categorías válidas
- **Analysis** (piezas largas de opinión)
- **News Briefs** ← default para traducciones de noticias
- **Labor** (sindicatos, CNTE, trabajadores)
- **Mañaneras**
- **Interviews**
- **Historical**
- **Photos**
- **Compañeros**

### Tags
Estilo hashtag (con `#`). 2-4 por artículo. Ejemplos comunes: `#Cuba`, `#EZLN`, `#CNTE`, `#Chihuahua`, `#US Imperialism`, `#Mexican Sovereignty`, `#AMLO`, `#Sheinbaum`, `#Public Education`, `#Pemex`, `#Foreign Policy`.

## Mensaje de respuesta en Telegram (en el topic)

Después del push exitoso, postea **DOS mensajes separados** en chat `-1003957818672` topic `289`. El primero es info técnica para review; el segundo es un post listo para copiar/pegar a redes sociales.

### Mensaje 1 — técnico/admin

Texto plano (HTML), sin foto adjunta:

```
📝 <b>[Headline traducido]</b>
By [Author] · [Original Date] · [Outlet]

📁 Cat: <code>[category]</code>
🏷 Tags: <code>[tags space-separated]</code>

🖼 Featured: original [W]×[H] → -large 2048×[H] (filtro <b>[filter_actual]</b>, treat_featured factor [X.XX])
   Sugerencias:
   • <code>/a [nombre_filtro_A]</code> — [razón corta A]
   • <code>/b [nombre_filtro_B]</code> — [razón corta B]

🔗 <a href="https://sartinezmelgarejo-eng.github.io/sds/translations/viewer.html?slug=[slug]">Viewer</a>
✏️ <a href="{WP_SITE}/wp-admin/post.php?post=[id]&action=edit">Editar draft</a>
↗ <a href="[original URL]">Original</a>
```

Si el draft no se creó (translate sin token `draft`), omite la línea ✏️.

Si `meta.image_warnings` no está vacío, agrega arriba del bloque 🖼 una sección de warnings:

```
⚠️ Image checks:
• Featured 1280×853 — under 2048-wide target
• Body image #2 (caballos.jpg) 900×600 — under 1200-wide target

📸 Reply con una foto de reemplazo como ARCHIVO (no como photo) o `/reemplazar` para pedir una nueva.
```

### Mensaje 2 — social-ready (copy/paste directo a redes)

**CÓMO ENVIAR**: hacer una llamada HTTP POST directa a la Bot API de Telegram al endpoint `sendPhoto` (NO `sendMessage`). El bot local (inbox-v2.py) solo tiene `sendMessage`, así que este segundo mensaje lo tienes que enviar tú directamente vía curl/requests:

```bash
curl -s -X POST "https://api.telegram.org/bot<TOKEN>/sendPhoto" \
  -F "chat_id=-1003957818672" \
  -F "message_thread_id=289" \
  -F "photo=<meta.social_image.source_url>" \
  -F "caption=<caption text>" \
  -F "parse_mode="
```

- El TOKEN viene de la variable de entorno `TELEGRAM_BOT_TOKEN` (heredada del bot). Puedes leerla con `echo $TELEGRAM_BOT_TOKEN` desde Bash.
- `photo` = la URL pública de `meta.social_image.source_url` (la `-sm.jpg` que subiste a WP en step 5a-bis). Telegram descarga la imagen desde esa URL.
- Si no existe `social_image.source_url` (falla en upload), usa la URL pública de `-large.jpg`. Si tampoco existe, salta este mensaje y avisa en Mensaje 1.
- `parse_mode` vacío = texto plano; **NO** uses HTML aquí para que al reenviar el mensaje a Bluesky/X/Instagram salga limpio sin tags.

**Caption** (texto plano SIN emojis ni labels ni URLs):

```
[Headline traducido]

[meta.meta_description o lead del artículo — 1-2 oraciones]
```

**Importante**:
- Caption max 1024 chars (límite de Telegram). Si excede, resume el lead.
- **NO incluyas URL** — el `wp_link` no sirve hasta que Samuel publique el draft. Cuando publique, él pega el URL final a mano en su tweet/post.
- Verifica el response del POST: si `ok:false`, reporta el error en Mensaje 1 y no bloquees el flujo (el resto del pipeline sigue siendo útil)

### Heurísticas para recomendar 2 filtros

El bot debe sugerir 2 filtros del catálogo de `apply_filter.py` (excluyendo el actual). Reglas en orden:

1. **Por ancho de source**:
   - source < 1000 wide → recomienda 2 de los "self-masking" (`poster`, `halftone`, `riso`, `duotone`) porque disimulan pixelación
   - source ≥ 1900 wide → recomienda `natural`, `wash`, o `cine` (respetan detalle)
   - 1000-1900 → cualquiera aplica

2. **Por bias del outlet** (usar el mismo bias que se usa en Clicks blurbs):
   - Medio conservador o derecha (Reforma, El Universal editorial, medios gringos hostiles) → siempre incluir `duotone` o `wash` como una opción (marca guinda claramente que es contra-narrativa)
   - Medio de izquierda o solidario → `natural` como una opción segura

3. **Por tipo de contenido** (según headline + description):
   - Retrato editorial / entrevista → `wash`, `bw-guinda`
   - Foto de protesta / manifestación / conflicto → `noir`, `poster`
   - Paisaje / naturaleza / infraestructura → `wash`, `cine`
   - Diagram / gráfica / infografía → `natural`, `wash`

4. **Anti-repetición**: si en las últimas 3 traducciones (mira `manifest.json`) usaste el mismo par, elige otro par para no ser predecible.

**Formato de la razón**: máx 6 palabras, informal.
- Buenos ejemplos: "más solemne", "guinda de marca", "oculta la baja res", "cinemático para conflicto"
- Malos: "aplica un tratamiento cinematográfico con sombras teal y bloom cinematográfico"

### Refinamiento por comandos de imagen

Cuando Samuel responde al Mensaje 1 con:

- `/a` → regenera featured con el filtro sugerido A, re-postea SOLO el Mensaje 1 con el nuevo `[filter_actual]` y **NUEVAS** sugerencias (B y una tercera opción). Re-postea también Mensaje 2 con la foto actualizada.
- `/b` → idem con filtro sugerido B.
- `/filter <name>` → aplica un filtro específico del catálogo (bypass sugerencias).
- `/reemplazar` → pide que le mande una foto nueva como archivo. Al recibirla, corre el pipeline completo con el filtro actual.

Todos los refinamientos actualizan tanto el featured en WP (via PUT/upload nuevo `featured_media`) como el `-sm.jpg` del OG social image (via update del meta Yoast).

**NO** mandes el cuerpo del artículo. Todo eso ya está en el viewer.

## Refinamiento

Si Samuel responde en el topic (reply al mensaje del bot o mensaje nuevo en el thread) con algo como:
- "cambia X por Y"
- "el titulo no me gusta, ponle: ..."
- "rehaz el primer párrafo"

1. Edita `article.html` directamente con el cambio
2. Si cambió título → actualiza `meta.json` (incluido `meta_description` si la nueva headline cambia el ángulo)
3. Backup → push
4. Responde solo con: `✅ Editado: <breve descripción del cambio>`

NO regeneres todo el thread. Solo edición incremental.

### Image replacement (reply con archivo adjunto)

Cuando Samuel responde con una imagen adjunta como **archivo** (no como photo — la compresión de Telegram la rebaja a ~1280px y JPEG quality baja), interpreta el caption:
- `"featured"` o sin caption → reemplaza la primera figura del `article.html`.
- Un número (`"2"`, `"3"`, etc.) → reemplaza la body image #N (la N-ésima `<figure>` empezando por 1 = featured).
- Texto descriptivo ("la del cargador frontal") → match contra el `alt` de cada figura; si hay match único, úsalo; si no, pregunta.

Pasos:
1. Lee el archivo adjunto desde el path que el bot pasó en el prompt.
2. Mide dimensiones con Pillow. Si sigue debajo del threshold (2048 featured / 1200 body), avísale antes de subir y deja que decida.
3. Si pasa el threshold: súbela como `<slug>-large.jpg` (y `-sm.jpg` si es featured) a WP Media Library — mismo flow de step 5a + 5a-bis.
4. Si la subida sustituye una imagen previa, **borra la vieja** del Media Library (`DELETE /wp-json/wp/v2/media/<old-id>?force=true`) para no dejar huérfanos.
5. Actualiza el `<img src>` en `article.html`, y para featured también el `social_image` en `meta.json`. Reescribe `image_warnings` (elimina los warnings que se resolvieron).
6. Push.
7. Responde: `✅ Reemplazada <featured | body #N>. Nueva: 2048×1365 (-large) + 1400×933 (-sm).`

## Status: posted

Cuando Samuel diga "ya lo postee" o "publicado" o similar:
1. Edita `meta.json` → `"status": "posted"`
2. Push
3. Responde: `✅ Marcado como publicado`

## Errores comunes a evitar

- **No traducir nombres propios** ("AMLO" no es "Andrew" ni "the López Obrador one")
- **No agregar contexto explicativo** que no esté en el original. Si dice "el Zócalo", déjalo "the Zócalo" (no "Mexico City's main plaza, the Zócalo")
- **No traducir el outlet name** ("La Jornada" se queda "La Jornada", no "The Day")
- **Sí traducir lugares con nombre traducible**: "Ciudad de México" → "Mexico City", "Estados Unidos" → "United States"
- **No inventar imágenes** si el original no las tiene. Si falla la descarga, reporta el error en el mensaje
- **No subir el HTML como adjunto** — el HTML va al repo, el topic recibe el cuerpo en texto + link al formatted version
- **NO agregues em dashes (`—`) ni en dashes (`–`) que no estén en el original.** Mantén la puntuación como está: si el español usa comas, usa comas; si usa paréntesis, usa paréntesis. Los em dashes son una muletilla del LLM — no los inyectes "para mejorar el flujo".
  - **Compound hyphens en inglés (sí permitidos)**: collocations estándar como "left-wing", "individual-accounts reform", "solidarity-based system", "far-away communities", "high-quality", "2048-wide", "self-described" están OK. La regla es solo contra em/en dashes inventados que reemplazan comas o paréntesis.
  - La única vez que un em dash es válido es cuando el artículo original lo usa textualmente, o cuando es parte de un nombre propio.
  - Aplica a `article.html`, `meta_description`, summaries de una sola oración, y mensajes en el topic.

---

# Mañanera mode

Workflow paralelo (NO modifica el de `translate:`). Samuel recibe un resumen diario en WhatsApp, lo pasa al topic con `mañanera: <contenido>`. El bot construye un **draft completo** en WordPress siguiendo el formato fijo de "People's Mañanera" en mexicosolidarity.com.

## Trigger

**Formato explícito:**
```
mañanera:
[contenido completo del WhatsApp pegado tal cual]
```

(También acepta `mananera:` sin ñ por si el cliente Telegram se la come.)

**Auto-detección (sin prefijo)** — Samuel ya no necesita escribir `mañanera:`. Si el mensaje contiene CUALQUIERA de estos marcadores, trátalo automáticamente como mañanera:

- La palabra `*SUMMARY*` (con o sin asteriscos)
- La frase `MORNING PRESIDENTIAL PRESS CONFERENCE`
- El footer `Department of Communications`
- El header `*People's Mañanera` o `People's Mañanera`
- Un URL de mañanera de YouTube: `www.youtube.com/watch?v=...` combinado con longitud > 2000 chars y presencia de headers al estilo `*Topic: Subtitle*`

Cuando detectes una mañanera sin prefijo, sigue el flujo idéntico al de `mañanera:` (parse, construye draft, sube featured, crea WP post). NO respondas pidiendo confirmación — arranca directo.

Los mensajes cortos (< 500 chars) o que sean claramente comandos/preguntas NO deben tratarse como mañanera aunque contengan alguna palabra clave suelta.

### Mensajes multipartes (REGLA DURA)

El resumen de la mañanera NUNCA cabe en un solo mensaje de Telegram (límite ~4096 chars). **Siempre llegan en dos partes** (a veces más). Cuando recibas el primer `mañanera:` / `mananera:`:

1. **Detecta si el mensaje está incompleto**: señales de incompletud:
   - No aparece el footer `Department of Communications` (siempre cierra el resumen completo).
   - La última oración se corta a media palabra o termina sin punto/coma natural.
   - Faltan secciones esperadas (ej. el resumen siempre incluye Mexico–US, varios temas internos, sovereignty, etc. — si solo viste 2 o 3 headers y no hay `Department of Communications`, está incompleto).
2. **Si está incompleto, NO hagas ningún trabajo**: no parsees, no construyas HTML, no hagas REST calls, no subas imágenes. Solo responde brevemente en el topic: `📥 Recibida parte 1, esperando la parte 2.`
3. **Cuando llegue el siguiente mensaje** (sin prefijo `mañanera:`, solo el resto del contenido), **concatena** con el primero (en orden de llegada) y procesa el resumen completo como una sola unidad.
4. Si pasan más de 5 minutos sin que llegue la segunda parte y Samuel manda otro mensaje no relacionado, pregúntale si quiere descartar la parte 1.

Si por error procesas la parte 1 sola, vas a crear un draft incompleto + subir foto + crear tags innecesariamente; eso desperdicia tiempo y deja basura en WP. Mejor esperar.

La **fecha no se manda explícita** — el bot la extrae del header del mensaje. El cuerpo típico tiene una línea como `*Monday, June 8, 2026*` o `*MORNING PRESIDENTIAL PRESS CONFERENCE*` seguida de la fecha. Parsea esa fecha y úsala para el title + slug. Si NO encuentras fecha en el cuerpo, usa **el día anterior a hoy** (las mañaneras se publican al día siguiente) y avísale a Samuel en el card por si necesita corregir.

## Parsing del WhatsApp

El mensaje suele venir con un bloque español arriba, branding de Morena en medio, y la versión inglesa abajo. Solo nos importa lo de inglés.

1. **Localiza el cuerpo útil**: corta TODO lo que vive ENTRE el marcador `SUMMARY` (en mayúsculas, generalmente como `*SUMMARY*`) y el marcador `Department of Communications` (footer de Morena). Eso es el material crudo.
2. **Identifica las secciones**:
   - Cada sección tiene un **header de una sola línea** (suele venir como `*Topic: Subtitle*` con asteriscos de WhatsApp; si los asteriscos se cayeron en el transporte, detecta header como línea corta < 100 chars que NO termina con punto y va seguida de un párrafo más largo).
   - Cada header es seguido de uno o más párrafos.
3. **Cada header → `<h2>`. Cada párrafo → `<p>`**.
4. **NO traduzcas el contenido** — viene ya en inglés. Solo limpias formato.
5. **NO copies negritas** dentro de los párrafos. Las negritas del WhatsApp son solo para los headers y los headers ya se vuelven h2.

## Construcción del post

### Title
`People's Mañanera <Month> <Day>` (e.g. `People's Mañanera June 8`).

### Slug
`peoples-mananera-<month-lowercase>-<day>` (e.g. `peoples-mananera-june-8`). Si ya existe ese slug en WP, agrega `-2` (luego `-3`, etc.).

### article.html (body) — orden EXACTO:

**REGLA DURA — NO EMBEBER LA FEATURED EN EL BODY**: en modo mañanera la foto va **SOLO** al campo `featured_media` del payload REST (aparece en el sidebar "Featured Image" de WP). **NO** la agregues como `<figure>` al inicio del article.html — eso duplica la imagen en el post publicado (una vez arriba, una vez en el body). Corrección respecto a `translate:` normal: allá la featured SÍ va también embebida; acá NO.

1. **Attribution paragraph** (italic, fijo verbatim, como PRIMER bloque):
   ```html
   <!-- wp:paragraph -->
   <p><em>Every day, President Claudia Sheinbaum gives a morning presidential press conference and Mexico Solidarity Media posts English language summaries, translated by Mexico Solidarity's Pedro Gellert. Previous press conference summaries are available <a href="https://mexicosolidarity.com/mananera/">here</a>.</em></p>
   <!-- /wp:paragraph -->
   ```
2. **Secciones**: Pedro NO usa `<h2>` reales. Cada sección es un bloque de paragraph con el título en bold inline + `<br>` + body en la misma `<p>`. Formato exacto:
   ```html
   <!-- wp:paragraph -->
   <p><strong><Header text><br></strong><Body paragraph text></p>
   <!-- /wp:paragraph -->
   ```
   Si una sección tiene MÚLTIPLES párrafos, el primero lleva el bold-header como arriba, y los siguientes son `<p>Body</p>` planos (sin bold) en su propio bloque `wp:paragraph`:
   ```html
   <!-- wp:paragraph -->
   <p><strong><Header><br></strong><Body párrafo 1></p>
   <!-- /wp:paragraph -->

   <!-- wp:paragraph -->
   <p><Body párrafo 2></p>
   <!-- /wp:paragraph -->
   ```
3. **YouTube embed al final**: si el mensaje del WhatsApp incluye el URL del video de la mañanera (suele venir como `*VIDEO – MAÑANERA DE HOY: https://www.youtube.com/watch?v=...*` cerca del header), agrégalo como último bloque del post con Gutenberg embed:
   ```html
   <!-- wp:embed {"url":"https://www.youtube.com/watch?v=<VIDEO_ID>","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->
   <figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">
   https://www.youtube.com/watch?v=<VIDEO_ID>
   </div></figure>
   <!-- /wp:embed -->
   ```
   Si no encuentras URL de YouTube en el mensaje, omite el embed sin warning (no es crítico).
4. **Separator** después del embed:
   ```html
   <!-- wp:separator {"style":{"spacing":{"margin":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80"}}}} -->
   <hr class="wp-block-separator has-alpha-channel-opacity" style="margin-top:var(--wp--preset--spacing--80);margin-bottom:var(--wp--preset--spacing--80)"/>
   <!-- /wp:separator -->
   ```
5. **Kadence Posts block** como bloque final del post — siempre 3 most recent. Es el "1g. Posts" del MSM Posting Guide ("leave as is, so the three most recent posts appear"):
   ```html
   <!-- wp:kadence/posts {"uniqueID":"REPLACE_WITH_FRESH_ID","postsToShow":3,"imageSize":"large","author":false,"readmore":false,"titleFont":[{"level":4,"size":["","",""],"sizeType":"px","lineHeight":["","",""],"lineType":"px","letterSpacing":["","",""],"letterType":"px","textTransform":""}]} /-->
   ```
   `uniqueID`: usa un id aleatorio nuevo cada vez tipo `<postId>_<6-char-hex>-<2-digit>` (Kadence solo lo usa para track interno; lo único crítico es que NO se repita entre posts). Si no sabes el postId aún, usa `0_<6-char>-01`.
6. Sin footer adicional. NO incluyas "Department of Communications" ni branding de Morena.

### meta.json

```json
{
  "slug": "peoples-mananera-june-8",
  "translated_title": "People's Mañanera June 8",
  "original_title": "Mañanera del Pueblo · Lunes 8 de junio 2026",
  "author": "Pedro Gellert",
  "original_date": "2026-06-08",
  "translated_date": "<today>",
  "outlet": "Mexico Solidarity Media",
  "original_url": "<URL del YouTube si está en el mensaje, si no omite>",
  "suggested_category": "Mañanera",
  "suggested_tags": ["#Sheinbaum", "#Mañanera", "<+ tags temáticos según los h2: e.g. #World Cup, #Public Education, #ISSSTE, #Sovereignty>"],
  "meta_description": "<auto-excerpt, ver abajo>",
  "focus_keyphrase": "Claudia Sheinbaum press conference",
  "social_image": <null si no hay featured, sino {id, source_url} de -sm>,
  "image_count": <0 o 1>,
  "image_warnings": [],
  "status": "pending",
  "mode": "mananera"
}
```

### Auto-excerpt (meta_description)

Patrón fijo:
> `President Sheinbaum's daily press conference, with comments on <topic1>, <topic2>, …, and <topicN>.`

Para cada h2, extrae el "topic" — lo que va ANTES del primer `:` del header. E.g.:
- `2026 World Cup: More Opportunities for Children` → `the 2026 World Cup`
- `Teachers: More Rights, Better Salaries, and Ongoing Dialogue` → `teachers' rights`
- `ISSSTE: Better Healthcare and Decent Pensions` → `ISSSTE`
- `More Investment to Drive Growth` (sin colon) → `more investment`
- `Coahuila: Follow the Legal Path` → `Coahuila`
- `Sovereignty and Defense of the Transformation` (sin colon) → `sovereignty`

Junta con comas, "and" antes del último. Empieza la oración SIEMPRE con `President Sheinbaum's daily press conference, with comments on …`. Termina con punto.

## Featured image — auto-fetch desde presidencia.gob.mx

**FUENTE ÚNICA Y OBLIGATORIA (actualizada 2026-07-03)**:
```
https://www.gob.mx/presidencia/es/archivo/articulos
```

**NO uses** las galerías (`/galerias`, `/multimedia/galerias`) — dan fotos comprimidas de menor resolución. **NO uses** el archivo público general de `gob.mx`. **NO uses** thumbnails de la portada de presidencia. **Solo** este URL exacto de índice de artículos, filtrado por fecha.

### Por qué esta URL específicamente

Cada mañanera tiene su propio artículo con foto hero al full-size original (típicamente **2500-3200 px de ancho**, calidad JPEG alta). El `og:image` del artículo apunta a esa foto sin procesar. Otras fuentes de gob.mx tienen las mismas fotos pero downsized a ~1200 wide.

### Pasos EXACTOS

1. **Construye la URL de índice** filtrada por la fecha del title del post (NO la de hoy):
   ```
   https://www.gob.mx/presidencia/es/archivo/articulos?filter_year=<YYYY>&filter_month=<MM>&filter_day=<DD>
   ```
   Ejemplo: mañanera del 3 de julio 2026 → `?filter_year=2026&filter_month=07&filter_day=03`

2. **Fetch el índice.** Si el HTML directo devuelve poca info (SPA), usa `~/scripts/inbox/fetch_browser.py` para renderizar con Playwright.

3. **Encuentra el artículo del día**. Busca un link a un artículo cuyo título matchee alguno de estos patrones (case-insensitive):
   - `Conferencia de prensa matutina`
   - `Conferencia matutina`
   - `Mañanera del pueblo`
   - Presentaciones/informes del día que Sheinbaum dio en la conferencia

   Si hay varios artículos del mismo día (a veces publican un resumen + presentaciones específicas), **prefiere el que diga "Conferencia de prensa matutina"** — ese trae la foto general de la conferencia.

4. **Fetch el artículo del día.** En el `<head>`, extrae `<meta property="og:image" content="...">`. Ese URL apunta al JPG original.

5. **Descarga la foto** desde el URL de `og:image`. Espera algo tipo `https://www.gob.mx/cms/uploads/image/file/XXXXXXX/2026-07-03_Conferencia_de_prensa_matutina__Palacio_Nacional_XX_CRM.jpg` a 2500-3200 wide.

6. **Sube DOS versiones** siguiendo step 5a-bis del protocolo principal, con esta excepción de mañanera:
   - **NO upscale, NO treat_featured**: la foto ya es alta-res original. Solo re-save `-large` a quality 92 progressive.
   - `-sm`: downscale Lanczos a 1400 wide, q88.

7. **Fallback** si no encontraste el artículo del día:
   - Deja el draft SIN featured image
   - Agrega al card: `🖼️ No featured — presidencia.gob.mx no había publicado el artículo del <fecha> al momento del draft. Manda una foto o súbela manual.`
   - **NO uses fallback a galerías** — mejor sin featured que con foto de peor calidad

8. **Override**: si Samuel manda foto adjunta con el mensaje, usa esa (skip todo lo demás).

9. **Socials image (default, no requiere pedirlo)**: sobre una copia de la featured CLEAN corre `headline_overlay.py` con los defaults aprobados de la sección 5a-quinquies y **mándala por Telegram como `sendDocument`** al DM de Samuel (`chat_id: 6855761084`). Título del headline overlay = el `title` inglés del post (ej. `People's Mañanera July 3`). Caption del documento: `📱 Para redes — <slug o fecha>`. Si no hubo featured (step 7 fallback), omite este paso y reporta en el card.

## Sin manifest, sin viewer, sin push de carpeta

A diferencia de las traducciones de noticias, las mañaneras **NO se guardan en `htmls/translations/<slug>/`**. No se suben al repo, no se actualizan en `manifest.json`, no se ven en `viewer.html`. El único output es el **draft directo en WordPress**, igual que el step 10b del protocolo principal pero con la estructura mañanera.

## Draft creation (REST, obligatorio en este modo)

A diferencia del flujo de news translations donde `draft` es opt-in, **en mañanera mode el draft es la salida principal** (no hay otro destino). Sigue las mismas reglas REST de step 10b:

- `POST {WP_SITE}/wp-json/wp/v2/posts` con `status: "draft"`.
- `title`, `slug`, `content` (el HTML construido arriba), `excerpt` = meta_description.
- `featured_media`: id de `-large.jpg` si lo hay; si NO hubo featured (caso "fotos no disponibles"), omite el campo.
- `categories: [157]`. **EXACTAMENTE UNA categoría — id 157 (Mañanera, slug `mananera`)**. NUNCA agregues otras (ni News Briefs, ni Uncategorized id 1, ni nada más). El array tiene UN solo entry. Si por alguna razón el lookup falla, hardcode el 157 — está fijo, lo verifiqué contra el sitio.
- `tags`: ids de los tags sugeridos (créalos si no existen).
- `comment_status: "closed"`, `ping_status: "open"`.
- Yoast meta (si funciona en el sitio): `_yoast_wpseo_metadesc`, `_yoast_wpseo_focuskw`.
- **Author**: deja como user actual de la API. Recordatorio al final del card: `👤 Set Guest Author: Pedro Gellert` (siempre Pedro para mañaneras).

## Card de respuesta en Telegram

Posteo único en el topic, mismo formato que el de news translations pero adaptado:

```
🌅 <b>People's Mañanera <Month Day></b>
<URL del YouTube si la había>

📝 <a href="{WP_SITE}/wp-admin/post.php?post=<id>&action=edit">Open draft in WordPress editor</a>

✅ Featured set · ✅ Category Mañaneras · ✅ Tags · ✅ Excerpt
👤 Set Guest Author: Pedro Gellert
📱 Socials: sent to DM as sendDocument
<si no había featured: 🖼️ No featured — presidencia.gob.mx sin fotos aún del <date> · 📱 Socials: skipped>
```

Si hubo error en algún sub-step (REST falla, parser no encuentra secciones, etc.), reporta específico y NO bloquees el resto.

## Refinement en mañanera mode

Reply al card del bot:
- "agrega tag X" → edita el draft via PUT /posts/<id>, agrega el tag.
- "cambia el título a X" → idem, actualiza `title`.
- "usa esta foto" + imagen adjunta → sube como featured (dual-size), update featured_media en el post.
- "borra el draft" → `DELETE /posts/<id>?force=true` (solo si Samuel lo pide explícitamente).

Reply siempre breve: `✅ <breve descripción>`.

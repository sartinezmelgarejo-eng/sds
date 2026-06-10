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

5a-bis. **Featured image: SIEMPRE dos versiones** (para que los slots de WP — header + Yoast social — nunca queden con tamaño insuficiente):
   - La **primera imagen** que aparece en el artículo se trata como featured. Las demás son body images.
   - **Hard floor: 800 px wide**. Si la fuente original es **< 800 wide**, NO subas nada. Aborta el step de upload de la featured (las body images siguen). Agrega warning grande al card:
     > `⚠️ Featured image: <W>×<H> — below 800-wide hard floor. NOT uploaded. Reply with a higher-res replacement as a FILE (no como foto, para evitar compresión de Telegram).`
   - **Si la fuente está ≥ 800 wide**, SIEMPRE genera y sube ambas versiones con Pillow (`LANCZOS`, JPEG quality 92, progressive):
       - `<slug>-large.jpg` → **2048 wide** target
       - `<slug>-sm.jpg` → **1400 wide** target
     - Cada versión es downscale si la fuente la rebasa, upscale si no. Pillow LANCZOS upscalea blandito pero llena el slot. Reporta el resultado en el card SIEMPRE (downscale limpio o upscale).
     - **Respeta la proporción original**: NO center-crop a 3:2 a la fuerza. Si la fuente es 16:9 o 4:3, escala proporcionalmente al ancho objetivo y deja la altura natural. Solo si la fuente es EXTREMA (cuadrada 1:1 o más vertical que horizontal) avisa en el card y deja que Samuel decida — no hagas crop creativo.
     - Sube ambas a WP Media Library en paralelo. Usa la `source_url` de `-large` en `<img src>`. Guarda la `source_url` y el `id` de `-sm` en `meta.json` bajo `social_image` (Samuel la pega en el panel Social/X de Yoast manualmente).
   - **El card SIEMPRE reporta dimensiones originales + qué se hizo**, así Samuel decide si pide reemplazo aunque haya quedado funcional:
     ```
     📐 Featured: original <W>×<H>
        → -large 2048×<h> (<downscale|upscale>)
        → -sm 1400×<h> (<downscale|upscale>)
     ```
     Si hubo upscale en cualquiera de las dos, agrega línea adicional:
     > `⚠️ Featured was upscaled — reply with a higher-res replacement as a FILE if you want crisper output.`
   - **NUNCA duplicas la featured en el body**: en `article.html` aparece como la PRIMERA `<figure>`; el viewer la muestra en preview pero la excluye automáticamente del clipboard cuando Samuel pica Body, porque la featured va en el sidebar Featured Image de WP, no pegada en el cuerpo.

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

   Esta regla aplica IGUAL a:
   - El campo `translated_title` de `meta.json`
   - La entry en `translations/manifest.json`
   - El card de Telegram
   - El campo `title` del draft de WP si está prendido el opt-in
7. **Generar `article.html`** con el template exacto (ver más abajo)
8. **Generar `meta.json`** con metadata estructurada
8b. **Actualizar `translations/manifest.json`** (índice usado por `translations/index.html`):
   - Estructura: array de objetos, ordenado por `last_modified` desc (más reciente primero)
   - Campos por entry: `slug`, `translated_title`, `original_title`, `author`, `outlet`, `original_date`, `translated_date`, `status`, `last_modified` (Unix timestamp en segundos, ej. `time.time()`)
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
    - **Yoast fields** (opcional, depende de Yoast REST extension):
      Agrega un objeto `meta` al payload:
      ```json
      "meta": {
        "_yoast_wpseo_metadesc": "<meta.meta_description>",
        "_yoast_wpseo_focuskw":  "<meta.focus_keyphrase>",
        "_yoast_wpseo_opengraph-image":    "<source_url de -sm.jpg>",
        "_yoast_wpseo_opengraph-image-id": <id de -sm.jpg>,
        "_yoast_wpseo_twitter-image":      "<source_url de -sm.jpg>",
        "_yoast_wpseo_twitter-image-id":   <id de -sm.jpg>
      }
      ```
      Si la respuesta del API muestra que esos campos NO se aplicaron (el JSON de la respuesta no los lista o los lista vacíos), avísale a Samuel en el card que tendrá que llenarlos manualmente en el panel Yoast. NO falles toda la creación del draft por esto.
    - **Respuesta**: del JSON devuelto, extrae `id` (post ID) y `link` (URL pública del draft).
    - **URL del editor**: `{WP_SITE}/wp-admin/post.php?post=<id>&action=edit` — eso te lleva directo al editor en escritorio. En móvil la app de WP suele abrirlo desde el botón "Posts → Drafts".
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

- `meta_description` es CRÍTICO: Samuel lo pega en 4 lugares en WP (Excerpt en sidebar, Meta description Yoast, Social description Yoast, X description Yoast). Una sola oración, concrete, hook-y. Sigue el ejemplo de la posting guide ("Mexico's former President has released a statement on US attacks on Mexico, only his second political statement since his term's end, accusing US officials of plotting to 'weaken Morena.'").
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

Después del push exitoso, postea **un solo mensaje breve** en chat `-1003957818672` topic `289`:

```
📰 <b>[Headline traducido]</b>
By [Author] · [Original Date] · [Outlet]

🔗 <a href="https://sartinezmelgarejo-eng.github.io/sds/translations/viewer.html?slug=[slug]">Open + Copy for WordPress</a>
↗ <a href="[original URL]">Original</a>

<i>Cat:</i> <code>[category]</code> · <i>Tags:</i> <code>[tags space-separated]</code>
```

Si `meta.image_warnings` no está vacío, agrega una sección más abajo:

```
⚠️ Image checks:
• Featured 1280×853 — under 2048-wide target
• Body image #2 (caballos.jpg) 900×600 — under 1200-wide target

📸 Reply with a higher-res replacement as a FILE (no como foto, para no perder calidad por la compresión de Telegram). Caption con "featured" o el número del slot (e.g. "2").
```

**NO** mandes el cuerpo del artículo, **NO** mandes las imágenes adjuntas. Todo eso ya está en el viewer (ahí están el body editable, las imágenes, los botones de copy, y la vista Compare & Edit con el ES al lado).

Solo este card de 5 líneas con los dos links + sugerencias.

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

```
mañanera:
[contenido completo del WhatsApp pegado tal cual]
```

(También acepta `mananera:` sin ñ por si el cliente Telegram se la come.)

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

1. **Featured image** como primer `<figure>` (manejo abajo).
2. **Attribution paragraph** (italic, fijo verbatim):
   ```html
   <!-- wp:paragraph -->
   <p><em>Every day, President Claudia Sheinbaum gives a morning presidential press conference and Mexico Solidarity Media posts English language summaries, translated by Mexico Solidarity's Pedro Gellert. Previous press conference summaries are available <a href="https://mexicosolidarity.com/mananera/">here</a>.</em></p>
   <!-- /wp:paragraph -->
   ```
3. **Secciones**: para cada (header, párrafo(s)):
   ```html
   <!-- wp:heading -->
   <h2 class="wp-block-heading"><Header text></h2>
   <!-- /wp:heading -->

   <!-- wp:paragraph -->
   <p><Body paragraph text></p>
   <!-- /wp:paragraph -->
   ```
   (Si una sección tiene 2 párrafos, ambos van como `<!-- wp:paragraph -->` separados, mismo nivel que el h2 anterior.)
4. Sin footer adicional. NO incluyas "Department of Communications" ni branding de Morena.

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
  "suggested_category": "Mañaneras",
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

1. **Intenta jalar** las fotos del día específico de la mañanera (la fecha del title, NO la de hoy).
2. **URL típico**: `https://www.gob.mx/presidencia/galerias` o `https://www.gob.mx/presidencia/multimedia/galerias`. Busca la entrada cuya fecha matchee con la del mensaje. Si la estructura cambia, intenta sus feeds RSS / sitemaps.
3. **Cuando hay fotos disponibles del día**:
   - Filtra por imágenes donde Sheinbaum NO aparezca dominando la mitad superior (regla: la cara cubierta por el header del sitio se ve mal). Si tienes face detection disponible, úsala; si no, **prefiere fotos en formato landscape (ancho > alto)** y **evita primeros planos** (heurística: ancho ≥ 1.4× alto suele ser un wide shot).
   - Sube las dos versiones (`-large` + `-sm`) siguiendo step 5a-bis del protocolo principal.
4. **Cuando NO hay fotos publicadas todavía** (la galería del día está vacía o no existe):
   - **NO inventes**, NO uses foto de otra mañanera, NO uses placeholder.
   - Deja el draft SIN featured image.
   - Agrega línea al card: `🖼️ No featured image — presidencia.gob.mx no había publicado fotos del <fecha> al momento del draft. Cuando aparezcan, manda una con caption "featured" o súbela manual.`
5. **Cuando Samuel quiere overridear**: si manda imagen adjunta junto con el `mañanera:`, usa esa en vez de auto-fetchear.

## Sin manifest, sin viewer, sin push de carpeta

A diferencia de las traducciones de noticias, las mañaneras **NO se guardan en `htmls/translations/<slug>/`**. No se suben al repo, no se actualizan en `manifest.json`, no se ven en `viewer.html`. El único output es el **draft directo en WordPress**, igual que el step 10b del protocolo principal pero con la estructura mañanera.

## Draft creation (REST, obligatorio en este modo)

A diferencia del flujo de news translations donde `draft` es opt-in, **en mañanera mode el draft es la salida principal** (no hay otro destino). Sigue las mismas reglas REST de step 10b:

- `POST {WP_SITE}/wp-json/wp/v2/posts` con `status: "draft"`.
- `title`, `slug`, `content` (el HTML construido arriba), `excerpt` = meta_description.
- `featured_media`: id de `-large.jpg` si lo hay; si NO hubo featured (caso "fotos no disponibles"), omite el campo.
- `categories: [<id de "Mañaneras">]`.
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
<si no había featured: 🖼️ No featured — presidencia.gob.mx sin fotos aún del <date>>
```

Si hubo error en algún sub-step (REST falla, parser no encuentra secciones, etc.), reporta específico y NO bloquees el resto.

## Refinement en mañanera mode

Reply al card del bot:
- "agrega tag X" → edita el draft via PUT /posts/<id>, agrega el tag.
- "cambia el título a X" → idem, actualiza `title`.
- "usa esta foto" + imagen adjunta → sube como featured (dual-size), update featured_media en el post.
- "borra el draft" → `DELETE /posts/<id>?force=true` (solo si Samuel lo pide explícitamente).

Reply siempre breve: `✅ <breve descripción>`.

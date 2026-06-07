# WordPress Blocks — HTML Reference for Translations

Este documento cubre la serialización HTML correcta para los bloques de WordPress (core Gutenberg + Kadence Blocks) que aplican a artículos de noticias en mexicosolidarity.com.

**Regla general**: SIEMPRE envolver cada bloque con sus delimitadores HTML comment (`<!-- wp:X -->` ... `<!-- /wp:X -->`), incluso para paragraph/heading/quote. Sin delimitadores, la app móvil de WordPress pega todo como un solo "Classic block" que no soporta — Samuel tendría que hacer "Convert to Blocks" cada vez. Con delimitadores: bloques nativos al instante, desktop y móvil. Las clases CSS (`wp-block-X`) van en los elementos HTML interiores donde aplique.

---

## 📝 BLOCKS DE TEXTO (los que más usarás)

### Paragraph
```html
<!-- wp:paragraph -->
<p>Texto del párrafo.</p>
<!-- /wp:paragraph -->
```

### Heading (h1-h6, usamos h2/h3)
```html
<!-- wp:heading -->
<h2 class="wp-block-heading">Subtítulo</h2>
<!-- /wp:heading -->

<!-- wp:heading {"level":3} -->
<h3 class="wp-block-heading">Sub-subtítulo</h3>
<!-- /wp:heading -->
```

### Quote (cita destacada, indentada)
```html
<!-- wp:quote -->
<blockquote class="wp-block-quote">
  <p>Texto de la cita.</p>
  <cite>— Autor opcional</cite>
</blockquote>
<!-- /wp:quote -->
```

### Pullquote (cita BIG, dramática, full-width)
```html
<!-- wp:pullquote -->
<figure class="wp-block-pullquote">
  <blockquote>
    <p>Cita súper destacada de gran tamaño.</p>
    <cite>Autor</cite>
  </blockquote>
</figure>
<!-- /wp:pullquote -->
```
**Diferencia con Quote**: Pullquote es visualmente mucho más grande, centrado, con bordes arriba/abajo. Para frase memorable que merece interrumpir la lectura.

### List (ul/ol)
```html
<!-- wp:list -->
<ul class="wp-block-list">
  <li>Primer punto</li>
  <li>Segundo punto</li>
</ul>
<!-- /wp:list -->

<!-- wp:list {"ordered":true} -->
<ol class="wp-block-list">
  <li>Paso uno</li>
  <li>Paso dos</li>
</ol>
<!-- /wp:list -->
```

### Table
```html
<!-- wp:table -->
<figure class="wp-block-table">
  <table>
    <thead>
      <tr><th>Header A</th><th>Header B</th></tr>
    </thead>
    <tbody>
      <tr><td>Cell 1</td><td>Cell 2</td></tr>
    </tbody>
  </table>
</figure>
<!-- /wp:table -->
```

### Details (collapsible)
```html
<!-- wp:details -->
<details class="wp-block-details">
  <summary>Click to expand</summary>
  <!-- wp:paragraph --><p>Hidden content here.</p><!-- /wp:paragraph -->
</details>
<!-- /wp:details -->
```

### Code / Preformatted (raro en news)
```html
<!-- wp:code -->
<pre class="wp-block-code"><code>code snippet</code></pre>
<!-- /wp:code -->

<!-- wp:preformatted -->
<pre class="wp-block-preformatted">ASCII art or fixed-width text</pre>
<!-- /wp:preformatted -->
```

### Separator (línea horizontal)
```html
<!-- wp:separator -->
<hr class="wp-block-separator has-alpha-channel-opacity"/>
<!-- /wp:separator -->
```

### Spacer
```html
<!-- wp:spacer -->
<div style="height:40px" aria-hidden="true" class="wp-block-spacer"></div>
<!-- /wp:spacer -->
```

---

## 🖼 BLOCKS DE MEDIA

### Image (single image with caption)

**Ideal**: incluir el `id` de Media Library (devuelto por la API al subir) en el delimitador. Esto enlaza la imagen del artículo con su entrada en Media Library.

```html
<!-- wp:image {"id":16325,"sizeSlug":"large"} -->
<figure class="wp-block-image size-large"><img src="https://mexicosolidarity.com/wp-content/uploads/2026/05/foto.jpg" alt="descripción" class="wp-image-16325"/><figcaption class="wp-element-caption">Photo: Author Name</figcaption></figure>
<!-- /wp:image -->
```

Si no tienes el `id` (raro), basta con `<!-- wp:image -->` sin atributos.

### Gallery (grid de imágenes)
```html
<!-- wp:gallery {"columns":3,"linkTo":"none"} -->
<figure class="wp-block-gallery has-nested-images columns-3 is-cropped">
  <!-- wp:image {"id":101} --><figure class="wp-block-image"><img src=".../1.jpg" alt=""/><figcaption>Caption 1</figcaption></figure><!-- /wp:image -->
  <!-- wp:image {"id":102} --><figure class="wp-block-image"><img src=".../2.jpg" alt=""/><figcaption>Caption 2</figcaption></figure><!-- /wp:image -->
  <!-- wp:image {"id":103} --><figure class="wp-block-image"><img src=".../3.jpg" alt=""/><figcaption>Caption 3</figcaption></figure><!-- /wp:image -->
</figure>
<!-- /wp:gallery -->
```
`columns-N`: número de columnas (2, 3, 4). `is-cropped`: recorta para igualar alturas.

### Media & Text (imagen + texto lado a lado)
```html
<!-- wp:media-text {"mediaId":16325,"mediaType":"image"} -->
<div class="wp-block-media-text alignwide is-stacked-on-mobile">
  <figure class="wp-block-media-text__media"><img src=".../img.jpg" alt="" class="wp-image-16325"/></figure>
  <div class="wp-block-media-text__content">
    <!-- wp:paragraph --><p>Texto a la derecha de la imagen.</p><!-- /wp:paragraph -->
  </div>
</div>
<!-- /wp:media-text -->
```
Para invertir orden: agrega `"mediaPosition":"right"` al JSON y `has-media-on-the-right` a la clase.

### Cover (imagen con texto encima, hero style)
```html
<!-- wp:cover {"url":".../bg.jpg","id":16325} -->
<div class="wp-block-cover">
  <img class="wp-block-cover__image-background wp-image-16325" src=".../bg.jpg" alt=""/>
  <div class="wp-block-cover__inner-container">
    <!-- wp:paragraph {"align":"center","fontSize":"large"} --><p class="has-text-align-center has-large-font-size">Texto sobre la imagen</p><!-- /wp:paragraph -->
  </div>
</div>
<!-- /wp:cover -->
```

### Video / Audio / File (poco usados en news)
```html
<!-- wp:video --><figure class="wp-block-video"><video controls src=".../v.mp4"></video></figure><!-- /wp:video -->
<!-- wp:audio --><figure class="wp-block-audio"><audio controls src=".../a.mp3"></audio></figure><!-- /wp:audio -->
<!-- wp:file --><div class="wp-block-file"><a href=".../doc.pdf">documento.pdf</a></div><!-- /wp:file -->
```

---

## 🎨 BLOCKS DE LAYOUT

### Columns (2 o 3 columnas)
```html
<!-- wp:columns -->
<div class="wp-block-columns">
  <!-- wp:column -->
  <div class="wp-block-column">
    <!-- wp:paragraph --><p>Columna izquierda.</p><!-- /wp:paragraph -->
  </div>
  <!-- /wp:column -->
  <!-- wp:column -->
  <div class="wp-block-column">
    <!-- wp:paragraph --><p>Columna derecha.</p><!-- /wp:paragraph -->
  </div>
  <!-- /wp:column -->
</div>
<!-- /wp:columns -->
```

### Group (wrap con background)
```html
<!-- wp:group {"backgroundColor":"#f5f1ea"} -->
<div class="wp-block-group has-background" style="background-color:#f5f1ea;padding:24px">
  <!-- wp:paragraph --><p>Contenido agrupado con fondo.</p><!-- /wp:paragraph -->
</div>
<!-- /wp:group -->
```

### Buttons (CTAs)
```html
<!-- wp:buttons -->
<div class="wp-block-buttons">
  <!-- wp:button -->
  <div class="wp-block-button"><a class="wp-block-button__link wp-element-button" href="https://...">Read More</a></div>
  <!-- /wp:button -->
</div>
<!-- /wp:buttons -->
```

---

## 🔗 EMBEDS (videos, tweets, etc)

Gutenberg auto-detecta URLs, pero el embed se serializa con delimitador específico por proveedor:

```html
<!-- wp:embed {"url":"https://www.youtube.com/watch?v=ABC123","type":"video","providerNameSlug":"youtube"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube">
  <div class="wp-block-embed__wrapper">https://www.youtube.com/watch?v=ABC123</div>
</figure>
<!-- /wp:embed -->
```

Para Twitter/X:
```html
<!-- wp:embed {"url":"https://x.com/user/status/123","type":"rich","providerNameSlug":"twitter"} -->
<figure class="wp-block-embed is-type-rich is-provider-twitter wp-block-embed-twitter">
  <div class="wp-block-embed__wrapper">https://x.com/user/status/123</div>
</figure>
<!-- /wp:embed -->
```

Plataformas auto-detectadas: YouTube, X/Twitter, Vimeo, TikTok, Instagram, SoundCloud, Spotify, Reddit, Bluesky, TED, WordPress.tv, etc.

---

## 🟢 KADENCE BLOCKS (plugin instalado en mexicosolidarity.com)

Cuando un layout core de Gutenberg no alcanza, Kadence ofrece versiones más flexibles. Estos son los más útiles para news:

### Kadence Row Layout (multi-column con más control que Columns core)
```html
<div class="wp-block-kadence-rowlayout alignfull">
  <div class="kt-row-layout-inner kt-row-has-2-columns kt-row-valign-top kt-row-align-default">
    <div class="wp-block-kadence-column"><div class="kt-inside-inner-col">
      <p>Columna 1</p>
    </div></div>
    <div class="wp-block-kadence-column"><div class="kt-inside-inner-col">
      <p>Columna 2</p>
    </div></div>
  </div>
</div>
```

### Kadence Info Box (callout destacado con icono opcional)
```html
<div class="wp-block-kadence-infobox kt-info-box-link-type-button">
  <div class="kt-blocks-info-box-link-wrap">
    <div class="kt-info-box-text-wrap">
      <h3 class="kt-blocks-info-box-title">Título destacado</h3>
      <p class="kt-blocks-info-box-text">Texto del callout, ej. dato impactante.</p>
    </div>
  </div>
</div>
```

### Kadence Icon List (lista con iconos personalizables)
```html
<ul class="wp-block-kadence-iconlist kt-svg-icon-list-items">
  <li class="wp-block-kadence-listitem"><span class="kt-svg-icon">▸</span><span>Item 1</span></li>
  <li class="wp-block-kadence-listitem"><span class="kt-svg-icon">▸</span><span>Item 2</span></li>
</ul>
```

### Kadence Testimonial (cita con foto del autor)
```html
<div class="wp-block-kadence-testimonials">
  <div class="kt-blocks-testimonial-item-wrap">
    <div class="kt-testimonial-image-wrap">
      <img src=".../author.jpg" alt="Author">
    </div>
    <p class="kt-testimonial-content">"Quote text."</p>
    <div class="kt-testimonial-meta-wrap">
      <span class="kt-testimonial-name">Author Name</span>
      <span class="kt-testimonial-occupation">Author Title</span>
    </div>
  </div>
</div>
```

### Kadence Table of Contents (índice auto-generado para artículos largos)
```html
<nav class="wp-block-kadence-tableofcontents"></nav>
```
Auto-genera links de los `<h2>/<h3>` del artículo.

---

## 🎯 CUÁNDO USAR CADA UNO (decisión rápida)

| Caso | Block recomendado |
|------|-------------------|
| Párrafo normal | `<p>` |
| Imagen sola con caption | `wp-block-image` (figure) |
| Cita corta inline | dentro de `<p>` |
| Cita destacada media página | `wp-block-quote` |
| Cita BIG dramática | `wp-block-pullquote` |
| Lista de bullets | `wp-block-list` |
| Lista con visual jerarquía | Kadence Icon List |
| 2 imágenes side-by-side | `wp-block-gallery columns-2` |
| 4+ imágenes en grid | `wp-block-gallery columns-3` o `columns-4` |
| Imagen + texto lado a lado | `wp-block-media-text` |
| Sección con fondo destacado | `wp-block-group` con background |
| Callout / dato resaltado | Kadence Info Box |
| Tabla de datos | `wp-block-table` |
| YouTube/X embed | `wp-block-embed` |
| CTA al final del artículo | `wp-block-buttons` |
| Artículo MUY largo con secciones | h2 subheads + Kadence TOC arriba |
| FAQ-style preguntas/respuestas | `wp-block-details` |

---

## ⚠️ Notas importantes

1. **El tema del sitio sobrescribe la apariencia**. Mi HTML define la *estructura* (bloque + clase), el tema de Kadence aplica color/fuente/tamaño. No metas `style="..."` inline salvo casos extremos.

2. **Si dudas, usa core**: Gutenberg core blocks tienen retrocompatibilidad eterna. Kadence blocks pueden cambiar serialización entre versiones del plugin.

3. **Gutenberg comments son OBLIGATORIOS**: cada bloque debe ir envuelto en `<!-- wp:X -->` ... `<!-- /wp:X -->`. La app móvil de WordPress trata HTML sin delimitadores como un solo "Classic block" que no soporta. Con delimitadores, los bloques se reconocen nativamente en desktop y móvil al instante.

4. **Para featured image**: NO incluyas la primera `<figure>` como Image block — WordPress detecta la primera imagen y la promueve a Featured Image automáticamente. Si quieres que esté en el cuerpo TAMBIÉN, repítela.

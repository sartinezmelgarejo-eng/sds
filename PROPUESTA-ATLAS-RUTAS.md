# Propuesta: rediseño de Atlas (y lo que ya cambió en Rutas)

*29 de julio de 2026 — borrador para decisión de Samuel*

---

## Lo que ya se hizo esta noche (Rutas)

Rutas pasó de lista plana a **recorrido**: arco de épocas en el encabezado (un punto
por parada, coloreado con la era que el libro trata), cada parada es un capítulo con
chip de época, la **tesis** del libro y su **cita firma**, riel continuo con medallones,
y al final "si esta ruta te atrapó, sigue por" con rutas que comparten libros.
Todo con datos que ya existían. Desplegado.

Lo que Rutas todavía podría ganar (no hecho, por decidir):

1. **Progreso de lectura.** Un toggle "ya lo leí" por parada (localStorage), y la ruta
   muestra 3/8. Convierte la ruta de catálogo en plan de lectura.
2. **Duración estimada.** Páginas totales de la ruta (los PDFs ya se conocen) → "unas
   2,400 páginas, ~6 semanas a 60 pp/día". Dato honesto y motivador.
3. **Una cita del timeline por parada** en vez de la quote de ficha cuando exista una
   mejor (hoy usa quotes[0]; se podría elegir la cita más rica del libro en la línea).

---

## Diagnóstico del Atlas

Sorpresa de la auditoría visual: **el detalle de concepto ya es bueno** — línea de
hitos, ensayo con capitular, libros relacionados con citas. El contenido es rico:
61 conceptos, historias de ~1,500 caracteres, hitos fechados, fuentes.

Lo débil es **la puerta de entrada y la conexión con el resto del proyecto**:

| Problema | Detalle |
|---|---|
| La portada es un muro de barras | El Gantt de civilizaciones es correcto pero árido: 40+ barras sin jerarquía, etiquetas diminutas, y no invita a entrar. Es un índice, no un atlas. |
| Los grupos no-cronológicos desaparecen | Sistemas, Ideas, Recursos y México (20 conceptos) no caben en el paradigma de barras temporales y quedan como tarjetas sueltas abajo. |
| "Atlas" sin mapa | El nombre promete geografía y no hay ni un mapa, teniendo 10,887 eventos geocodificados en la línea del tiempo. |
| Cero conexión con el timeline | Cada concepto tiene `keywords` y `periodo`, pero no enlaza a los eventos/citas de su periodo ni a su huella en el mapa. |

## Propuesta A — El Atlas como mapa-portada (recomendada)

La portada del Atlas se convierte en **un mapa del mundo oscuro y elegante** (el mismo
motor de mapa que ya usa la línea del tiempo) con los 61 conceptos como **medallones
posicionados geográficamente**: Olmecas en el Golfo, Mesopotamia en el Tigris, China,
el Imperio Británico… Los conceptos sin geografía (Ideas, Sistemas) viven en una
**franja inferior de "conceptos transversales"**.

- **Zoom semántico:** de lejos se ven 8-10 medallones grandes (los grupos); al acercar
  aparecen los conceptos individuales. Organico y explorable.
- **Filtro temporal:** un slider de época (los mismos cortes del timeline) atenúa los
  conceptos que no existían en ese momento. "¿Qué había en el mundo en 1520?" se
  responde con un gesto.
- **El detalle no cambia** (ya es bueno), pero gana dos módulos:
  - *Su huella en la línea del tiempo:* los eventos cuyo texto/citas casan con los
    `keywords` del concepto, como carrusel de citas premium (el componente ya existe).
  - *Mini-mapa del territorio* usando `territorio` + coords de sus eventos.

Esfuerzo: medio (el mapa ya existe; es posicionar medallones y cablear filtros).
Riesgo de slop: nulo — no se genera texto nuevo.

## Propuesta B — Dossiers NotebookLM por concepto (tu idea, y es buena)

NotebookLM permite **varios libros por cuaderno**. Cada concepto del Atlas ya declara
sus `fuentes` (ej. Olmecas: López Austin, Semo, AMLO). El pipeline sería:

1. Por concepto: crear cuaderno con los PDFs de sus fuentes (2-5 libros).
2. Generar **un solo artefacto por concepto**, eligiendo el formato según el tipo:
   - Civilizaciones/imperios → **infografía** (una imagen, cabe perfecto en el detalle)
   - Ideas/Sistemas → **mapa mental** (JSON navegable, se puede renderizar nativo)
   - México/Recursos → **briefing doc** (markdown corto, citable)
3. El detalle del concepto gana una pestaña "Dossier" con ese artefacto.

Por qué funciona: el detalle ya tiene ensayo *curado a mano* (eso no se toca — es la
voz del proyecto); el dossier es material *complementario y descargable*, claramente
etiquetado como síntesis automática. La separación evita el slop: lo curado manda,
lo generado acompaña.

Coste real: ~61 cuadernos × cuota diaria de Google (ya sabemos que da ~15-20
generaciones/día) → una semana de cola en launchd, cero tokens de Claude.
Límite de 500 cuadernos de la cuenta: vamos ~350, cabe.

**Empezar con 5 pilotos:** Olmecas, Mexicas, Imperio Español, URSS, Neoliberalismo.
Si el resultado convence, se automatiza el resto con el process-queue existente.

## Propuesta C — barata e inmediata (si A parece mucho)

Tres retoques a la portada actual sin cambiar el paradigma:

1. **Tarjetas-héroe por grupo**: en vez de entrar directo al muro de barras, 8 tarjetas
   grandes (América, Eurasia, México, Ideas…) con icono, conteo y un concepto destacado.
   Las barras quedan como segundo nivel al entrar al grupo.
2. **Buscador con resultados ricos**: el buscador global ya indexa conceptos; falta que
   al escribir "olmeca" el Atlas salte directo al detalle.
3. **Los hitos del concepto → eventos del timeline**: cada hito fechado del detalle
   (c. 1500 a.C. San Lorenzo…) enlaza al año correspondiente de la línea del tiempo.

---

## Mi recomendación

**C ahora (una sesión), A como meta (dos-tres sesiones), B en piloto con 5 conceptos.**
C no compite con A: las tarjetas-héroe sobreviven como navegación del mapa.
B corre solo en launchd sin gastar Claude.

Nada de esto toca la línea del tiempo ni el librero, que son lo mejor del proyecto.

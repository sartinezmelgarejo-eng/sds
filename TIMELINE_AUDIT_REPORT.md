# Timeline Audit Report — 2026-07-03 (madrugada)

**Genero:** reporte pre-sesión de mañana. Datos generados en frío del `libreria-mapa.html` actual + PDFs en disco.

---

## 1. Números globales

- **Eventos totales en timeline**: 4,437
- **Citas totales verbatim**: 5,296
- **Libros declarados** en `TL_BOOK_FALLBACKS`: 207
- **Libros con citas** ligadas a eventos: 214
- **Libros que aparecen en citas sin book_entry** (orphans a arreglar): 8
- **Archivos PDF/EPUB en disco**: 227
- **Archivos en disco NO vinculados** a ningún libro: 134

---

## 2. Distribución de eventos por era

| Era | Eventos | Citas |
|-----|---------|-------|
| Civilización Olmeca | 10 | 11 |
| Mundo Antiguo y Mesopotamia | 58 | 46 |
| Olmecas — Cultura Madre | 89 | 86 |
| Teotihuacan, Monte Albán y Preclásico Maya | 83 | 73 |
| Maya Clásico — Esplendor y Colapso | 54 | 54 |
| Toltecas y Posclásico Temprano | 65 | 57 |
| Mexicas — Tenochtitlan y la Triple Alianza | 168 | 156 |
| Conquista y Catástrofe | 303 | 302 |
| Colonia: Plata y Evangelización | 341 | 341 |
| Colonia Tardía y Crisis | 291 | 291 |
| Independencia — Primera Transformación | 336 | 336 |
| Reforma — Segunda Transformación | 375 | 375 |
| Porfiriato y Antesala | 401 | 401 |
| Revolución Mexicana — Tercera Transformación | 700 | 700 |
| Milagro Mexicano y Estado-fuerte | 535 | 535 |
| Crisis del PRI y ajuste estructural | 207 | 207 |
| Neoliberalismo y resistencia | 347 | 347 |
| Cuarta Transformación | 74 | 74 |

**Observaciones:**
- **Revolución Mexicana** (700 eventos) y **Milagro Mexicano** (535) son las eras más densas
- **Civilización Olmeca** (10 eventos) parece ser una era vestigial — probablemente duplicada con **Olmecas — Cultura Madre** (89 eventos). **Revisar y consolidar.**
- **Cuarta Transformación** solo 74 eventos — hueco a llenar
- Prehistoria (Origen del Universo) 10 eventos — está en la primera posición del array pero no en el conteo (verificar)

---

## 3. Top 30 libros por rendimiento

| # | bookId | Título | Citas | Events | Autor |
|---|--------|--------|-------|--------|-------|
| 1 | `grandeza` | Grandeza | 241 | 216 | Andrés Manuel López Obrador |
| 2 | `webereconomia` | Economía y Sociedad | 120 | 111 | Max Weber |
| 3 | `diazcastillo` | Historia verdadera de la conquista | 75 | 45 | Bernal Díaz del Castillo |
| 4 | `taibo68` | 68 | 74 | 54 | Paco Ignacio Taibo II |
| 5 | `semocapitalismo` | Historia del capitalismo en México: los orígenes 1 | 70 | 60 | Enrique Semo |
| 6 | `madero` | La sucesión presidencial en 1910 | 66 | 59 | Francisco I. Madero |
| 7 | `dussel20politica` | 20 Tesis de Política | 57 | 31 | Enrique Dussel |
| 8 | `lascasas` | Brevísima relación de la destrucción de las Indias | 56 | 46 | Bartolomé de las Casas |
| 9 | `semoconquista` | La conquista: catástrofe de los pueblos originario | 56 | 56 | Enrique Semo |
| 10 | `ciudadanfibia` | Ciudad anfibia: México-Tenochtitlan | 55 | 41 | Alfonso Alfaro |
| 11 | `stalinmaterialism` | Historia del PC(b) de la URSS: Curso breve | 55 | 37 | AA.VV. Comisión CC PCUS(b) |
| 12 | `humboldt` | Ensayo político sobre el reino de la Nueva España | 53 | 50 | Alexander von Humboldt |
| 13 | `amlo_mitad` | A la mitad del camino | 51 | 51 | Andrés Manuel López Obrador |
| 14 | `hudson1` | Super Imperialism | 49 | 49 | Michael Hudson |
| 15 | `fidelcienhoras` | Cien horas con Fidel | 48 | 34 | Fidel Castro / Ignacio Ramonet |
| 16 | `sentimientos` | Sentimientos de la Nación | 48 | 37 | José María Morelos |
| 17 | `hochiminh` | Escritos escogidos | 47 | 38 | Ho Chi Minh |
| 18 | `reedmexico` | México insurgente | 47 | 29 | John Reed |
| 19 | `hudsoncanada` | Canada in the New Monetary Order | 46 | 46 | Michael Hudson |
| 20 | `preciousmetals` | Precious Metals in the Later Medieval and Early Mo | 46 | 45 | John F. Richards (ed.) |
| 21 | `duboisreconstruction` | Black Reconstruction in America | 44 | 44 | W.E.B. Du Bois |
| 22 | `chilambalam` | Chilam Balam | 42 | 36 | Anónimo maya |
| 23 | `xijinping` | The Governance of China Vol. I | 42 | 42 | Xi Jinping |
| 24 | `pomeranz` | The Great Divergence | 41 | 41 | Kenneth Pomeranz |
| 25 | `maoquotations` | Quotations from Chairman Mao (Little Red Book) | 40 | 40 | Mao Zedong |
| 26 | `dubois` | Black Reconstruction in America | 39 | 39 | W.E.B. Du Bois |
| 27 | `dussel16economia` | 16 Tesis de Economía Política | 39 | 39 | Enrique Dussel |
| 28 | `taibonoolvida` | Que no se olvide | 38 | 21 | Paco Ignacio Taibo II |
| 29 | `comanche` | (sin entrada) | 37 | 22 | ? ⚠️ |
| 30 | `engelscondition` | La situación de la clase obrera en Inglaterra | 37 | 30 | Friedrich Engels |

**Análisis — por qué estos rinden más:**

- **Grandeza (AMLO, 241 citas)** — tres pases de extracción sucesivos + libro largo con muchos temas mundo/México
- **Weber Economía y Sociedad (120 citas)** — 1272 páginas académicas, extracción paralela en 5 chunks temáticos
- **Díaz del Castillo (75 citas)** — cronista clásico con eventos de conquista muy fechados
- **Taibo 68 (74 citas)** — cronología día por día del movimiento estudiantil, densa por naturaleza
- **Semo Capitalismo (70 citas)** — obra clásica de historia económica mexicana, muy fechada

**Patrón**: libros con muchos eventos discretos y datables (cronologías, memoria testimonial, historia académica clásica) rinden más que ensayo filosófico puro. Dussel y Marx puros rinden menos porque son argumentativos.

---

## 4. Libros de bajo rendimiento (< 8 citas)

| bookId | Título | Citas | Razón probable |
|--------|--------|-------|----------------|
| `grandezabalbuena` | Grandeza mexicana | 0 | poema colonial (Balbuena) — texto que no describe eventos históricos |
| `bonfilpropio` | El pensamiento propio | 2 | libro corto de ensayo, no cronológico |
| `planayala` | Plan de Ayala | 5 | documento único de 1 página (Plan de Zapata) — 1 solo evento por diseño |
| `frontera` | Historias de la frontera | 7 | PDF era sample de 10 páginas, no el libro completo |
| `marxgrundisse` | Grundrisse | 7 | manuscritos filosóficos, poca cronología dura |

---

## 5. Duplicados detectados

**23 pares de eventos con año idéntico Y texto casi idéntico entre eras diferentes** — mayormente en la frontera Mexicas/Conquista y Colonia. Sugiere que hubo dobles inserciones durante los merges.

Sample (primeros 15):

- **1487** — `Mexicas — Tenochtitlan` vs `Conquista y Catástrofe`: *Matanza de musulmanes en Málaga*
- **1511** — `Mexicas — Tenochtitlan` vs `Conquista y Catástrofe`: *Sermón de Antón de Montesinos en La Española*
- **1519** — `Mexicas — Tenochtitlan` vs `Conquista y Catástrofe`: *Tenochtitlan en su mayor esplendor*
- **1521** — `Mexicas — Tenochtitlan` vs `Conquista y Catástrofe`: *Caída de Tenochtitlan*
- **1522** — `Mexicas — Tenochtitlan` vs `Conquista y Catástrofe`: *Cortés confirmado gobernador de Nueva España*
- **1524** — `Mexicas — Tenochtitlan` vs `Conquista y Catástrofe`: *Llegada de los Doce franciscanos*
- **1528-1530** — `Mexicas — Tenochtitlan` vs `Conquista y Catástrofe`: *Primera Audiencia de Nuño de Guzmán*
- **1535** — `Mexicas — Tenochtitlan` vs `Conquista y Catástrofe`: *Antonio de Mendoza, primer virrey*
- **1535** — `Conquista y Catástrofe` vs `Colonia: Plata y Evang`: *Fundación de la Casa de Moneda de México*
- **1536** — `Mexicas — Tenochtitlan` vs `Conquista y Catástrofe`: *Colegio de Santa Cruz de Tlatelolco*
- **1545-1548** — `Mexicas — Tenochtitlan` vs `Conquista y Catástrofe`: *Brutal epidemia diezma la población*
- **1549** — `Mexicas — Tenochtitlan` vs `Conquista y Catástrofe`: *Cabildo indígena de San Juan Tenochtitlan*
- **1555** — `Mexicas — Tenochtitlan` vs `Conquista y Catástrofe`: *Gran inundación de la ciudad de México*
- **1582** — `Mexicas — Tenochtitlan` vs `Conquista y Catástrofe`: *Acueducto de San Miguel a San Juan Moyotlan*
- **1568** — `Conquista y Catástrofe` vs `Colonia: Plata y Evang`: *Junta Magna de Felipe II*

**Acción**: correr un dedup pass que identifique estos duplicados y consolide en la era temporalmente correcta (Conquista 1519-1540, no Mexicas).

---

## 6. Descripciones (detalle) muy largas

Top 10 por longitud del campo `detalle`:

- **607 chars** [Mundo Antiguo y Mesopotam] -605 — *Nabucodonosor II reconstruye Babilonia*
- **592 chars** [Milagro Mexicano y Estado] 1968 — *Masacre de Tlatelolco*
- **586 chars** [Milagro Mexicano y Estado] 1953 — *Programa de las cinco leyes revolucionarias*
- **579 chars** [Mundo Antiguo y Mesopotam] -881 — *Aššurnaṣirpal II edifica Kalḫu con deportados*
- **553 chars** [Mundo Antiguo y Mesopotam] -2100 — *Inscripción de Šu-Suen sobre cautivos de Šimaški*
- **538 chars** [Mundo Antiguo y Mesopotam] -550 — *Ciro II funda el imperio aqueménida*
- **528 chars** [Milagro Mexicano y Estado] 1968 — *Publicación del pliego petitorio del CNH*
- **520 chars** [Milagro Mexicano y Estado] 1968 — *Segunda manifestación del CNH al Zócalo*
- **515 chars** [Mundo Antiguo y Mesopotam] -744 — *Reformas imperiales de Tiglath-pileser III*
- **505 chars** [Cuarta Transformación] 2022 — *México: 408 muertes por sobredosis vs 75 000 en EEUU*

**Regla razonable**: detalles > 400 chars son incómodos de leer en tooltip. Los top-10 exceden 480 chars.

**Acción**: patch para acortarlos o dividirlos en detalle corto + expandible.

---

## 7. Labels de eventos muy largos

Top 10 por longitud del campo `text` (label del evento):

- **118 chars** [Neoliberalismo y resisten] 2014 — *Tesis 6: El capitalismo industrial. Plusvalor relativo, revolución tecnológica, *
- **116 chars** [Neoliberalismo y resisten] 2006 — *Tesis 20: Transformación de la factibilidad, disolución del Estado y unidad lati*
- **115 chars** [Colonia Tardía y Crisis] 1808 — *Últimas décadas coloniales: la Corona vive del crédito eclesiástico canalizado p*
- **114 chars** [Teotihuacan, Monte Albán ] c. 500 a.C. — *Fundación de Monte Albán. Losas de los "danzantes" con las inscripciones calendá*
- **112 chars** [Colonia Tardía y Crisis] 1736 — *El convento de San Jerónimo presta 6 000 pesos a Nicolás Delgado sobre la hacien*
- **109 chars** [Neoliberalismo y resisten] 2006 — *Tesis 8: Las instituciones de la legitimidad democrática y de la factibilidad (C*
- **109 chars** [Neoliberalismo y resisten] 2006 — *Tesis 13: Los principios políticos de liberación y el principio material crítico*
- **108 chars** [Neoliberalismo y resisten] 2014 — *Tesis 11: Rosa Luxemburgo, violencia y guerra como elemento vital del capitalism*
- **106 chars** [Colonia Tardía y Crisis] 1739 — *El Colegio Máximo de San Pedro y San Pablo debe 427 053 pesos, casi la mitad a i*
- **106 chars** [Neoliberalismo y resisten] 2006 — *Tesis 16: Praxis de liberación y construcción de nueva hegemonía (elección de Ev*

**Regla razonable**: label > 80 chars se corta en la UI. Las top 15 son mayormente **Tesis de Dussel** (2006, 2014) donde el label incluye el título completo de la tesis. **Acción**: recortar labels de Dussel a formato `Tesis N: [concepto]` sin texto largo.

---

## 8. Libros huérfanos SIN book_entry pero CON citas

8 bookIds aparecen en citas pero no tienen entrada en `TL_BOOK_FALLBACKS`. Esto rompe la búsqueda y el link a libro.

| bookId | Citas |
|--------|-------|
| `amlomitad` | 25 |
| `comanche` | 37 |
| `deamericaeuropa` | 24 |
| `ogorman` | 27 |
| `popolvuh` | 20 |
| `procesoideol` | 20 |
| `taibomundo` | 1 |
| `zinn` | 30 |

**Acción**: agregar entradas de libro para estos 8. `amlomitad` es el más viejo (25 citas de dupe con `amlo_mitad`).

---

## 9. Archivos PDF en disco NO vinculados a ningún libro

**134 archivos** en `/Books/` sin bookId asociado. Algunos son duplicados, otros posibles fuentes futuras.

Sample (primeros 20):

- `Mexico-Mexicans-Making-of-US.pdf`
- `The Realm Below Speleoarchaeological Investigations in the Macal RiverValley,Belize Edited by Christ`
- `The_Aztec_Sacrifice_Myth.pdf`
- `Maya Shamanism Today BRUCE LOVE.pdf`
- `Historia-del-Pueblo-Mexicano.pdf`
- `Unknown-TheLib-154MB.pdf`
- `Popol-Vuh-FCE.pdf`
- `New-World-of-Gold-and-Silver.pdf`
- `La cámara 3 del Templo Mayor de Tenochtitlan.pdf`
- `la-invencion-de-amc3a9rica-o_gorman.pdf`
- `America-America-New-History-New-World.pdf`
- `Red-America-Magazine-013-Nov2025.pdf`
- `StudiesinAncient Mesoamerican ArtandArchitecture Selected Works byKarlAndreas Taube.pdf`
- `Comanche-Empire.pdf`
- `De-America-a-Europa-Indigenas-Viejo-Mundo.pdf`
- `Bienes-de-la-Nacion-1977.pdf`
- `Bible.pdf`
- `Los cocodrilos, símbolos de la tierra en las ofrendas del Templo Mayor.pdf`
- `A READING OF THE KOMKOM VASE DISCOVERED AT BAKING POT, BELIZE.pdf`
- `Zinn-Peoples-History-United-States.pdf`

... y 114 más.

**Acción sugerida**: correr un match manual — muchos son variantes con nombre distinto de libros ya procesados (ej. `Popol-Vuh-FCE.pdf` → `popolvuh` ya extraído).

---

## 10. Libros declarados SIN PDF encontrado en disco

El matcher fuzzy no pudo asociar 66 bookIds a ningún archivo. Muchos son **falsos negativos** (el PDF existe con nombre distinto).

Los 15 más probables de tener PDF real:

- `taibo68` — 68
- `tutino3` — The Bajío Revolution
- `xijinping` — The Governance of China Vol. I
- `dussel16economia` — 16 Tesis de Economía Política
- `stalinmaterialism` — Historia del PC(b) de la URSS: Curso breve
- `maoquotations` — Quotations from Chairman Mao (Little Red Book)
- `alaman1` — Historia de Méjico, tomo I
- `bienesnacion` — Los bienes de la Iglesia en México (1856-1875)
- `dussel20politica` — 20 Tesis de Política
- `dussellecciones` — Lecciones de filosofía de la liberación
- `dusselsur` — Filosofías del Sur

**Acción**: hacer un pass manual de mapping — la mayoría existe pero con nombre no evidente.

---

## 11. Plan de acción propuesto (por prioridad)

### Alta
1. **Consolidar duplicados** (23 pares detectados) — priorizando Conquista/Mexicas cross-era
2. **Recortar labels ≥ 80 chars** (~15 casos, mayormente tesis Dussel)
3. **Recortar detalles ≥ 400 chars** (top 10)
4. **Agregar 8 book_entries orphan** para arreglar búsqueda

### Media
5. **Reconciliar bookIds → PDFs en disco** con nombre manual (script + revisión)
6. **Consolidar era 'Civilización Olmeca' con 'Olmecas — Cultura Madre'** (10 eventos duplican)
7. **Rellenar Cuarta Transformación** — solo 74 eventos, hueco visible

### Baja
8. Extraer 4 libros pendientes (marxmanifesto, ogorman, planayala expandido, taibonoolvida) — requiere buscar PDFs
9. Auditar bajo rendimiento (frontera, marxgrundisse) — si el PDF está incompleto reemplazar

---

## 12. Lista completa: los 214 libros con citas

(Ordenados por citas descendente. Marcados `⚠️` los que faltan de `TL_BOOK_FALLBACKS`.)

| # | bookId | Título | Citas | Ev | Año | Autor |
|---|--------|--------|-------|-----|-----|-------|
| 1 | `grandeza` | Grandeza | 241 | 216 | 2021 | Andrés Manuel López Obrador |
| 2 | `webereconomia` | Economía y Sociedad | 120 | 111 | 1922 | Max Weber |
| 3 | `diazcastillo` | Historia verdadera de la conquista | 75 | 45 | 1632 | Bernal Díaz del Castillo |
| 4 | `taibo68` | 68 | 74 | 54 | 2004 | Paco Ignacio Taibo II |
| 5 | `semocapitalismo` | Historia del capitalismo en México: los oríge | 70 | 60 | 1973 | Enrique Semo |
| 6 | `madero` | La sucesión presidencial en 1910 | 66 | 59 | 1908 | Francisco I. Madero |
| 7 | `dussel20politica` | 20 Tesis de Política | 57 | 31 | 2006 | Enrique Dussel |
| 8 | `lascasas` | Brevísima relación de la destrucción de las I | 56 | 46 | 1552 | Bartolomé de las Casas |
| 9 | `semoconquista` | La conquista: catástrofe de los pueblos origi | 56 | 56 | 2019 | Enrique Semo |
| 10 | `ciudadanfibia` | Ciudad anfibia: México-Tenochtitlan | 55 | 41 | 2014 | Alfonso Alfaro |
| 11 | `stalinmaterialism` | Historia del PC(b) de la URSS: Curso breve | 55 | 37 | 1938 | AA.VV. Comisión CC PCUS(b) |
| 12 | `humboldt` | Ensayo político sobre el reino de la Nueva Es | 53 | 50 | 1811 | Alexander von Humboldt |
| 13 | `amlo_mitad` | A la mitad del camino | 51 | 51 | 2021 | Andrés Manuel López Obrador |
| 14 | `hudson1` | Super Imperialism | 49 | 49 | 1972 | Michael Hudson |
| 15 | `fidelcienhoras` | Cien horas con Fidel | 48 | 34 | 2006 | Fidel Castro / Ignacio Ramonet |
| 16 | `sentimientos` | Sentimientos de la Nación | 48 | 37 | 1813 | José María Morelos |
| 17 | `hochiminh` | Escritos escogidos | 47 | 38 | 1960 | Ho Chi Minh |
| 18 | `reedmexico` | México insurgente | 47 | 29 | 1914 | John Reed |
| 19 | `hudsoncanada` | Canada in the New Monetary Order | 46 | 46 | 1978 | Michael Hudson |
| 20 | `preciousmetals` | Precious Metals in the Later Medieval and Ear | 46 | 45 | 1983 | John F. Richards (ed.) |
| 21 | `duboisreconstruction` | Black Reconstruction in America | 44 | 44 | 1935 | W.E.B. Du Bois |
| 22 | `chilambalam` | Chilam Balam | 42 | 36 | 1560 | Anónimo maya |
| 23 | `xijinping` | The Governance of China Vol. I | 42 | 42 | 2014 | Xi Jinping |
| 24 | `pomeranz` | The Great Divergence | 41 | 41 | 2000 | Kenneth Pomeranz |
| 25 | `maoquotations` | Quotations from Chairman Mao (Little Red Book | 40 | 40 | 1964 | Mao Zedong |
| 26 | `dubois` | Black Reconstruction in America | 39 | 39 | 1935 | W.E.B. Du Bois |
| 27 | `dussel16economia` | 16 Tesis de Economía Política | 39 | 39 | 2014 | Enrique Dussel |
| 28 | `taibonoolvida` | Que no se olvide | 38 | 21 | 2020 | Paco Ignacio Taibo II |
| 29 | `comanche` | (sin entrada) ⚠️ | 37 | 22 | 0 | ? |
| 30 | `engelscondition` | La situación de la clase obrera en Inglaterra | 37 | 30 | 1845 | Friedrich Engels |
| 31 | `tutino3` | The Bajío Revolution | 37 | 36 | 2025 | John Tutino |
| 32 | `redmexico` | Red Mexico: A Reign of Terror in America | 36 | 36 | 1928 | Francis McCullagh |
| 33 | `soustelle` | El universo de los aztecas | 36 | 36 | 1955 | Jacques Soustelle |
| 34 | `stalinnational` | Marxism and the National Question | 36 | 28 | 1913 | J.V. Stalin |
| 35 | `taibovillazapata` | Villa y Zapata | 36 | 20 | 2002 | Paco Ignacio Taibo II |
| 36 | `fidelvictoria` | La victoria estratégica | 35 | 26 | 2010 | Fidel Castro |
| 37 | `antiduhring` | Anti-Dühring | 34 | 34 | 1878 | Friedrich Engels |
| 38 | `galeano` | Las venas abiertas de América Latina | 34 | 34 | 1971 | Eduardo Galeano |
| 39 | `marxhobsbawm` | Introducción a las formaciones económicas pre | 34 | 34 | 1964 | Eric Hobsbawm |
| 40 | `reedinsurgente` | México insurgente | 34 | 17 | 1914 | John Reed |
| 41 | `marxcivilwar` | La guerra civil en Francia | 32 | 12 | 1871 | Karl Marx |
| 42 | `semoizquierda` | La izquierda mexicana | 32 | 24 | 2018 | Enrique Semo |
| 43 | `taiborivera` | Los últimos días de la Comuna de París | 32 | 18 | 2010 | Paco Ignacio Taibo II |
| 44 | `bonialian` | El Pacífico hispanoamericano | 31 | 22 | 2012 | Mariano Bonialian |
| 45 | `stalineconomic` | Economic Problems of Socialism in the USSR | 30 | 30 | 1952 | J.V. Stalin |
| 46 | `zinn` | (sin entrada) ⚠️ | 30 | 30 | 0 | ? |
| 47 | `alaman1` | Historia de Méjico, tomo I | 29 | 29 | 1849 | Lucas Alamán |
| 48 | `taibohidalgo` | Hidalgo, la biografía | 29 | 18 | 2020 | Paco Ignacio Taibo II |
| 49 | `taiboproal` | Proal, la lucha por la vivienda | 29 | 15 | 1988 | Paco Ignacio Taibo II |
| 50 | `dussellecciones` | Lecciones de filosofía de la liberación | 28 | 26 | 2011 | Enrique Dussel |
| 51 | `galeanovenas` | Las venas abiertas de América Latina | 27 | 27 | 1971 | Eduardo Galeano |
| 52 | `hudson2` | Destiny of Civilization | 27 | 27 | 2022 | Michael Hudson |
| 53 | `hudsondestiny` | The Destiny of Civilization | 27 | 27 | 2022 | Michael Hudson |
| 54 | `molina` | Los grandes problemas nacionales | 27 | 27 | 1909 | Andrés Molina Enríquez |
| 55 | `ogorman` | (sin entrada) ⚠️ | 27 | 22 | 0 | ? |
| 56 | `americanewworld` | America in the New World | 26 | 26 | 2000 | AA.VV. |
| 57 | `leninkautsky` | La revolución proletaria y el renegado Kautsk | 26 | 13 | 1918 | V.I. Lenin |
| 58 | `salmeronlucha` | La lucha de los campesinos | 26 | 20 | 2013 | Pedro Salmerón |
| 59 | `amlomitad` | (sin entrada) ⚠️ | 25 | 25 | 0 | ? |
| 60 | `fideldiscursos` | Discursos | 25 | 21 | 1990 | Fidel Castro |
| 61 | `kimjucherev` | The Juche Idea and Revolution | 25 | 25 | 1972 | Kim Il Sung |
| 62 | `marxbrumario` | El 18 Brumario de Luis Bonaparte | 25 | 24 | 1852 | Karl Marx |
| 63 | `marxmanifesto` | Manifiesto del Partido Comunista | 25 | 25 | 1848 | Marx / Engels |
| 64 | `wolf` | Los campesinos | 25 | 24 | 1966 | Eric Wolf |
| 65 | `deamericaeuropa` | (sin entrada) ⚠️ | 24 | 24 | 0 | ? |
| 66 | `foster` | La ecología de Marx | 24 | 24 | 2000 | John Bellamy Foster |
| 67 | `wallerstein` | El moderno sistema mundial | 24 | 24 | 1974 | Immanuel Wallerstein |
| 68 | `bonfilprofundo` | México profundo: una civilización negada | 23 | 23 | 1987 | Guillermo Bonfil Batalla |
| 69 | `dusselproduccion` | La producción teórica de Marx | 23 | 23 | 1985 | Enrique Dussel |
| 70 | `fidelreligion` | Fidel y la religión | 23 | 23 | 1985 | Fidel Castro / Frei Betto |
| 71 | `lopezaustin` | Los mitos del tlacuache | 23 | 23 | 1990 | Alfredo López Austin |
| 72 | `marichal` | De la plata a la cocaína | 23 | 23 | 2006 | Carlos Marichal |
| 73 | `marti` | Nuestra América y otros ensayos | 23 | 23 | 1891 | José Martí |
| 74 | `salmeroncien` | A cien años de la Revolución | 23 | 23 | 2010 | Pedro Salmerón |
| 75 | `wobeser` | El crédito eclesiástico en Nueva España | 23 | 21 | 1994 | Gisela von Wobeser |
| 76 | `zavala` | El servicio personal de los indios | 23 | 23 | 1984 | Silvio Zavala |
| 77 | `dussel` | Obra selecta (colección) | 22 | 22 | 1990 | Enrique Dussel |
| 78 | `dussel1492` | 1492: El encubrimiento del Otro | 22 | 22 | 1992 | Enrique Dussel |
| 79 | `fidelhistoria` | La historia me absolverá | 22 | 18 | 1953 | Fidel Castro |
| 80 | `hudsonsuperimp` | Super Imperialism | 22 | 22 | 1972 | Michael Hudson |
| 81 | `katz` | La guerra secreta en México | 22 | 22 | 1981 | Friedrich Katz |
| 82 | `leninleftwing` | La enfermedad infantil del izquierdismo | 22 | 9 | 1920 | V.I. Lenin |
| 83 | `molinaenriquez` | Los grandes problemas nacionales | 22 | 22 | 1909 | Andrés Molina Enríquez |
| 84 | `tremlett` | Isabel la Católica: La primera gran reina de  | 22 | 22 | 2017 | Giles Tremlett |
| 85 | `tutino1` | De la insurrección a la revolución en México | 22 | 22 | 1986 | John Tutino |
| 86 | `chavezazul` | El libro azul | 21 | 21 | 2013 | Hugo Chávez |
| 87 | `gustavobueno` | España frente a Europa | 21 | 21 | 1999 | Gustavo Bueno |
| 88 | `historiapueblo` | Historia general del pueblo mexicano | 21 | 21 | 2000 | AA.VV. |
| 89 | `hudsondebts` | …and Forgive Them Their Debts | 21 | 21 | 2018 | Michael Hudson |
| 90 | `newworldgold` | New World Gold | 21 | 21 | 2010 | AA.VV. |
| 91 | `tutino2` | Making a New World: Founding Capitalism in th | 21 | 21 | 2011 | John Tutino |
| 92 | `tutino4` | Mexico City 1808 | 21 | 21 | 2018 | John Tutino |
| 93 | `dusselfilosofia` | Filosofía de la liberación | 20 | 20 | 1977 | Enrique Dussel |
| 94 | `dusselhipotesis` | Hipótesis para una historia de la filosofía l | 20 | 20 | 1994 | Enrique Dussel |
| 95 | `dusselultimomarx` | El último Marx (1863-1882) | 20 | 20 | 1990 | Enrique Dussel |
| 96 | `hudsonkillinghost` | Killing the Host | 20 | 20 | 2015 | Michael Hudson |
| 97 | `juarez` | Apuntes para mis hijos | 20 | 20 | 1857 | Benito Juárez |
| 98 | `juarezapuntes` | Apuntes para mis hijos | 20 | 20 | 1857 | Benito Juárez |
| 99 | `parentiempire` | Against Empire | 20 | 18 | 1995 | Michael Parenti |
| 100 | `popolvuh` | (sin entrada) ⚠️ | 20 | 20 | 0 | ? |
| 101 | `procesoideol` | (sin entrada) ⚠️ | 20 | 20 | 0 | ? |
| 102 | `rozat` | Indios imaginarios e indios reales | 20 | 20 | 2002 | Guy Rozat |
| 103 | `salmeronsayula` | Sayula y la Revolución | 20 | 13 | 2014 | Pedro Salmerón |
| 104 | `villoro` | El proceso ideológico de la Revolución de Ind | 20 | 20 | 1953 | Luis Villoro |
| 105 | `bienesnacion` | Los bienes de la Iglesia en México (1856-1875 | 19 | 19 | 1971 | Jan Bazant |
| 106 | `dusseletica2` | Para una ética de la liberación (Tomo II) | 19 | 19 | 1973 | Enrique Dussel |
| 107 | `dusselintro` | Introducción a la filosofía de la liberación | 19 | 19 | 1976 | Enrique Dussel |
| 108 | `dusselmarxdesc` | Hacia un Marx desconocido | 19 | 13 | 1988 | Enrique Dussel |
| 109 | `dusselsur` | Filosofías del Sur | 19 | 19 | 2015 | Enrique Dussel |
| 110 | `engelsdialectica` | Dialéctica de la naturaleza | 19 | 19 | 1883 | Friedrich Engels |
| 111 | `espejohaitiano` | Hegel, Haití y la historia universal | 19 | 19 | 2009 | Susan Buck-Morss |
| 112 | `piedrasnegras_diary` | Chronicle of the Maya Kings and Queens | 19 | 19 | 2000 | Simon Martin & Nikolai Grube |
| 113 | `semocombates` | Combates por la historia | 19 | 19 | 1997 | Enrique Semo |
| 114 | `camposperez` | Memorias y desafíos | 18 | 18 | 2010 | Campos Pérez |
| 115 | `dusseletica1` | Para una ética de la liberación (Tomo I) | 18 | 18 | 1973 | Enrique Dussel |
| 116 | `dusselpolitica` | Política de la liberación | 18 | 18 | 2007 | Enrique Dussel |
| 117 | `dusselpolitica2` | Política de la Liberación Vol. II: Arquitectó | 18 | 18 | 2009 | Enrique Dussel |
| 118 | `echeverria` | La modernidad de lo barroco | 18 | 18 | 1998 | Bolívar Echeverría |
| 119 | `engelsantiduhring` | Anti-Dühring | 18 | 18 | 1878 | Friedrich Engels |
| 120 | `engelsfamily` | El origen de la familia, la propiedad privada | 18 | 18 | 1884 | Friedrich Engels |
| 121 | `grafe` | Distant Tyranny | 18 | 18 | 2012 | Regina Grafe |
| 122 | `groverfurr` | Khrushchev Lied | 18 | 18 | 2011 | Grover Furr |
| 123 | `hassler` | El sacrificio humano entre los mexicas | 18 | 18 | 1993 | Peter Hassler |
| 124 | `hudsontrade` | Trade, Development and Foreign Debt | 18 | 18 | 1992 | Michael Hudson |
| 125 | `kimilsung` | Obras escogidas | 18 | 18 | 1970 | Kim Il-sung |
| 126 | `maoworks1` | Selected Works Vol. 1 | 18 | 18 | 1965 | Mao Zedong |
| 127 | `marxcomunidad` | Escritos sobre la comunidad ancestral | 18 | 18 | 1970 | Karl Marx |
| 128 | `misericordia` | La Misericordia (proyecto) | 18 | 18 | 2020 | AMLO |
| 129 | `sacrificio` | El sacrificio humano entre los mexicas | 18 | 18 | 1985 | Yolotl González Torres |
| 130 | `taibofuego` | El fuego | 18 | 18 | 2000 | Paco Ignacio Taibo II |
| 131 | `dusselmetaforas` | Metáforas teológicas de Marx | 17 | 17 | 1994 | Enrique Dussel |
| 132 | `dusselmodernidad` | El encubrimiento del Otro: origen del mito de | 17 | 17 | 1993 | Enrique Dussel |
| 133 | `engelssocialism` | Del socialismo utópico al socialismo científi | 17 | 10 | 1880 | Friedrich Engels |
| 134 | `fidelsegunda` | Segunda Declaración de La Habana | 17 | 17 | 1962 | Fidel Castro |
| 135 | `leninleft` | La enfermedad infantil del izquierdismo en el | 17 | 17 | 1920 | V. I. Lenin |
| 136 | `leninstate` | El Estado y la revolución | 17 | 17 | 1917 | V.I. Lenin |
| 137 | `lenintactics` | Dos tácticas de la socialdemocracia | 17 | 8 | 1905 | V.I. Lenin |
| 138 | `leninwhat` | ¿Qué hacer? | 17 | 17 | 1902 | V. I. Lenin |
| 139 | `marxcapital_en` | Capital, Vol. I (English) | 17 | 17 | 1867 | Karl Marx |
| 140 | `marxengelscivilwar` | La guerra civil en Francia | 17 | 17 | 1871 | Marx / Engels |
| 141 | `parentidirty` | Dirty Truths | 17 | 13 | 1996 | Michael Parenti |
| 142 | `salmeronemiliano` | Emiliano Zapata: su lucha por la tierra | 17 | 17 | 2019 | Pedro Salmerón |
| 143 | `taiboarcangeles` | Arcángeles: doce revolucionarios herejes | 17 | 17 | 2000 | Paco Ignacio Taibo II |
| 144 | `taibopatria` | La patria de todos | 17 | 17 | 2019 | Paco Ignacio Taibo II |
| 145 | `villacanasfranco` | Franco | 17 | 17 | 2019 | José Luis Villacañas |
| 146 | `weberpoder` | El político y el científico | 17 | 17 | 1919 | Max Weber |
| 147 | `dusselcarta` | Carta a los indignados | 16 | 16 | 2011 | Enrique Dussel |
| 148 | `dusselindignados` | Los indignados | 16 | 16 | 2011 | Enrique Dussel |
| 149 | `engelsfeuerbach` | Ludwig Feuerbach y el fin de la filosofía clá | 16 | 16 | 1886 | Friedrich Engels |
| 150 | `fidelcontraofensiva` | La contraofensiva estratégica | 16 | 16 | 2010 | Fidel Castro |
| 151 | `hudsonlabor` | Labor in the Ancient World | 16 | 16 | 2015 | Michael Hudson |
| 152 | `leninmat` | Materialismo y empiriocriticismo | 16 | 16 | 1909 | V. I. Lenin |
| 153 | `lenintwotactics` | Dos tácticas de la socialdemocracia | 16 | 16 | 1905 | V. I. Lenin |
| 154 | `losurdostalin` | Stalin: Historia y crítica de una leyenda neg | 16 | 16 | 2008 | Domenico Losurdo |
| 155 | `maoworks19` | Selected Works Vol. 19 | 16 | 16 | 1968 | Mao Zedong |
| 156 | `marxmanuscripts` | Manuscritos económico-filosóficos de 1844 | 16 | 16 | 1844 | Karl Marx |
| 157 | `parenticulture` | The Culture Struggle | 16 | 16 | 2005 | Michael Parenti |
| 158 | `parentireality` | The Assassination of Julius Caesar | 16 | 16 | 2003 | Michael Parenti |
| 159 | `salmeronargumedo` | Argumedo: la libertad y la tierra | 16 | 16 | 2010 | Pedro Salmerón |
| 160 | `stalinbio2` | Stalin: Biografía breve, Vol. 2 | 16 | 16 | 1949 | AA.VV. / IMEL |
| 161 | `stalinbio3` | Stalin: Biografía breve, Vol. 3 | 16 | 16 | 1949 | AA.VV. / IMEL |
| 162 | `stalincpsu` | Sobre el marxismo y la cuestión nacional | 16 | 16 | 1913 | J.V. Stalin |
| 163 | `taibobolcheviques` | Bolcheviques | 16 | 16 | 1986 | Paco Ignacio Taibo II |
| 164 | `campos` | México ante la globalización | 15 | 15 | 2010 | Campos Pérez |
| 165 | `dussel14etica` | 14 tesis de ética | 15 | 15 | 2016 | Enrique Dussel |
| 166 | `hudsonkilling` | Killing the Host | 15 | 15 | 2015 | Michael Hudson |
| 167 | `hudsonlost` | The Lost Tradition of Biblical Debt Cancellat | 15 | 15 | 1993 | Michael Hudson |
| 168 | `kimjuchephilo` | On the Juche Philosophy | 15 | 15 | 1982 | Kim Jong Il |
| 169 | `kimjuchespeeches` | Selected Speeches | 15 | 15 | 1972 | Kim Il Sung |
| 170 | `leninonestep` | Un paso adelante, dos pasos atrás | 15 | 15 | 1904 | V. I. Lenin |
| 171 | `marxcontribution` | Contribución a la crítica de la economía polí | 15 | 15 | 1859 | Karl Marx |
| 172 | `marxideology` | La ideología alemana | 15 | 8 | 1846 | Marx / Engels |
| 173 | `palenquexix` | El Templo XIX de Palenque (siglo XIX) | 15 | 15 | 2005 | David Stuart |
| 174 | `parentihistory` | History as Mystery | 15 | 15 | 1999 | Michael Parenti |
| 175 | `parentiidols` | Land of Idols | 15 | 15 | 1994 | Michael Parenti |
| 176 | `parentimedia` | Inventing Reality: The Politics of News Media | 15 | 15 | 1993 | Michael Parenti |
| 177 | `parentisuper` | Superpatriotism | 15 | 15 | 2004 | Michael Parenti |
| 178 | `parentisword` | The Sword and the Dollar | 15 | 15 | 1989 | Michael Parenti |
| 179 | `parentiterror` | The Terrorism Trap | 15 | 15 | 2002 | Michael Parenti |
| 180 | `salmerontriunfadores` | Los triunfadores | 15 | 15 | 2015 | Pedro Salmerón |
| 181 | `semohistoria` | Historia mexicana: economía y lucha de clases | 15 | 15 | 1978 | Enrique Semo |
| 182 | `stalinbio1` | Stalin: Biografía breve, Vol. 1 | 15 | 15 | 1949 | AA.VV. / IMEL |
| 183 | `taiboinquilinos` | Inquilinos del imaginario | 15 | 15 | 1997 | Paco Ignacio Taibo II |
| 184 | `cocodrilos_templomayor` | Cocodrilos del Templo Mayor | 14 | 14 | 2020 | Leonardo López Luján |
| 185 | `fidelguerrillero` | La guerra de guerrillas | 14 | 14 | 1963 | Fidel Castro |
| 186 | `fidelhabana` | La Habana | 14 | 14 | 2000 | Fidel Castro |
| 187 | `hegel` | Fenomenología del Espíritu | 14 | 14 | 1807 | G.W.F. Hegel |
| 188 | `lenintodo` | Obras escogidas | 14 | 14 | 1970 | V.I. Lenin |
| 189 | `rosalila` | Rosalila: Templo del Sol en Copán | 14 | 14 | 1997 | AA.VV. |
| 190 | `taiboescudero` | Escudero | 14 | 14 | 1985 | Paco Ignacio Taibo II |
| 191 | `taibonada` | Nada más los muertos saben las respuestas | 14 | 14 | 1990 | Paco Ignacio Taibo II |
| 192 | `salmeroncatolicismo` | Catolicismo social y revolución mexicana | 13 | 13 | 2015 | Pedro Salmerón |
| 193 | `salmeronhistoriadores` | Los historiadores y la Revolución | 13 | 13 | 2012 | Pedro Salmerón |
| 194 | `templo19_palenque` | Templo XIX de Palenque | 13 | 13 | 2005 | Alfonso Arellano Hernández |
| 195 | `weberobras` | Escritos políticos | 13 | 13 | 1918 | Max Weber |
| 196 | `maodialectica` | Sobre la práctica y sobre la contradicción | 12 | 12 | 1937 | Mao Zedong |
| 197 | `marxvalue` | Salario, precio y ganancia | 12 | 12 | 1865 | Karl Marx |
| 198 | `sankara` | Discursos y escritos | 12 | 12 | 1987 | Thomas Sankara |
| 199 | `taibovilla` | Pancho Villa: una biografía narrativa | 12 | 12 | 2006 | Paco Ignacio Taibo II |
| 200 | `bonfilhambre` | Los pueblos del hambre | 11 | 11 | 1982 | Guillermo Bonfil Batalla |
| 201 | `bonfilpensar` | Pensar nuestra cultura | 11 | 11 | 1992 | Guillermo Bonfil Batalla |
| 202 | `hudsonserfdom` | From Slavery to Serfdom | 11 | 11 | 2018 | Michael Hudson |
| 203 | `salmeronvillismo` | Villismo y villismos | 11 | 11 | 2016 | Pedro Salmerón |
| 204 | `taiboirapuato` | Irapuato mi amor | 11 | 11 | 1996 | Paco Ignacio Taibo II |
| 205 | `leninforward` | A Great Beginning / Un gran comienzo | 10 | 10 | 1919 | V.I. Lenin |
| 206 | `marxgotha` | Crítica del programa de Gotha | 10 | 6 | 1875 | Karl Marx |
| 207 | `marxwage` | Trabajo asalariado y capital | 10 | 7 | 1849 | Karl Marx |
| 208 | `marxpoverty` | Miseria de la filosofía | 8 | 8 | 1847 | Karl Marx |
| 209 | `stalinfoundations` | Fundamentos del leninismo | 8 | 8 | 1924 | J.V. Stalin |
| 210 | `frontera` | Historias de la frontera | 7 | 7 | 2001 | Fernando Operé |
| 211 | `marxgrundisse` | Grundrisse | 7 | 7 | 1858 | Karl Marx |
| 212 | `planayala` | Plan de Ayala | 5 | 5 | 1911 | Emiliano Zapata |
| 213 | `bonfilpropio` | El pensamiento propio | 2 | 2 | 1988 | Guillermo Bonfil Batalla |
| 214 | `taibomundo` | (sin entrada) ⚠️ | 1 | 1 | 0 | ? |
| 215 | `grandezabalbuena` | Grandeza mexicana | 0 | 0 | 1604 | Bernardo de Balbuena |
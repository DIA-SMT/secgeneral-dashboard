# Plan Rector ↔ POA — análisis y plan de trabajo

**Fecha:** 31 de agosto de 2026
**Pide:** ítems B y C de las correcciones del 24.08 (páginas 36 y 37)
**Fuente:** `Cumplimiento Plan Rector.xlsx`
**Rama:** `lucas`

Pedido textual del cliente:

> "Lo que necesitamos es que a partir de los datos del excel vinculen los proyectos
> (con sus metas e indicadores, o sea con todos sus datos de avance) con el ámbito
> de intervención y con lo demás del orden jerárquico del plan rector.
> Que sea esa vinculación de datos lo que después se plasme en la herramienta de
> visualización del sistema."

---

## 1. El hallazgo bloqueante: el Excel no trae el mapeo

La planilla tiene 6 columnas. Las cinco primeras traen la jerarquía completa y
prolija. La sexta se llama **"Programas vinculados"** y está **vacía: 0 celdas con
dato**.

No es un descuido de envío: las celdas combinadas de esa columna **están armadas**,
agrupadas una por eje estratégico (`F2:F6` cubre las filas del eje 1, `F7:F10` el
eje 2, y así hasta `F81:F87`). Hay 16 rangos combinados en F y 16 en G. Alguien
preparó el lugar donde iba el vínculo y nunca lo llenó.

Verificado que no esté en otro lado: una sola hoja, sin hojas ocultas, sin columnas
ocultas, sin comentarios en celdas, sin nombres definidos.

**Consecuencia:** el vínculo proyecto → Plan Rector **no existe como dato**. La
jerarquía se puede importar hoy; el mapeo hay que producirlo. Y el hecho de que
esa columna esté vacía del lado del cliente sugiere que ellos tampoco lo tienen
resuelto.

Dato secundario pero orientador: que la columna esté combinada **por eje** y se
llame "Programas vinculados" indica que ellos piensan el vínculo a nivel de **eje**
(17 opciones) y sobre **programas**, no sobre los 441 proyectos del POA.

---

## 2. La jerarquía, ya extraída

Extraída usando los rangos combinados como autoridad (no relleno hacia abajo a
ciegas), en `plan-rector.json`:

| Nivel | Cantidad |
|---|---|
| Ámbitos de intervención | 5 |
| Ejes estratégicos | 17 |
| Objetivos estratégicos | 19 |
| Líneas estratégicas | 63 |
| ODS distintos | 14 (colgando del eje, no de la línea) |

Los 5 ámbitos: A1 Ciudad ordenada y sustentable (3 ejes) · A2 Ciudad con bienestar
para todas las familias (4) · A3 Ciudad cercana, accesible y segura (3) · A4 Ciudad
centrada en las personas (5) · A5 Ciudad abierta y de oportunidades (2).

Los ejes están numerados 1..17 **globales**, no por ámbito. Importa para el modelo:
si el cliente inserta un eje en A1, se corren 16 códigos.

---

## 3. ¿Se puede automatizar el match?

Se midió en serio, no se estimó. Se etiquetó una **muestra estratificada de 63
proyectos** (de los 441, proporcional por secretaría) con **cuatro criterios
independientes y distintos entre sí**: por el texto del proyecto, por la competencia
del área responsable, por ODS, y uno estricto que admite "no encaja en ninguno".

La lógica: si criterios genuinamente distintos convergen, el match es automatizable
como propuesta. Si no convergen, es una decisión humana.

### Resultado

| Pregunta | Acuerdo |
|---|---|
| ¿A qué **ámbito** va? (sobre los 58 que al menos un criterio ubica) | **84 %** (49/58) |
| ¿A qué **eje** va? (misma base) | **76 %** (44/58) |
| Unanimidad bruta de eje sobre los 63 | 51 % |
| Mayoría de eje sobre los 63 | 87 % |
| ¿A qué **línea estratégica** va? | **sin medir** — los cuatro criterios votaron eje, ninguno bajó a línea |

**Veredicto: automatizable como propuesta a confirmar, a nivel ámbito y eje. No a
nivel objetivo ni línea — que es lo que el cliente pidió textualmente.**

El 51 % bruto engaña porque mezcla dos preguntas distintas:

- **¿Pertenece al Plan Rector?** Acá está casi todo el desacuerdo. El criterio
  estricto dejó 26 proyectos sin vínculo; los otros tres dejaron 5, 6 y 6. En 15
  casos el patrón es idéntico: tres criterios coinciden en el mismo eje y el cuarto
  dice "esto no se vincula". **No discrepan sobre dónde va, discrepan sobre si va.**
  Eso es una regla que nadie escribió.
- **¿A qué eje va, dado que va?** Acá sí converge: 84 % a nivel ámbito.

### Por qué a nivel línea va a ser peor

63 líneas contra 17 ejes; son párrafos de política pública de 188 caracteres
promedio (máximo 544); y 26 de los 63 proyectos de la muestra no tienen **ninguna**
línea que los describa.

### El trabajo humano que queda igual

441 decisiones. Estimación del desglose:

- **~190 (43 %)** confirmación en segundos: los cuatro criterios coincidieron y hay
  línea textual que lo respalda.
- **~100** hay que leer el proyecto y elegir con criterio.
- **~150** hay que aplicar una regla que hoy no existe (efemérides, compras
  internas, capacitación de plantel). Definida la regla, vuelven a ser confirmación
  por lote.

**Cómo repartirlo.** Que no lo haga una sola persona: son 15-25 h de alguien que
conozca el plan pero no los proyectos. Repartido por dirección desde PlanIA son 52
unidades × 30-60 min — más horas totales, pero con contexto, y además cada área es
la única que sabe qué hace el proyecto que se llama sólo "Comunicación" o
"Bot Espiritual". De paso queda auditado con nombre y fecha.

### Los datos del POA tampoco ayudan

- **407 de 441 (92 %)** no tienen el campo `objetivo` cargado.
- El nombre promedia 46 caracteres.
- **40 proyectos tienen nombres imposibles de matchear**: "Promover", "Proyecta",
  "Ecocanjes", "ces-connect", "Bot Espiritual", "apiFuncioarios", "Control focal".

---

## 4. El Plan Rector se contradice y tiene vacíos

Esto es lo más importante para llevarle al cliente, y probablemente no lo tengan
detectado. **Todo verificado sobre el texto del Excel, no es interpretación.**

### El mismo objeto nombrado en dos ámbitos distintos

| Objeto | Aparece en | Ámbitos |
|---|---|---|
| App Mi Municipio | ejes 14 y 17 | **A4 y A5** |
| Asistencia Pública | eje 3 ("recuperación de obras emblemáticas… la Asistencia Pública") y eje 11 ("refuncionalización de la Asistencia Pública") | **A1 y A4** |
| Espacio público | ejes 1 y 10 (casi palabra por palabra) | **A1 y A3** |
| Deporte | ejes 3 y 16 | **A1 y A5** |
| Residuos | ejes 4 y 6 | ambos A2 |

Ningún algoritmo puede elegir entre dos ámbitos cuando el plan pone el mismo objeto
en los dos.

### Temas que el plan no nombra en ningún nivel

Buscado sobre los 17 ejes, sus 19 objetivos, sus 63 líneas y los 14 ODS:

| Tema | Aparece | Proyectos activos afectados |
|---|---|---|
| discapacidad / inclusión | **no aparece** | **27** (Casa Azul, Centro de Tartamudez, lengua de señas, educación especial) |
| bromatología | **no aparece** | ~9 |
| Defensa Civil | **no aparece** | ~15 |
| auditoría | **no aparece** | varios de Contaduría |
| comunicación institucional | **no aparece** | varios |
| recursos humanos | sí, en el eje 17 | — |

> Corrección respecto del primer análisis automático: "recursos humanos" **sí**
> aparece (eje 17), y la App Mi Municipio está en dos ámbitos, no en tres. El resto
> se confirmó.

---

## 5. Modelo recomendado — migración 044

**Base: árbol recursivo**, siguiendo el patrón de `unidad_organizacional` (002) que
el proyecto ya usa, más una tabla de vínculo y una de exclusión.

### `plan_rector_nodo` — los 104 nodos en un árbol

```
id             uuid PK
parent_id      uuid FK self ON DELETE RESTRICT
tipo           enum ('area_intervencion','eje','objetivo','linea')
nivel          smallint            -- 0..3
clave_estable  text UNIQUE         -- sale de fila_excel; NUNCA posicional
codigo_cliente text                -- 'A1', 'Eje 8'. NO único
nombre         text                -- el párrafo completo del Excel, con sus typos
nombre_corto   text
orden          smallint
activa         boolean             -- 'activa', como unidad_organizacional
metadata       jsonb
```

Sin `periodo_id`: el Plan Rector es plurianual y el POA es anual. Sin `deleted_at`:
un solo mecanismo de baja, `activa`, como el resto de la casa.

**`clave_estable` es lo no negociable.** Los ejes están numerados 1..17 globales. Si
el seed es idempotente por código y el cliente inserta un eje en A1, la próxima
corrida inserta ~60 nodos nuevos al lado de los viejos y los vínculos siguen
apuntando a los viejos: el tablero muestra el árbol duplicado.

### `ods` (PK `numero`) + `pr_eje_ods`

No un `text[]` crudo: los ODS del Excel vienen con el número adelante y con typos
("infrestructura", "comunidades disponibles"). Con el número como clave los typos
dejan de importar.

### `proyecto_plan_rector` — el vínculo

```
proyecto_id    uuid FK ON DELETE RESTRICT   -- RESTRICT: el borrado es blando
nodo_id        uuid FK plan_rector_nodo
principal      boolean DEFAULT false
estado         enum ('propuesto','confirmado','rechazado')
origen         enum ('carga_manual','sugerencia_lote','importacion')
confianza      smallint                     -- 0-100, si vino de una sugerencia
metodo         text                         -- versión del matcher
justificacion  text
creado_por / confirmado_por / confirmado_at
UNIQUE (proyecto_id, nodo_id, estado)
CREATE UNIQUE INDEX uq_ppr_principal ON proyecto_plan_rector(proyecto_id)
  WHERE principal AND estado = 'confirmado';
```

El vínculo **principal garantizado por índice**, no por convención de la app: es lo
que hace que los totales cierren.

### `proyecto_pr_exclusion`

`proyecto_id PK`, `motivo NOT NULL`, `declarado_por`. **Imprescindible:** sin esto no
se distingue "falta clasificar" de "no corresponde", y son entre 35 y 180 proyectos.

### `plan_rector_vinculo_historial`

Append-only, patrón `indicador_historial` (028), con autor desnormalizado. Mover el
`principal` de un proyecto mueve dos números a la vez: tiene que tener firma.

### Decisiones de implementación

- **Cero vistas SQL con cálculo.** El repo ya decidió esto: 0 vistas en 43
  migraciones, y la 023 dice textual que el cálculo vive en TS. Reimplementar
  `avanceIndicador` en SQL son ~150 líneas con `metadata.invertida`, los
  placeholders y las reglas fechadas del 16.07, 23.07 y 28.07. Duplicadas, divergen.
- **Permisos por GRANT de columna**, como la 043. Propone quien puede cargar el
  proyecto; **confirma y marca `principal` sólo `admin_funcional`**. Ojo que después
  de la 042 un director carga en toda su secretaría, y son 217 proyectos en
  Secretaría General.
- **RLS para las tres tablas nuevas en la misma migración.** Sin política, o se
  exponen por PostgREST o el panel sale en blanco sin error.
- **Vocabulario:** en PlanIA "ámbito" ya significa el recorte organizacional del
  panel (`ambitoUsuario`). Por eso el enum dice `area_intervencion` y la UI rotula
  "Ámbito de intervención (Plan Rector)", nunca "ámbito" solo.
- `semaforoLabel('gris')` devuelve **"Inactivo"**. El Plan Rector necesita su propio
  mapa de etiquetas o las tarjetas van a decir "Inactivo" donde debe decir "Sin
  proyectos asignados".

---

## 6. Cómo se calcula el cumplimiento

**Una sola definición:**

> El porcentaje de un nodo es el **promedio del avance de los proyectos del POA
> imputados a ese nodo o a cualquiera de sus hijos**.

En una frase para la Intendenta: *"Es el promedio de avance de los N proyectos del
POA 2026 imputados a este ámbito. No es el cumplimiento del Plan Rector: el Plan
Rector no tiene metas propias, todo lo medible vive en el POA, que es anual."*

Sin fórmula nueva — todo sale de `src/lib/utils.ts`:

```
pct_indicador = avanceIndicadorEnPlazo(ind)
pct_meta      = avanceMetaEnPlazo(indicadores, propio)
pct_proyecto  = avanceAgregado(pcts_de_metas).pct
pct_nodo      = avanceAgregado(pcts de los proyectos DISTINCT con vínculo
                  principal confirmado en el subárbol del nodo)
```

### Cuatro reglas que van con la definición

**a) Siempre plano sobre el subárbol, en los cuatro niveles.** El % del eje **no** es
el promedio de sus objetivos. Los ejes 4 y 17 tienen dos objetivos cada uno, y con
datos plausibles el eje plano da 36 % mientras el promedio de sus objetivos da 60 %:
24 puntos de diferencia en dos tarjetas una debajo de la otra. Peor: A5 tiene 2 ejes,
así que en un promedio de promedios un proyecto puede valer el 20 % del número global
mientras otro vale el 0,067 %. Plano lo elimina.

**b) `avanceAgregado` cuenta los hijos sin dato como 0.** Es la regla del 16.07, ya
usada por `/avance-direcciones` y el TV. Consecuencia que hay que decir en voz alta
antes de que la vean: **el número va a bajar mientras se clasifica**, porque cada
proyecto nuevo entra aportando cerca de 0.

**c) El rótulo no dice "cumplimiento".** Dice "Ejecución del POA 2026 atribuida a
este ámbito", y nunca va solo: siempre "62 % — 18 de 41 proyectos imputados tienen
datos". Con denominadores que van de 1 a 60, el ranking entre ejes sin la N es
engañoso.

**d) La cobertura, no el %, es el número principal de los primeros meses.**
`(imputados confirmados + excluidos) / proyectos activos`, con desglose por
secretaría. El % de cada nodo va en gris con la leyenda "cobertura parcial" hasta que
la cobertura global pase un piso (sugerido 60 %) y el nodo tenga al menos 3 proyectos
con datos. El umbral va en `periodo.configuracion`, donde ya viven los
`umbrales_semaforo`.

> La "cobertura por ámbito" **no es computable**: no existe ningún mapa ámbito → áreas,
> así que no se puede saber si a un ámbito le faltan 3 proyectos o 200 — ese es
> justamente el dato que se está construyendo. Sólo global y por secretaría.

### Los tres estados de un proyecto

| Estado | Cómo se ve | ¿Entra al %? |
|---|---|---|
| Sin imputar | fila propia "Sin imputar (N proyectos)", clickeable | no, en ningún denominador |
| Excluido a propósito | cuenta como cobertura resuelta, con motivo | no |
| Imputado sin datos | cuenta en "imputados", no en "con datos" | aporta 0; si ninguno del nodo tiene dato, el nodo va a `sin_datos`, nunca a 0 % |

---

## 7. Dos hallazgos sobre lo que ya está en producción

Los dos verificados en el código. **Ninguno se toca dentro de este trabajo**, pero
condicionan el tablero.

### 7.1 Ya conviven dos fórmulas distintas de avance

El número grande del Panel Ejecutivo y del modo TV sale de
[`avanceGlobalPorConteo`](src/lib/utils.ts#L379):

```ts
return Math.round(((d.verde + d.amarillo) / total) * 100);
```

Es **(verde + amarillo) / total**, no un promedio de porcentajes. Un proyecto al 1 %
está en amarillo y aporta 100. Si los 441 proyectos estuvieran al 5 %, ese gauge
marca ~100 % y un promedio marca 5. **No son dos redondeos, son dos escalas.**

Usado en [`dashboard/page.tsx:146`](src/app/(main)/dashboard/page.tsx#L146) y
[`tv-panel.tsx:76`](src/app/tv/tv-panel.tsx#L76).

**Consecuencia para el Plan Rector:** poner "Ámbito A1: 22 %" al lado de
"Cumplimiento global del POA: 74 %" garantiza una reunión incómoda. En el tablero del
Plan Rector va **una sola** métrica, la de la sección 6, con su rótulo.

### 7.2 La regla de plazo está inerte en el panel, pero activa en la ficha

[`getIndicadoresAvance`](src/lib/queries.ts#L325) **no trae** `fecha_inicio` ni
`fecha_fin` del indicador. Y [`estadoPlazo`](src/lib/utils.ts#L411) con las dos
fechas ausentes devuelve `"sin_plazo"`:

```ts
if (!inicio && !fin) return "sin_plazo";
```

Así que `avanceIndicadorEnPlazo` nunca descarta un indicador por "programado" en
dashboard, TV ni avance-direcciones. En cambio `/proyectos/[id]` hace `select("*")`,
sí tiene las fechas y **sí** aplica la regla.

**O sea: el mismo proyecto puede mostrar un porcentaje distinto en el panel y en su
propia ficha, hoy, en producción.**

Agregar las dos columnas al `select` es una línea, pero **cambia todos los números
del POA**. Va como cambio aparte, medido y avisado — no colado dentro de esto.

---

## 8. Las preguntas para Planificación Estratégica

Las cuatro primeras son bloqueantes del modelo o del tablero. Ver
`INTEGRACION_SISTEMAS_INTERNOS.md` para el formato de página compartible.

**Bloqueantes**

1. **¿Un proyecto puede estar vinculado a más de un eje, y si está en dos, en cuál se
   cuenta?** En 31 de 63 proyectos de la muestra al menos un criterio dice que aporta
   a más de un eje; en 12 lo dicen los cuatro. Los Puntos Verdes están nombrados en el
   eje 6 (Ecopuntos) y en el 4 (separación de residuos): son los dos.
   *Cambia el código:* si es "uno solo", la tabla es 1:1. Si es "varios", es N:N con
   principal y **el tablero no puede sumar 100 % por ámbito**. Es la más cara de revertir.

2. **¿"Sin vínculo al Plan Rector" es una respuesta válida?** En 35 proyectos los
   cuatro criterios coinciden en que no encaja (auditoría de reparaciones,
   indumentaria institucional, acreditación de periodistas). Según cómo se resuelvan
   las preguntas 5 y 6, puede subir a 180.
   *Cambia el código:* si no es válido, esos proyectos ensucian el promedio de algún
   eje ajeno para siempre.

3. **Hay cuatro cosas nombradas dos veces en el propio Plan Rector, en ámbitos
   distintos. ¿Cuál manda?** (ver sección 4). Probablemente no lo tengan detectado;
   este hallazgo solo ya justifica la reunión.

4. **¿A qué nivel hace falta el vínculo para la primera entrega?** Pidieron llegar a
   línea estratégica. Medido: ámbito 84 %, eje 76 %, línea no se puede ni medir.
   *Cambia el código:* define si la primera entrega es publicable o si arranca con las
   63 líneas en gris, que se va a leer como "la herramienta no funciona".

**Definen ~150 proyectos, pero no el esquema**

5. **¿Los actos y efemérides se vinculan al eje del colectivo destinatario, o quedan
   fuera?** Al menos 42 proyectos.
6. **¿Y la capacitación del plantel, las compras de infraestructura propia y las
   auditorías internas?** 29 más.
7. **¿Un proyecto de digitalización hecho por un área sectorial cuenta como Smart City
   o como logro del área?** 17 casos. Si va a Smart City, el eje 10 se infla y las
   sectoriales aparecen sin avance; si va al área, el TRADI parece no ejecutarse.
8. **¿Dónde se imputan los temas que el plan no nombra?** 27 proyectos de
   discapacidad, ~9 de bromatología, ~15 de Defensa Civil. Es la más política de la lista.

**Conviene preguntar antes que todo lo demás**

9. **¿Existe la planilla de cumplimiento en Google Sheets que mencionaron?** Si existe,
   puede traer parte del mapeo que estamos por producir a mano, y además habría que
   conciliar dos números calculados con métodos distintos. **Preguntar esto antes de
   mandar a mapear 441 proyectos.**

---

## 9. Plan por etapas

| Etapa | Qué | Depende del cliente | Esfuerzo |
|---|---|---|---|
| **1** | Migración 044: esquema + seed de los 104 nodos y los 14 ODS desde `plan-rector.json` | **no** | **hecha** (`6acc503`) |
| **2** | Pantalla `/plan-rector` de solo lectura: árbol de 5 ámbitos → 17 ejes → objetivos → líneas, con ODS. Sin números todavía | **no** | **hecha** (`6acc503`) |
| **3** | UI de imputación: asignar proyecto → nodo, con estado propuesto/confirmado y la exclusión con motivo. Repartida por dirección | **no** | **hecha** (`6acc503`) |
| **4** | Sugerencias por lote: precargar los ~190 de acuerdo unánime como `propuesto` para que cada área solo confirme | pregunta 4 | ~1 día |
| **5** | El cálculo y el tablero con números | **sí — preguntas 1, 2, 4** | ~2 días |
| **6** | Ítem en el sidebar + modo TV | no | ~medio día |

**Las etapas 1 a 3 están hechas.** La 5 es la que hay que esperar: si se
implementa el cálculo antes de que definan si un proyecto puede colgar de varios
ejes, se rehace.

### Para aplicarlo

1. Aplicar `supabase/migrations/044_plan_rector.sql`.
2. Cargar la jerarquía: `npx tsx supabase/import/500_import_plan_rector.ts`
   (acepta `--dry-run`).

El orden respecto del deploy no importa: las lecturas del Plan Rector degradan si
las tablas todavía no existen, así que la pantalla muestra el estado vacío en vez
de tirar 500.

### Verificación de la migración 044 (31.08)

Corrida completa contra la base **dentro de una transacción revertida**, con
autorización de Lucas. **26 casos, ninguna falla.** Al terminar,
`to_regclass('public.plan_rector_nodo')` volvió a ser NULL: no quedó nada
aplicado.

Cubrió: que la migración corra entera y sea idempotente (corre dos veces sin
error); las 6 tablas, 3 enums, 14 policies, 4 triggers y el índice único; los
CHECK de tipo↔nivel y de nombre vacío; el trigger que valida el tipo del padre;
que un proyecto no se pueda imputar directo a un ámbito; que `principal` exija
estado confirmado; que no pueda haber dos vínculos principales por proyecto; y la
RLS con sesión simulada — un director no puede insertar un vínculo ya confirmado
ni marcado como principal, ni declarar un proyecto fuera del plan, ni editar la
jerarquía, y el admin funcional sí.

> Nota al margen, **preexistente y no introducida acá**: `authenticated` tiene
> `TRUNCATE` sobre estas tablas, igual que sobre las 10 que ya existían
> (`proyecto`, `meta`, `indicador`, `perfil_usuario`…). Es el default de Supabase
> para el schema `public`. `TRUNCATE` no respeta RLS, pero PostgREST no lo expone,
> así que no es alcanzable desde la app ni desde la API. Si algún día se quiere
> cerrar, es un `REVOKE TRUNCATE ON ALL TABLES IN SCHEMA public` global — decisión
> aparte de este trabajo.

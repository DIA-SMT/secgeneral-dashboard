# Correcciones 24.08 — Plan de trabajo

**Fecha del pedido:** 24 de agosto de 2026
**Documento fuente:** `Modificaciones PLANIA.docx`, páginas 36 a 38
**Rama de trabajo:** `lucas` (nunca commitear a `main`: Vercel despliega `main` automáticamente)

---

## 0. Qué pidieron, textual

Las tres páginas contienen 8 pedidos y 1 pregunta. Transcripción resumida con el
identificador que se usa en el resto del documento:

| ID | Pág. | Pedido |
|---|---|---|
| **A** | 36 | "Cuando usamos el modo de visualización blanco, no se ve la flecha que marca el porcentaje de avance en el gráfico." |
| **B** | 36 | "Incorporar una herramienta para medir los avances del Plan Rector" — como ítem nuevo del menú lateral (la captura señala el sidebar). |
| **C** | 37 | Vincular los proyectos (con metas e indicadores) a la jerarquía del Plan Rector: ámbito de intervención → eje estratégico → objetivos estratégicos → líneas estratégicas → ODS. Fuente: Google Sheets de cumplimiento. |
| **D** | 37 | "Incorporar la posibilidad de cargar datos en los indicadores utilizando el chatbot." |
| **E** | 37 | Herramienta para mandar mensajes de alerta. Manual (ej.: "Presentación de informes de grado de avance: 01 de octubre...") + automática cuando los indicadores están próximos a vencer. |
| **F** | 37-38 | Cargar los teléfonos de los usuarios en el sistema (la captura señala la pantalla de Usuarios). |
| **G** | 38 | Los mensajes deben poder ser masivos (todos los usuarios) **y** individuales. Ambas opciones. |
| **H** | 38 | "Crear la posibilidad de cargar proyectos directamente en la secretaría de Innovación Tecnológica." |
| **I** | 38 | **Pregunta:** hay direcciones con bases de datos internas propias. ¿Se pueden entrelazar con este sistema? |

---

## 1. Diagnóstico previo (ya verificado en el código)

Antes de estimar hizo falta leer el código. Esto es lo que se encontró:

### A — La aguja del gauge está hardcodeada en blanco

[`src/components/ui/gauge-cumplimiento.tsx:95`](src/components/ui/gauge-cumplimiento.tsx#L95) y `:97`
pintan la aguja con `fill="#F9FAFB"`. Ese valor es exactamente `--fg` del **modo
oscuro** ([`globals.css:31`](src/app/globals.css#L31)). En modo claro `--fg` pasa a
`#111827` y la tarjeta queda blanca (`--srf: #FFFFFF`), así que la aguja blanca sobre
fondo blanco desaparece. Reproducción exacta de lo que muestra la captura.

El resto del componente ya usa las clases correctas (`fill-foreground`, `fill-muted`),
así que el arreglo es alinear la aguja con ese mismo criterio.

**Mismo defecto, otros dos lugares** (no los mencionaron, pero es la misma familia):

| Archivo | Línea | Valor hardcodeado | Qué es |
|---|---|---|---|
| `src/components/ui/circular-progress.tsx` | 36 | `stroke="#1F2937"` | pista del anillo (= `--brd` oscuro) |
| `src/components/ui/semaforo-gauge.tsx` | 118 | `stroke="#1F2937"` | pista del gauge |

En modo claro esos dos se ven gris oscuro sobre blanco: no desaparecen, pero quedan
pesados y fuera de la paleta.

### D — El chatbot es solo lectura *por diseño*, y la tool de escritura está rota

Dos cosas separadas:

1. **Está bloqueada.** [`src/app/api/chat/route.ts:12`](src/app/api/chat/route.ts#L12)
   define `READ_ONLY_TOOLS` y filtra dos veces: `toolsToOpenAI()` no le muestra al
   modelo las tools de escritura, y `executeTool()` las rechaza con *"El asistente es
   solo de consulta"*. `actualizar_indicador` **no** está en esa lista.

2. **Si se destrabara hoy, no escribiría nada.** `actualizarIndicador()`
   ([`tools.ts:665`](src/lib/chat/tools.ts#L665)) es una de 9 funciones que **no**
   crean su cliente con `getSupabaseServer()` y caen al cliente importado a nivel de
   módulo ([`lib/supabase.ts:8`](src/lib/supabase.ts#L8)), que es **anon sin sesión**
   (verificado: el claim `role` del JWT es `anon`).

   La policy `indicador_update_carga` ([`012_rls_policies.sql:91`](supabase/migrations/012_rls_policies.sql#L91))
   exige `usuario_puede_cargar_unidad()`, que resuelve por `auth.uid()`. Sin sesión,
   `auth.uid()` es NULL → **0 filas afectadas**. Y un UPDATE que no matchea filas por
   RLS **no devuelve error** en Supabase, así que la función devolvería
   `{success: true, mensaje: "Indicador actualizado."}` sin haber escrito nada. Falla
   silenciosa: el chatbot le diría al usuario que cargó el dato.

   Las otras 8 en la misma situación: `proponerCargaAvance`, `confirmarCargaAvance`,
   `proponerCompletarHito`, `confirmarCompletarHito`, `validarAvanceChat`,
   `observarAvanceChat`, `proponerActividadAgenda`, `confirmarActividadAgenda`. Hoy no
   hacen daño porque están todas bloqueadas por `READ_ONLY_TOOLS`.

3. **No deja rastro.** Tampoco escribe en `indicador_historial`, así que la carga por
   chatbot sería invisible en el Historial de Carga que se agregó el 30.07
   ([`028_historial_carga_indicador.sql`](supabase/migrations/028_historial_carga_indicador.sql)).
   Y no maneja `valor_actual_texto` (migración 015).

### F — No existe el campo teléfono

`perfil_usuario` ([`010_rbac.sql:22`](supabase/migrations/010_rbac.sql#L22)) tiene
`email`, `nombre`, `rol`, `unidad_id`, `activo`, `metadata` (jsonb) y `acceso_global`.
No hay teléfono en ninguna tabla. Hace falta migración.

### E / G — No hay nada de infraestructura de mensajería

Cero: no hay Resend, Nodemailer, SendGrid, Twilio, WhatsApp API ni SMTP en el proyecto.
Lo único de "alertas" que existe es el umbral `dias_sin_actualizar_alerta: 15` en
`periodo.metadata` y los textos del panel. **Esto se construye de cero.**

Lo que sí hay y sirve: el patrón de cron ya está montado en
[`.github/workflows/supabase-keepalive.yml`](.github/workflows/supabase-keepalive.yml)
(GitHub Actions, `cron` dos veces al día). Es el lugar natural para el disparador
automático.

### H — Falta el diagnóstico de fondo (bloqueado)

El código **ya permite** crear proyectos a nivel secretaría:
`crearProyecto()` ([`actions.ts:1164`](src/lib/actions.ts#L1164)) acepta los roles
`director`, `subsecretario`, `secretario`, `coordinador`, `admin_funcional`, y
[`proyectos/page.tsx:210`](src/app/(main)/proyectos/page.tsx#L210) llena el selector con
`nivel >= 0` (o sea, incluye secretarías) para `admin_funcional`, `secretario` y
`subsecretario`. La policy `proyecto_insert_carga` (017) también lo habilita.

**Pero se encontró un bug real ahí mismo:** el rol `coordinador` **sí** está en
`rolesCarga` (línea 43), así que ve el botón "+ Nuevo proyecto" y `esAdmin` le queda
`true` (exige elegir área) — pero el ternario de `direcciones` (líneas 210-224) no tiene
rama para `coordinador`, cae en `: []` y **el selector le queda vacío**. Un coordinador
ve el botón y nunca puede crear un proyecto. RLS sí lo permitiría (migración 029).

No puedo cerrar el diagnóstico de H sin ver la base: no sé si la Secretaría de
Innovación Tecnológica existe como `unidad_organizacional` activa, en qué nivel, ni con
qué rol está cargada la persona que necesita usarla. La captura de la página 38 la
muestra con rol *Secretario*, lo que **debería** funcionar — así que falta un dato.

---

## 2. Plan por fases

Ordenado por riesgo y por dependencias, no por el orden del documento. Cada fase cierra
en un commit propio sobre `lucas`.

### Fase 1 — Contraste en modo claro (A)

| | |
|---|---|
| **Alcance** | Aguja del gauge → `className="fill-foreground"`. Pistas de `circular-progress` y `semaforo-gauge` → `className="stroke-border"`. |
| **Archivos** | `ui/gauge-cumplimiento.tsx`, `ui/circular-progress.tsx`, `ui/semaforo-gauge.tsx` |
| **Migración** | no |
| **Riesgo** | muy bajo — solo presentación, tokens ya existentes |
| **Verificación** | dev server, `/dashboard` y `/tv` en modo claro y oscuro, más `/proyectos/[id]` (MiniGauge) |
| **Esfuerzo** | ~30 min |

### Fase 2 — Teléfonos en usuarios (F)

Es prerequisito de E/G si el canal elegido es WhatsApp o SMS.

| | |
|---|---|
| **Alcance** | Columna `telefono` en `perfil_usuario` + alta/edición en `/admin/usuarios`. Normalización a formato E.164 (`+549381...`) y validación. |
| **Archivos** | migración `041_telefono_usuario.sql`, `components/admin/usuarios-table.tsx`, `components/admin/crear-usuario-form.tsx`, `lib/actions.ts`, `types/database.ts` |
| **Migración** | sí — `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, idempotente, reversible |
| **Riesgo** | bajo — columna nueva nullable, no toca nada existente |
| **Verificación** | crear y editar un usuario de prueba; confirmar que RLS de `perfil_update_admin` sigue aplicando |
| **Esfuerzo** | ~2 h |

### Fase 3 — Carga de indicadores por chatbot (D)

No es "agregar una tool": es hacer que la escritura por chat funcione y quede auditada.

| | |
|---|---|
| **Alcance** | 1) `actualizarIndicador` pasa a `getSupabaseServer()` (sesión real, RLS efectiva). 2) Inserta en `indicador_historial` con autoría, igual que el formulario web. 3) Soporta `valor_actual_texto`. 4) Recalcula semáforo con el mismo helper que la UI (`avanceIndicador`/`avanceAgregado`), sin duplicar la fórmula. 5) Flujo proponer→confirmar, como el resto de las acciones del chat, para que el usuario vea qué se va a escribir. 6) Se habilita **solo** `actualizar_indicador` en `READ_ONLY_TOOLS` (renombrada), las otras 8 quedan bloqueadas hasta arreglarlas. |
| **Archivos** | `lib/chat/tools.ts`, `lib/chat/tool-definitions.ts`, `app/api/chat/route.ts`, `lib/chat/system-prompt.ts`, `components/chat/proposal-card.tsx` |
| **Migración** | no |
| **Riesgo** | **medio-alto** — es la primera escritura desde el chat en producción. Mitigación: flujo con confirmación explícita, RLS como red de seguridad, y todo queda en `indicador_historial` (append-only) para poder auditar y revertir. |
| **Verificación** | con un usuario `director` real de prueba: cargar un indicador de su dirección (debe funcionar y aparecer en el Historial) e intentar cargar uno de otra dirección (debe rechazarlo RLS, no un `if` de la app) |
| **Esfuerzo** | ~1 día |

> **Nota aparte:** las otras 8 funciones con cliente sin sesión merecen su propia tanda.
> Hoy no son explotables (están bloqueadas), pero son una trampa: cualquiera que
> agregue una tool a la lista blanca en el futuro se lleva la falla silenciosa puesta.
> Propongo arreglarlas todas juntas en un commit separado de limpieza.

### Fase 4 — Mensajes de alerta (E + G)

**Bloqueada:** hace falta decidir el canal antes de escribir una línea (pregunta 1).

| | |
|---|---|
| **Alcance** | Tabla `mensaje_alerta` (destinatarios, canal, cuerpo, estado, timestamps, quién lo mandó). Pantalla de composición con dos modos: masivo y por usuario. Envío manual. Job automático de indicadores próximos a vencer vía GitHub Actions, reusando el patrón del keepalive. Registro de entregas para no duplicar envíos. |
| **Archivos** | migración `042_mensaje_alerta.sql`, `app/(main)/admin/alertas/`, `app/api/alertas/`, `.github/workflows/alertas.yml`, `lib/actions.ts` |
| **Migración** | sí |
| **Riesgo** | **alto** — manda comunicaciones reales a funcionarios. Mitigación obligatoria: modo borrador + previsualización con la lista exacta de destinatarios, confirmación explícita antes de enviar, límite de envío, y un "enviar solo a mí" para probar. Nada de envío masivo sin un dry-run visible. |
| **Verificación** | dry-run a una sola dirección propia antes de habilitar el masivo |
| **Esfuerzo** | ~3-4 días (depende fuerte del canal) |

### Fase 5 — Plan Rector (B + C)

Esto **no es una corrección, es un subsistema nuevo.** Es la pieza más grande de las
tres páginas, probablemente más trabajo que todo el resto sumado.

| | |
|---|---|
| **Alcance** | 1) Modelo de datos de la jerarquía: ámbito de intervención → eje estratégico → objetivo estratégico → línea estratégica → ODS. 2) Import de la planilla (mismo patrón que `supabase/import/`, con `xlsx` que ya está en devDependencies). 3) Tabla de vinculación proyecto ↔ línea estratégica (probablemente N:N). 4) Agregación de avance: los indicadores de los proyectos suben por el árbol hasta ámbito de intervención. 5) Página `/plan-rector` + ítem en el sidebar. 6) Vista por ODS. |
| **Archivos** | migraciones `043_plan_rector.sql` + `044_vinculacion_proyecto_plan_rector.sql`, `supabase/import/500_import_plan_rector.ts`, `app/(main)/plan-rector/`, `components/layout/sidebar.tsx`, `lib/queries.ts` |
| **Migración** | sí, varias |
| **Riesgo** | medio en lo técnico, **alto en lo metodológico**: si la vinculación proyecto↔línea estratégica se modela mal o se carga mal, todos los porcentajes del Plan Rector salen mal y hay que rehacer la carga. Conviene cerrar el modelo con Planificación Estratégica antes de escribir SQL, igual que se hizo con `MATRIZ_VALIDACION_POA.md`. |
| **Verificación** | contra los totales de la planilla: el % que calcula el sistema tiene que dar igual que el de la planilla, ámbito por ámbito |
| **Esfuerzo** | ~2 semanas, y depende de la calidad de la planilla |

### Fase 6 — Carga de proyectos en Innovación Tecnológica (H)

**Parcialmente bloqueada:** falta el diagnóstico (pregunta 3).

| | |
|---|---|
| **Alcance** | Lo que ya se puede cerrar: agregar la rama `coordinador` al selector de `proyectos/page.tsx` para que el rol deje de ver un botón inútil. Lo que falta: identificar por qué no puede cargar quien tiene que cargar en Innovación Tecnológica. |
| **Archivos** | `app/(main)/proyectos/page.tsx`, y lo que salga del diagnóstico |
| **Riesgo** | bajo |
| **Esfuerzo** | ~1 h el bug del coordinador; el resto no estimable sin el diagnóstico |

### Fase 7 — Respuesta a la pregunta I

No es desarrollo: es una respuesta técnica escrita sobre integración con bases de datos
de terceros (opciones, requisitos, esfuerzo). Se redacta al final, cuando estén cerradas
las decisiones de las fases anteriores, y va como sección de este documento.

---

## 3. Resumen de esfuerzo

| Fase | Pedido | Esfuerzo | Estado |
|---|---|---|---|
| 1 | A — contraste modo claro | ~30 min | **hecha** (`e3a7f40`) |
| 2 | F — teléfonos | ~2 h | **hecha** (`5da0a1b`) · migración 041 aplicada |
| 3 | D — chatbot escribe indicadores | ~1 día | **hecha** (`36cd163`) |
| 4 | E + G — alertas dentro del sistema | ~1 día | **hecha** (`a2fb516`) |
| 5 | B + C — Plan Rector | ~2 semanas | proyecto aparte |
| 6 | H — Innovación Tecnológica | ~2 h | **hecha** (`4d8ca1f`) |
| 7 | I — respuesta | ~1 h | **hecha** (`234a67d`) · ver [INTEGRACION_SISTEMAS_INTERNOS.md](INTEGRACION_SISTEMAS_INTERNOS.md) |

Las migraciones **041, 042 y 043 están todas aplicadas**, y verificadas contra la
base el 26.08. De las tres páginas del documento queda solo el **Plan Rector**
(B + C), que se toma como proyecto aparte con su propia matriz de decisiones.

---

## 4. Decisiones tomadas (26.08)

| # | Decisión | Consecuencia |
|---|---|---|
| 1 | ~~Las alertas van por email.~~ **Revisado el 26.08: las alertas van DENTRO del sistema**, campanita en la barra de arriba + cartel para las importantes. | Sin proveedor externo, sin costo por mensaje, sin plantillas que aprobar. Bajó el esfuerzo de la fase 4 de ~3-4 días a ~1. Los teléfonos (fase 2) quedan igual, para cuando se sume WhatsApp. |
| 2 | **Las alertas automáticas de vencimiento no se guardan: se calculan al leer.** | La alerta refleja la realidad: aparece cuando el indicador está por vencer y se va sola cuando lo cargan. No se puede tapar sin resolverlo y no hay filas repetidas ni desactualizadas que mantener. |
| 3 | **El Plan Rector entra por XLSX con import versionado**, mismo patrón que el POA 2026 (`supabase/import/`, con `xlsx` que ya está en devDependencies). | Reproducible y auditable en el repo. Si cambia la planilla, se vuelve a correr el import; no hay dependencia viva de Google. |
| 4 | **Autorizadas las consultas de solo lectura** contra la base de producción. | Se usó para cerrar el diagnóstico de H, verificar el límite de permisos de la fase 3, medir el alcance del cambio de permisos y comparar las policies de agenda antes de reescribirlas. |
| 5 | **Se arranca por las fases 1-3**; el Plan Rector va como proyecto aparte con su propia matriz de decisiones. | Hecho, y después se sumaron la 4 y la 6. Seis commits chicos y revisables en vez de uno gigante sobre una herramienta en producción. |
| 6 | **Las migraciones las aplica Lucas.** | Las tres corrieron el 26.08. Verificado con la sesión simulada: el director de Innovación Tecnológica ahora carga y ve su secretaría, y su agenda quedó afuera (`agenda secretaria = false`). En la 043, `authenticated` quedó con permiso solo sobre `leida_at` y cero UPDATE a nivel tabla. |
| 7 | **El Director pasa a cargar POA en su secretaría, pero NO la agenda.** | `usuario_puede_cargar_unidad` la usaban 10 policies, dos de agenda. Ampliarla sin más le daba a los 53 directores permiso de escritura sobre la agenda de su secretario. La regla de agenda quedó separada en su propia función. |

---

## 5. Estado de la base (verificado el 26.08)

Consultas de solo lectura sobre producción. Lo relevante:

- **Todas las migraciones hasta la 041 están aplicadas.** Quedan por aplicar la 042 (permisos del director) y la 043 (alertas).
- **72 perfiles activos**: 11 secretarios, 3 subsecretarios, 53 directores, 3 coordinadores, 2 admin funcionales. No hay ningún perfil `intendenta` ni `admin_tecnico`. Ese es el volumen de teléfonos a cargar.
- **Período activo**: "Plan Operativo Anual 2026", correcto.
- **Innovación Tecnológica** existe y está bien armada: la Secretaría en nivel 0 con 2 direcciones hijas, y `ddsitec@smt.gob.ar` como Secretario de ella. Tiene 0 proyectos propios, pero no por una restricción del sistema.

### El caso H, cerrado

Se evaluó `usuario_puede_cargar_unidad` con la sesión de cada usuario simulada
(`SET LOCAL request.jwt.claims`, que es como Supabase resuelve `auth.uid()`),
todo dentro de transacciones con `ROLLBACK`:

| Usuario | Rol | Sobre la Secretaría | Sobre su Dirección | Sobre otras áreas |
|---|---|---|---|---|
| `ddsitec@smt.gob.ar` | secretario | **sí** | sí | no |
| `ditec@smt.gob.ar` | director | **no** | sí | no |

O sea: **el Secretario ya podía cargar proyectos en la Secretaría de Innovación
Tecnológica.** El Director no, y eso era por diseño.

**Resuelto el 26.08 (migración 042, commit `4d8ca1f`):** se decidió cambiar la
regla. Ahora un director carga POA en su unidad y en las de arriba (su
subsecretaría si tiene, y su secretaría). No en las direcciones hermanas.

Hizo falta ampliar también la **visibilidad**: verificado contra la base, un
director tenía `ve_su_direccion = true` pero `ve_la_secretaria = false`. Sin
tocar eso habría creado proyectos que después no podía ver — y peor, el INSERT
de `crearProyecto` lleva `RETURNING`, que pasa por la policy de SELECT, así que
la operación se habría visto como fallada aunque la fila se escribiera.

Alcance real de la ampliación, medido sobre los datos de hoy:

| Qué | Cuánto |
|---|---|
| Directores en direcciones (nivel 2) | 49 |
| Directores en subdirecciones (nivel 3) | 4 |
| Unidades ancestras de un director **con proyectos propios** | 1 — Dirección de Museos |
| Proyectos que cambian de manos | 8 (10 metas, 13 indicadores), los de Museos |
| Secretarías con proyectos propios | 2 (Ambiente 19, Contaduría 9), **sin directores debajo** |

O sea: nadie gana acceso a las secretarías que ya tienen POA cargado. Lo que se
gana es poder crear. El único traspaso real es que los 4 directores de
subdirección de Museos pasan a ver y cargar los 8 proyectos de su dirección
madre, que es razonable de todos modos.

---

## 6. Hallazgos fuera del pedido

Cosas que aparecieron al leer el código y que no son parte de las páginas 36-38.
Ninguna se tocó todavía; van acá para que no se pierdan.

| # | Hallazgo | Gravedad |
|---|---|---|
| 1 | **Las otras 8 tools de escritura del chatbot tienen la misma falla silenciosa** que tenía la de indicadores: escriben con el cliente anónimo sin sesión, RLS las deja en cero filas y Supabase no devuelve error, así que informarían éxito sin guardar. Hoy no hacen daño porque están bloqueadas, pero el que las habilite se lleva la falla puesta. Está anotado en `route.ts`. | media — latente |
| 2 | **`/tv` devuelve 500 sin sesión.** El middleware la trata como ruta pública, pero la página lee `periodo` con `.single()` y la policy `periodo_select_all` exige `auth.uid() IS NOT NULL`. Funciona en las pantallas de TV porque el navegador quedó logueado una vez. Si a alguna se le cae la sesión, muestra un error en vez del panel. | media |
| 3 | ~~El rol `coordinador` no puede crear proyectos.~~ **Arreglado** en `4d8ca1f`: el selector de área se armaba con un ternario por rol sin rama para coordinador, así que veía el botón con el desplegable vacío. Ahora los cuatro roles con permiso de carga salen de `unidadesQuePuedeCargar`, el espejo de la RLS. | resuelto |
| 4 | **`propuesta_carga` no aparece con RLS habilitada** en ninguna migración, a diferencia del resto de las tablas. Conviene confirmarlo contra la base: si es así, es accesible con la clave anónima. | a confirmar |
| 5 | `COLOR_PENDIENTE = "#4B5563"` en `semaforo-gauge.tsx` sigue siendo un gris oscuro fijo. En modo claro se ve, pero queda fuera de la paleta. No estaba en el pedido. | cosmética |

---

## 7. Reglas de trabajo para esta tanda

- Todo va a la rama `lucas`. `main` es lo que Vercel despliega; no se toca.
- Un commit por fase, con el mensaje en el estilo del repo (`corrección:`, `estructura:`, `tv:`).
- Las migraciones son idempotentes (`IF NOT EXISTS`) y llevan comentario de reversión al pie, como las 40 que ya están.
- Nada se da por cerrado sin verificar en el dev server o contra la base.
- Los cambios de escritura (fases 3 y 4) se prueban con un usuario de prueba antes de tocar datos reales.

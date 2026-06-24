# PlanIA — Guía de datos y operación

Guía de referencia para cargar/corregir datos del POA y entender la base del proyecto.
Pensada para retomar en futuras sesiones sin tener que reconstruir el contexto.

---

## 1. Qué es PlanIA

Dashboard de seguimiento del **Plan Operativo Anual (POA) 2026** de la Municipalidad de
San Miguel de Tucumán. Permite a cada área cargar avances de sus indicadores y a la
conducción ver el grado de cumplimiento.

- **Stack**: Next.js 16 (App Router, React 19) + TypeScript + Tailwind 4 + Supabase (Postgres + Auth + RLS).
- **Chatbot**: OpenRouter (Claude Sonnet) con tools de lectura/carga.
- **Deploy**: Vercel (auto-deploy desde `main` en GitHub `DIA-SMT/secgeneral-dashboard`).
- **Repo local**: `C:\repos\secgeneral-dashboard`.

---

## 2. Modelo de datos

Jerarquía organizacional (tabla `unidad_organizacional`, auto-referenciada por `parent_id`):

```
Secretaría (nivel 0)
  └─ Subsecretaría (nivel 1)        ← puede no existir
       └─ Dirección (nivel 2)
Proyecto → Meta → Indicador
```

| Tabla | Rol | Notas |
|---|---|---|
| `unidad_organizacional` | Áreas | `codigo` (SEC01.., DIR01..), `nivel`, `parent_id`, `responsable_nombre`, `activa` |
| `periodo` | Año POA | Hay uno con `activo = true` (2026) |
| `proyecto` | Proyectos | `codigo` (PRY..), `unidad_id`, `periodo_id`, `estado` |
| `meta` | Metas | `codigo` (MET..), `proyecto_id`, `tipo_medicion`, `valor_meta`, `nombre` (enunciado) |
| `indicador` | Indicadores | `codigo` (IND..), `meta_id`, `valor_actual`/`valor_actual_texto`, `valor_objetivo`/`valor_objetivo_texto`, `estado_semaforo` |
| `avance` | Histórico append-only | avances de metas; `fuente` (manual/correccion/chatbot) |
| `agenda_semana` / `agenda_actividad` | Agenda semanal por dirección | |
| `ficha_prisma` | Planificación POA 2027 (P/R/I/S/M/A) | |
| `perfil_usuario` | Vincula `auth.users` con `rol` + `unidad_id` | |

**El avance del proyecto/área se calcula desde los INDICADORES**, no desde las metas
(ver `calcularAvancePorIndicadores` en `src/lib/utils.ts`). Las metas son enunciados;
los indicadores son lo medible.

Los **códigos** (SEC/DIR/PRY/MET/IND) vienen del Excel y son la clave para importar de
forma idempotente y para re-vincular perfiles tras un re-import.

---

## 3. Variables de entorno (`.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      # admin API (crear usuarios, bypass RLS)
SUPABASE_DB_URL=...                # conexión directa pg (scripts de import)
OPENROUTER_API_KEY=...             # chatbot
```

⚠️ **`SUPABASE_DB_URL`**: usar la connection string del **Session pooler** de Supabase
(Settings → Database → Connection string → Session pooler). El host directo
`db.<ref>.supabase.co` ya no resuelve para proyectos nuevos. El usuario es
`postgres.<project-ref>`.

⚠️ En **Vercel** (producción) deben estar las mismas env vars, en especial
`SUPABASE_SERVICE_ROLE_KEY` (sino `/admin/usuarios` no lista usuarios). Tras cambiar una
env var hay que **Redeploy** (las funciones no la toman en caliente).

---

## 4. Formato del Excel del POA

Cada Excel de área tiene **2 hojas** (a veces solo la de POA si las unidades ya existen):

**Hoja de organigrama** (`Hoja1` / `Sheet2`):
```
id_secretaria | nombre_secretaria | nombre_subsecretaria | id_direccion | nombre_direccion | id_responsable | nombre_responsable
```
Las columnas de la izquierda solo aparecen al cambiar (relleno vertical): el parser
propaga el último valor visto.

**Hoja de POA** (`Sheet1` / `SGral` / etc.):
```
id_direccion | id_proyecto | nombre_proyecto | id_metas | descripcion_metas | id_indicador | nombre_indicador | valor_meta_semestral
```
- `id_direccion` puede traer un `DIR##` **o** un `SEC##` (proyectos que cuelgan directo de
  la secretaría, sin dirección intermedia — el dashboard los soporta).
- Typo conocido: `DIR1O` (letra O) en vez de `DIR10`. Los scripts lo normalizan.

---

## 5. Cómo cargar / corregir datos

Todos los scripts se corren desde la raíz del repo con `npx tsx` y usan `SUPABASE_DB_URL`.
Los `.sql` se pegan en el **SQL editor de Supabase**.

### 5.a Import COMPLETO (truncate + reimport) — `supabase/import/200_import_poa_2026.ts`
Borra todo el POA y lo reimporta desde el Excel maestro. **Preserva auth/perfiles**
(los re-vincula por `codigo` de unidad; desactiva los que quedan huérfanos).
```bash
npx tsx supabase/import/200_import_poa_2026.ts "C:\ruta\al\excel.xlsx"
```
Usar solo cuando se reemplaza toda la planificación. Pierde avances cargados.

### 5.b Import ADITIVO de un área nueva — `supabase/import/400_import_servpub.ts`
Agrega una secretaría/área sin truncar ni tocar lo existente. Idempotente (saltea por
`codigo` lo ya cargado). Reutilizable para cualquier Excel con el mismo formato.
```bash
npx tsx supabase/import/400_import_servpub.ts "C:\ruta\al\excel.xlsx"
```

### 5.c Reasignar la dirección de proyectos (corrección) — `supabase/import/401_reasignar_ambiente.ts`
Cuando un proyecto quedó en la dirección equivocada. Lee el Excel (autoritativo) y hace
solo `UPDATE proyecto.unidad_id`. No toca metas/indicadores/avances. Idempotente.
```bash
npx tsx supabase/import/401_reasignar_ambiente.ts "C:\ruta\al\excel.xlsx"
```
(Ajustar el nombre de la hoja dentro del script si difiere: `Hoja 1` / `Sheet1`.)

### 5.d Crear usuarios masivamente — `supabase/import/301_crear_usuarios.ts`
Da de alta usuarios en Supabase Auth (email + password temporal, email confirmado).
No les asigna rol/área (eso se hace luego en `/admin/usuarios`).
```bash
npx tsx supabase/import/301_crear_usuarios.ts
```

> Para crear UN usuario puntual: usar el panel **/admin/usuarios → "+ Nuevo usuario"**
> (lo puede hacer admin_funcional / admin_tecnico). Después se le asigna rol + unidad
> en la sección "Usuarios sin asignar".

### 5.e Snippet base para un script de DB ad-hoc
Todos los scripts cargan el `.env.local` así (copiar de cualquiera en `supabase/import/`):
```ts
import { Client } from "pg";
import fs from "fs"; import path from "path";
const content = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").replace(/^﻿/, "");
for (const raw of content.split(/\r?\n/)) {
  const line = raw.trim(); if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("="); if (eq === -1) continue;
  const k = line.slice(0, eq).trim(); let v = line.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (k && !process.env[k]) process.env[k] = v;
}
const db = new Client({ connectionString: process.env.SUPABASE_DB_URL }); await db.connect();
```

---

## 6. Migraciones (`supabase/migrations/`)

Se aplican **en orden** en el SQL editor de Supabase. Las 001–008 son el esquema base.
Resumen de las relevantes para datos/permisos:

| # | Qué hace |
|---|---|
| 009 | Reset para reimport completo (truncate) — solo si se reimporta todo |
| 010 | **RBAC**: enum `rol_usuario`, tabla `perfil_usuario`, funciones de permiso (`usuario_puede_ver_unidad`, `usuario_puede_cargar_unidad`, `unidades_descendientes`, etc.) + RLS de perfil |
| 011 | Validación de avances (estado_validacion en `avance`) |
| 012 | **RLS** en proyecto/meta/indicador/avance/agenda/periodo/unidad. Activa el control de acceso. Correr con al menos 1 admin cargado |
| 013 | Columna `codigo` en `unidad_organizacional` |
| 014 | Afloja constraints de `meta` (permite metas sin valor_meta) |
| 015 | `valor_actual_texto` / `valor_objetivo_texto` / `observacion` en `indicador` (indicadores Sí/No) |
| 016 | Tabla `ficha_prisma` (POA 2027) |
| 017 | Directores pueden crear proyectos / crear-editar metas (RLS) |
| 018 | Secretario/Subsecretario cargan como director pero sobre **todas** sus direcciones |

---

## 7. Roles y permisos

| Rol | Alcance | Puede |
|---|---|---|
| `intendenta` | Global | Ver todo (lectura) |
| `secretario` | Su secretaría + descendientes | Ver + **cargar/crear/editar** en todas sus direcciones |
| `subsecretario` | Su subsec + direcciones | Ver + cargar + **validar** avances |
| `director` | Su dirección | Ver + cargar/crear/editar en su dirección |
| `admin_funcional` (Planif. Estratégica) | Global | Todo: editar POA, validar, gestionar perfiles |
| `admin_tecnico` (Sistemas) | Global | Gestión de usuarios/infra (no edita contenido del POA) |

- La **RLS** filtra los datos por scope (un director solo lee/escribe su dirección).
- La **UI** además acota selectores/filtros al área del usuario (no-globales no ven el
  selector de ámbito; ven solo su rama).
- `usuario_puede_cargar_unidad()` (migración 018) es la función central de permiso de
  escritura: admin_funcional siempre; director = unidad exacta; secretario/subsec =
  descendientes de su unidad.

---

## 8. Operaciones SQL comunes

```sql
-- Período activo
SELECT id, nombre FROM periodo WHERE activo;

-- Distribución de proyectos por unidad (verificar tras import/reasignación)
SELECT uo.codigo, uo.nombre, count(*) AS proyectos
FROM proyecto p JOIN unidad_organizacional uo ON uo.id = p.unidad_id
GROUP BY uo.codigo, uo.nombre ORDER BY uo.codigo;

-- Totales del POA del período activo
SELECT
  (SELECT count(*) FROM proyecto WHERE periodo_id=(SELECT id FROM periodo WHERE activo)) proyectos,
  (SELECT count(*) FROM meta WHERE proyecto_id IN (SELECT id FROM proyecto WHERE periodo_id=(SELECT id FROM periodo WHERE activo))) metas,
  (SELECT count(*) FROM indicador WHERE deleted_at IS NULL) indicadores;

-- Reasignar un proyecto a otra unidad (corrección puntual)
UPDATE proyecto SET unidad_id = (SELECT id FROM unidad_organizacional WHERE codigo='DIR42')
WHERE codigo = 'PRY311';

-- Desactivar una dirección que no va (la oculta del tablero, no la borra)
UPDATE unidad_organizacional SET activa=false WHERE codigo='DIR43';

-- Ver perfiles y su área
SELECT pu.email, pu.rol, uo.codigo, uo.nombre
FROM perfil_usuario pu LEFT JOIN unidad_organizacional uo ON uo.id = pu.unidad_id
ORDER BY pu.rol;

-- Asignar/cambiar rol de un usuario por email
UPDATE perfil_usuario SET rol='admin_funcional', unidad_id=NULL
WHERE email='dipes.smt@gmail.com';
```

---

## 9. Gotchas / cosas que ya pasaron

- **Error 401 "User not found" del chat** = API key de OpenRouter vencida/inválida →
  renovar `OPENROUTER_API_KEY` y reiniciar/redeploy.
- **`set_updated_at() does not exist`** → la función de trigger se llama
  `public.handle_updated_at()`.
- **Constraint `chk_meta_cuantitativa`** → resuelto en migración 014 (metas sin valor_meta OK).
- **Límite de 1000 filas de Supabase** → para contar/traer >1000 (indicadores son ~2000)
  usar `count: "exact"` o paginar con `.range()` (ya implementado en queries).
- **RLS + lecturas vacías / "A server error occurred"** tras login → asegurarse de que las
  queries usen el cliente con sesión `getSupabaseServer()` (no el anónimo). Ya está así.
- **Proyectos colgados directo de la secretaría** (Contaduría, Ingresos Municipales,
  parte de Ambiente) → el árbol POA los muestra a nivel secretaría/subsec, no solo bajo
  direcciones.
- Tras cualquier import/corrección: **hard refresh** (Ctrl+Shift+R); el dashboard tiene
  `revalidate = 0` pero el navegador puede cachear.

---

## 10. Flujo típico "me pasaron un Excel de un área"

1. Inspeccionar el Excel (hojas, columnas, direcciones, totales) con un script node + `xlsx`.
2. Decidir: ¿área nueva (aditivo 5.b), reemplazo total (5.a) o corrección de asignaciones (5.c)?
3. Si las unidades ya existen y solo cambia a qué dirección pertenece un proyecto →
   reasignación (`UPDATE proyecto.unidad_id`), sin tocar metas/indicadores/avances.
4. Verificar con las queries de la sección 8.
5. Avisar al usuario que haga hard refresh.

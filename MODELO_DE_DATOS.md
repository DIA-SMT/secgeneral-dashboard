# Modelo de Datos Relacional
## Dashboard Ejecutivo - Secretaria General
### Municipalidad de San Miguel de Tucuman

**Version:** 0.1 - Diseño Conceptual  
**Fecha:** 13 de abril de 2026  
**Estado:** Pre-migracion  
**Motor:** PostgreSQL via Supabase  
**Documento previo:** DOCUMENTO_TECNICO_FUNCIONAL.md

---

## Indice

1. [Principios de Diseño](#1-principios-de-diseño)
2. [Capas Conceptuales](#2-capas-conceptuales)
3. [Listado de Tablas Recomendadas](#3-listado-de-tablas-recomendadas)
4. [Detalle por Tabla](#4-detalle-por-tabla)
5. [Relaciones entre Tablas](#5-relaciones-entre-tablas)
6. [Enums y Tipos Recomendados](#6-enums-y-tipos-recomendados)
7. [Modelado de Proyectos Cuantitativos, Cualitativos y Mixtos](#7-modelado-de-proyectos-cuantitativos-cualitativos-y-mixtos)
8. [Tres Niveles de Verdad: Historica, Consolidada y Visual](#8-tres-niveles-de-verdad-historica-consolidada-y-visual)
9. [Tablas MVP vs Segunda Etapa](#9-tablas-mvp-vs-segunda-etapa)
10. [Decisiones de Modelado y Trade-offs](#10-decisiones-de-modelado-y-trade-offs)
11. [Riesgos de Mal Diseño a Evitar](#11-riesgos-de-mal-diseño-a-evitar)
12. [Preparacion para IA y Chatbot](#12-preparacion-para-ia-y-chatbot)
13. [Recomendaciones para Migraciones](#13-recomendaciones-para-migraciones)

---

## 1. Principios de Diseño

### 1.1 Convenciones Generales

| Convencion | Detalle |
|---|---|
| **Claves primarias** | UUID v4 (`gen_random_uuid()`) en todas las tablas |
| **Timestamps** | `created_at` y `updated_at` automaticos en toda tabla con datos mutables |
| **Soft delete** | Solo en tablas donde el borrado logico tiene valor de negocio (estructura organizacional, proyectos, metas). Las tablas de log/historial no necesitan soft delete porque son append-only |
| **Naming** | snake_case, español para nombres de dominio, singular para tablas |
| **Nullability** | Los campos son NOT NULL por defecto. Se marcan explicitamente los que aceptan null |
| **Indices** | Se definen en las migraciones, no en este documento. Aqui se señalan los candidatos obvios |
| **JSONB** | Permitido para metadata extensible, payloads de IA y configuraciones. Nunca para reemplazar estructura relacional principal |

### 1.2 Principio de Separacion de Verdades

El modelo distingue tres niveles de informacion:

```
VERDAD HISTORICA          ESTADO CONSOLIDADO         REPRESENTACION VISUAL
(inmutable)               (derivado, actualizable)   (cacheable, efimero)
─────────────────         ───────────────────────     ──────────────────────
avance                    meta.valor_actual           snapshot_estado
hito_avance               meta.estado_actual          (materializado para
                          proyecto.porcentaje_avance    panel ejecutivo)
                          hito.completado
```

- La **verdad historica** nunca se sobreescribe. Cada registro de avance queda para siempre.
- El **estado consolidado** es un resumen derivado de la verdad historica. Se actualiza al cargar un avance. Vive en las tablas principales para facilitar queries del dia a dia.
- La **representacion visual** es una foto en un momento dado, pensada para velocidad de render en el dashboard. Puede regenerarse en cualquier momento.

---

## 2. Capas Conceptuales

El modelo se organiza en cinco capas que reflejan la separacion funcional del sistema:

### Capa A: Estructura Organizacional

Representa la anatomia de la Secretaria General: sus unidades, jerarquias y personas.

**Tablas:** `unidad_organizacional`, `perfil_usuario`

### Capa B: Planificacion Base (POA)

Define la estructura del Plan Operativo Anual: periodos, proyectos, metas, hitos y sus parametros de medicion.

**Tablas:** `periodo`, `proyecto`, `meta`, `hito`

### Capa C: Seguimiento y Avances

Registra la historia de ejecucion. Todo es append-only. Aqui vive la verdad del sistema.

**Tablas:** `avance`, `hito_avance`, `evidencia`, `comentario`

### Capa D: Visualizacion Ejecutiva

Datos derivados, cacheados o materializados para alimentar el panel del Secretario sin recomputar en cada request.

**Tablas:** `snapshot_estado`

### Capa E: Preparacion IA

Almacena interacciones con el chatbot futuro, transcripciones de audio e inferencias de IA.

**Tablas:** `entrada_ia` (segunda etapa)

---

## 3. Listado de Tablas Recomendadas

| # | Tabla | Capa | Etapa | Proposito resumido |
|---|---|---|---|---|
| 1 | `unidad_organizacional` | A | MVP | Secretaria, subsecretarias, direcciones, etc. Arbol flexible |
| 2 | `perfil_usuario` | A | MVP | Extension de auth.users con rol y unidad asignada |
| 3 | `periodo` | B | MVP | Año o ciclo de planificacion (2026, 2027...) |
| 4 | `proyecto` | B | MVP | Proyecto del POA, vinculado a unidad y periodo |
| 5 | `meta` | B | MVP | Meta medible dentro de un proyecto. Aqui vive el tipo de medicion |
| 6 | `hito` | B | MVP | Hito binario (completado o no) dentro de una meta |
| 7 | `avance` | C | MVP | Registro historico de avance sobre una meta. Append-only |
| 8 | `hito_avance` | C | MVP | Registro historico de completitud de un hito. Append-only |
| 9 | `evidencia` | C | V1.1 | Archivos adjuntos vinculados a avances |
| 10 | `comentario` | C | V1.1 | Notas libres sobre cualquier entidad |
| 11 | `snapshot_estado` | D | MVP | Foto periodica del estado global para el panel ejecutivo |
| 12 | `entrada_ia` | E | V2 | Interacciones con chatbot, transcripciones de audio |

---

## 4. Detalle por Tabla

### 4.1 `unidad_organizacional` (Capa A - MVP)

**Proposito:** Representar toda la estructura jerarquica de la Secretaria General de forma flexible. Reemplaza un modelo rigido de "dependencia → direccion" por un arbol recursivo que soporta cualquier nivel de profundidad.

**¿Por que un arbol y no tablas separadas?** Porque la estructura real de una Secretaria no es siempre de dos niveles. Puede haber Subsecretarias, Direcciones, Departamentos, Coordinaciones. Un arbol `padre-hijo` cubre todas las variantes sin necesidad de agregar tablas cada vez que aparece un nivel nuevo.

| Campo | Tipo | Null | Descripcion |
|---|---|---|---|
| `id` | uuid PK | no | Identificador unico |
| `parent_id` | uuid FK → unidad_organizacional.id | si | Referencia al nodo padre. NULL = nodo raiz (la Secretaria General) |
| `nombre` | text | no | Nombre oficial (ej: "Subsecretaria de Gestion Estrategica") |
| `nombre_corto` | text | si | Nombre abreviado para dashboards (ej: "Gestion Estrategica") |
| `tipo` | enum tipo_unidad | no | Tipo de unidad: secretaria, subsecretaria, direccion, departamento, coordinacion, otro |
| `nivel` | smallint | no | Profundidad en el arbol (0 = raiz). Desnormalizado para facilitar queries |
| `orden` | smallint | no | Orden de presentacion entre hermanos |
| `responsable_nombre` | text | si | Nombre del responsable actual (display only, no FK a usuarios) |
| `activo` | boolean | no | Default true. Permite desactivar sin borrar |
| `metadata` | jsonb | si | Datos adicionales no estructurados (telefono, ubicacion, etc.) |
| `created_at` | timestamptz | no | Auto |
| `updated_at` | timestamptz | no | Auto |

**Indices candidatos:** `parent_id`, `tipo`, `activo`

**Decision: `responsable_nombre` como texto, no FK.**
En esta etapa, los responsables de cada area no necesariamente van a ser usuarios del sistema. Forzar un FK a usuarios agregaria friccion innecesaria. Cuando se implemente la carga descentralizada (V1.2), se puede agregar un `responsable_usuario_id` FK opcional.

---

### 4.2 `perfil_usuario` (Capa A - MVP)

**Proposito:** Extender la tabla `auth.users` de Supabase con datos de dominio. No reemplaza auth.users, la complementa.

| Campo | Tipo | Null | Descripcion |
|---|---|---|---|
| `id` | uuid PK | no | Mismo ID que auth.users.id (FK implicito) |
| `nombre_completo` | text | no | Nombre para mostrar |
| `email` | text | no | Redundante con auth pero util para queries directas |
| `rol` | enum rol_usuario | no | admin, gestor_estrategico, referente_area, visualizador |
| `unidad_id` | uuid FK → unidad_organizacional.id | si | Unidad a la que pertenece. NULL para admin global |
| `activo` | boolean | no | Default true |
| `avatar_url` | text | si | URL de imagen de perfil |
| `metadata` | jsonb | si | Preferencias, configuracion personal |
| `created_at` | timestamptz | no | Auto |
| `updated_at` | timestamptz | no | Auto |

**Decision sobre roles:** Se usa un enum simple en V1 porque la complejidad de un sistema RBAC completo no se justifica todavia. Cuando haya referentes de area, el rol `referente_area` + `unidad_id` determinara su alcance. El RLS futuro usara estos dos campos.

---

### 4.3 `periodo` (Capa B - MVP)

**Proposito:** Delimitar los ciclos de planificacion. Permite que coexistan multiples POA (2026, 2027) sin interferencia.

| Campo | Tipo | Null | Descripcion |
|---|---|---|---|
| `id` | uuid PK | no | Identificador unico |
| `anio` | smallint | no | Año del periodo (2026, 2027). Unique |
| `nombre` | text | no | Nombre legible ("POA 2026") |
| `fecha_inicio` | date | no | Inicio formal del periodo |
| `fecha_fin` | date | no | Fin formal del periodo |
| `activo` | boolean | no | Solo un periodo activo a la vez para el dashboard |
| `metadata` | jsonb | si | Configuracion del periodo (umbrales de semaforo, etc.) |
| `created_at` | timestamptz | no | Auto |
| `updated_at` | timestamptz | no | Auto |

**Decision: umbrales de semaforo en `metadata` del periodo.**
Los umbrales (ej: verde >= 80%, amarillo >= 50%, rojo < 50%) podrian variar de un año a otro. Ponerlos como JSONB en el periodo permite flexibilidad sin agregar una tabla de configuracion prematura. Ejemplo:
```json
{
  "umbrales_semaforo": {
    "verde_min": 80,
    "amarillo_min": 50,
    "dias_sin_actualizar_alerta": 15
  }
}
```

---

### 4.4 `proyecto` (Capa B - MVP)

**Proposito:** Representa un proyecto del POA. Vinculado a una unidad organizacional y a un periodo. El proyecto en si NO define el tipo de medicion; eso vive en las metas.

| Campo | Tipo | Null | Descripcion |
|---|---|---|---|
| `id` | uuid PK | no | Identificador unico |
| `periodo_id` | uuid FK → periodo.id | no | Periodo al que pertenece |
| `unidad_id` | uuid FK → unidad_organizacional.id | no | Unidad responsable |
| `codigo` | text | si | Codigo interno del POA (ej: "PY-GE-001") |
| `nombre` | text | no | Nombre del proyecto |
| `descripcion` | text | si | Descripcion extendida |
| `objetivo` | text | si | Objetivo general del proyecto |
| `fecha_inicio` | date | si | Inicio planificado |
| `fecha_fin` | date | si | Fin planificado |
| `peso` | numeric(5,2) | si | Ponderacion dentro de la unidad (0-100). Para calculo de avance ponderado |
| `porcentaje_avance` | numeric(5,2) | no | Default 0. **Estado consolidado**, derivado de las metas. Se actualiza automaticamente al cargar avances |
| `estado` | enum estado_proyecto | no | Default 'activo'. Ciclo de vida del proyecto |
| `orden` | smallint | no | Orden de presentacion |
| `metadata` | jsonb | si | Datos adicionales del POA original no modelados |
| `deleted_at` | timestamptz | si | Soft delete |
| `created_at` | timestamptz | no | Auto |
| `updated_at` | timestamptz | no | Auto |

**Indices candidatos:** `periodo_id`, `unidad_id`, `estado`, `deleted_at`

**Decision: `porcentaje_avance` como campo consolidado.**
Se almacena en la tabla para evitar recalcular en cada query del dashboard. Se actualiza mediante un trigger o funcion de Supabase cada vez que se inserta un avance. La verdad historica sigue viviendo en la tabla `avance`.

**Decision: `peso` como campo opcional.**
No todos los proyectos van a tener ponderacion desde el dia 1. Si no se asigna peso, el calculo de avance de la unidad trata a todos los proyectos como iguales. Cuando se quiera ponderar, se llena el campo y el calculo se ajusta.

---

### 4.5 `meta` (Capa B - MVP)

**Proposito:** Es la unidad fundamental de medicion del POA. Cada meta pertenece a un proyecto y define QUE se mide, COMO se mide, y CUANTO se espera. **Aqui vive el tipo de medicion**, no en el proyecto.

| Campo | Tipo | Null | Descripcion |
|---|---|---|---|
| `id` | uuid PK | no | Identificador unico |
| `proyecto_id` | uuid FK → proyecto.id | no | Proyecto al que pertenece |
| `codigo` | text | si | Codigo interno (ej: "M-001") |
| `nombre` | text | no | Nombre de la meta |
| `descripcion` | text | si | Descripcion extendida |
| `tipo_medicion` | enum tipo_medicion | no | **cuantitativo, cualitativo, hito_unico** |
| `unidad_medida` | text | si | Unidad de medida para cuantitativas (ej: "%", "personas", "documentos") |
| `valor_linea_base` | numeric(12,2) | si | Valor inicial. Aplica a cuantitativas |
| `valor_meta` | numeric(12,2) | si | Valor objetivo. Aplica a cuantitativas |
| `valor_actual` | numeric(12,2) | si | **Estado consolidado**. Ultimo valor reportado. Se actualiza al cargar avance |
| `escala_cualitativa` | jsonb | si | Define la escala para metas cualitativas (ver seccion 7) |
| `nivel_actual` | text | si | **Estado consolidado** para cualitativas. Ultimo nivel reportado |
| `frecuencia_medicion` | enum frecuencia | si | mensual, bimestral, trimestral, semestral, anual, puntual |
| `medio_verificacion` | text | si | Como se verifica el cumplimiento |
| `fecha_limite` | date | si | Fecha limite de cumplimiento |
| `peso` | numeric(5,2) | si | Ponderacion dentro del proyecto (0-100) |
| `estado_actual` | enum estado_semaforo | no | Default 'sin_datos'. **Estado consolidado** derivado |
| `orden` | smallint | no | Orden de presentacion |
| `metadata` | jsonb | si | Datos adicionales |
| `deleted_at` | timestamptz | si | Soft delete |
| `created_at` | timestamptz | no | Auto |
| `updated_at` | timestamptz | no | Auto |

**Indices candidatos:** `proyecto_id`, `tipo_medicion`, `estado_actual`, `fecha_limite`, `deleted_at`

**Campos consolidados en `meta`:**
- `valor_actual`: se copia del ultimo `avance.valor_numerico` al insertar un avance
- `nivel_actual`: se copia del ultimo `avance.valor_cualitativo` al insertar un avance
- `estado_actual`: se recalcula con la logica de semaforo al insertar un avance

Estos tres campos son atajos de lectura. La verdad historica completa esta en la tabla `avance`.

---

### 4.6 `hito` (Capa B - MVP)

**Proposito:** Punto de control binario dentro de una meta. Un hito se cumple o no se cumple. Tiene fecha esperada y se marca como completado cuando ocurre.

| Campo | Tipo | Null | Descripcion |
|---|---|---|---|
| `id` | uuid PK | no | Identificador unico |
| `meta_id` | uuid FK → meta.id | no | Meta a la que pertenece |
| `nombre` | text | no | Descripcion del hito |
| `fecha_esperada` | date | si | Cuando se espera que se cumpla |
| `fecha_completado` | date | si | Cuando se completo realmente. NULL = pendiente |
| `completado` | boolean | no | Default false. **Estado consolidado** |
| `orden` | smallint | no | Orden cronologico esperado |
| `metadata` | jsonb | si | Datos adicionales |
| `deleted_at` | timestamptz | si | Soft delete |
| `created_at` | timestamptz | no | Auto |
| `updated_at` | timestamptz | no | Auto |

**Indices candidatos:** `meta_id`, `completado`, `fecha_esperada`

**Decision: hitos siempre dentro de una meta.**
Un hito sin meta no tiene contexto de medicion. Incluso las metas de tipo `hito_unico` tienen un unico hito que representa su cumplimiento. Esto mantiene la uniformidad del modelo.

---

### 4.7 `avance` (Capa C - MVP)

**Proposito:** Registro historico inmutable de cada reporte de avance sobre una meta. Es el corazon de la trazabilidad del sistema. **Append-only: nunca se edita ni se borra.**

| Campo | Tipo | Null | Descripcion |
|---|---|---|---|
| `id` | uuid PK | no | Identificador unico |
| `meta_id` | uuid FK → meta.id | no | Meta sobre la que se reporta |
| `usuario_id` | uuid FK → perfil_usuario.id | no | Quien cargo el avance |
| `fecha_reporte` | date | no | Fecha efectiva del reporte (puede diferir de created_at) |
| `valor_numerico` | numeric(12,2) | si | Valor reportado para metas cuantitativas |
| `valor_cualitativo` | text | si | Nivel reportado para metas cualitativas (ej: "en_proceso") |
| `porcentaje` | numeric(5,2) | si | Porcentaje de avance reportado (si aplica) |
| `observacion` | text | si | Texto libre. Lo que el usuario quiere dejar anotado |
| `estado_calculado` | enum estado_semaforo | no | Semaforo calculado al momento de la carga |
| `fuente` | enum fuente_avance | no | Default 'manual'. Identifica el origen: manual, importacion, chatbot, audio |
| `metadata` | jsonb | si | Datos adicionales segun fuente (ej: transcripcion de audio) |
| `created_at` | timestamptz | no | Auto. Momento exacto de la insercion |

**NO tiene `updated_at` ni `deleted_at`.** Es inmutable.

**Indices candidatos:** `meta_id`, `fecha_reporte`, `usuario_id`, `created_at`

**Decision: tres campos de valor (`valor_numerico`, `valor_cualitativo`, `porcentaje`).**
Una meta cuantitativa usa `valor_numerico` y opcionalmente `porcentaje`. Una cualitativa usa `valor_cualitativo`. Una mixta puede usar ambos. No se fuerza un unico campo para distintos tipos de datos. El frontend muestra solo los campos relevantes segun `meta.tipo_medicion`.

**Decision: `fuente` como enum.**
Permite filtrar avances por origen. Cuando se integre el chatbot, los avances cargados por IA tendran `fuente = 'chatbot'` o `fuente = 'audio'`, lo que permite auditoria y diferenciacion visual.

**Decision: `estado_calculado` se guarda en cada avance.**
Porque el semaforo puede cambiar con el tiempo (los umbrales pueden ajustarse, las fechas avanzan). Guardar el estado calculado al momento de la carga permite reconstruir exactamente lo que se vio en cada punto de la historia.

---

### 4.8 `hito_avance` (Capa C - MVP)

**Proposito:** Registro historico de cuando un hito fue marcado como completado (o eventualmente revertido). Complementa al campo `hito.completado` con el contexto temporal y de usuario.

| Campo | Tipo | Null | Descripcion |
|---|---|---|---|
| `id` | uuid PK | no | Identificador unico |
| `hito_id` | uuid FK → hito.id | no | Hito afectado |
| `usuario_id` | uuid FK → perfil_usuario.id | no | Quien registro el cambio |
| `accion` | enum accion_hito | no | 'completado' o 'revertido' |
| `fecha_efectiva` | date | no | Fecha en que ocurrio realmente |
| `observacion` | text | si | Nota opcional |
| `created_at` | timestamptz | no | Auto |

**Inmutable.** No tiene `updated_at` ni `deleted_at`.

**¿Por que esta tabla si ya hay `hito.completado`?**
`hito.completado` es el estado consolidado actual. `hito_avance` es la historia completa: quien lo completo, cuando, y si alguna vez se revirtio. Sin esta tabla se pierde la trazabilidad.

---

### 4.9 `evidencia` (Capa C - V1.1)

**Proposito:** Archivos adjuntos que respaldan un avance. Usa Supabase Storage para los archivos; esta tabla solo guarda la referencia.

| Campo | Tipo | Null | Descripcion |
|---|---|---|---|
| `id` | uuid PK | no | Identificador unico |
| `avance_id` | uuid FK → avance.id | si | Vinculado a un avance especifico |
| `meta_id` | uuid FK → meta.id | si | Vinculado a una meta (para evidencias generales) |
| `usuario_id` | uuid FK → perfil_usuario.id | no | Quien subio el archivo |
| `nombre_archivo` | text | no | Nombre original del archivo |
| `tipo_mime` | text | no | MIME type (application/pdf, image/jpeg, etc.) |
| `tamano_bytes` | integer | no | Peso del archivo |
| `storage_path` | text | no | Ruta en Supabase Storage |
| `descripcion` | text | si | Nota sobre la evidencia |
| `created_at` | timestamptz | no | Auto |

**Decision: no es MVP.**
La evidencia es valiosa pero no esencial para arrancar. La carga de archivos agrega complejidad al formulario, lo cual viola el principio de simplicidad. Se agrega en V1.1 como accion opcional (boton "adjuntar evidencia" colapsado).

---

### 4.10 `comentario` (Capa C - V1.1)

**Proposito:** Notas libres sobre cualquier entidad del sistema. Permite conversaciones informales sin contaminar los datos de avance.

| Campo | Tipo | Null | Descripcion |
|---|---|---|---|
| `id` | uuid PK | no | Identificador unico |
| `entidad_tipo` | text | no | Tipo de entidad: 'proyecto', 'meta', 'hito', 'unidad' |
| `entidad_id` | uuid | no | ID de la entidad comentada |
| `usuario_id` | uuid FK → perfil_usuario.id | no | Autor |
| `contenido` | text | no | Texto del comentario |
| `parent_id` | uuid FK → comentario.id | si | Para respuestas anidadas (un nivel) |
| `created_at` | timestamptz | no | Auto |

**Decision: relacion polimorfica (`entidad_tipo` + `entidad_id`).**
Evita crear una tabla de comentarios por cada entidad. El trade-off es que no hay FK en base de datos (no se puede hacer FK a "cualquier tabla"). Se valida en aplicacion. Este patron es estandar en sistemas de comentarios y aceptable aqui porque los comentarios no son datos criticos de negocio.

---

### 4.11 `snapshot_estado` (Capa D - MVP)

**Proposito:** Foto periodica del estado completo del sistema. Se genera automaticamente (ej: cada noche, o al cargar un avance) y alimenta el panel ejecutivo sin queries complejas en tiempo real.

| Campo | Tipo | Null | Descripcion |
|---|---|---|---|
| `id` | uuid PK | no | Identificador unico |
| `periodo_id` | uuid FK → periodo.id | no | Periodo del snapshot |
| `fecha` | date | no | Fecha del snapshot |
| `tipo` | enum tipo_snapshot | no | 'diario', 'semanal', 'mensual', 'manual' |
| `datos` | jsonb | no | Payload completo del estado (ver estructura abajo) |
| `created_at` | timestamptz | no | Auto |

**Estructura del campo `datos` (JSONB):**
```json
{
  "resumen_global": {
    "porcentaje_avance": 47.5,
    "total_proyectos": 12,
    "proyectos_verde": 5,
    "proyectos_amarillo": 4,
    "proyectos_rojo": 2,
    "proyectos_sin_datos": 1,
    "total_metas": 38,
    "metas_cumplidas": 12,
    "proximo_hito": {
      "nombre": "Entrega del informe Q2",
      "fecha": "2026-06-30",
      "proyecto": "Informe de gestion"
    }
  },
  "por_unidad": [
    {
      "unidad_id": "uuid",
      "nombre": "Gestion Estrategica",
      "porcentaje_avance": 62.0,
      "estado_semaforo": "amarillo",
      "ultima_actualizacion": "2026-04-10",
      "proyectos": [
        {
          "proyecto_id": "uuid",
          "nombre": "Dashboard ejecutivo",
          "porcentaje_avance": 35.0,
          "estado_semaforo": "rojo",
          "metas_cumplidas": 1,
          "metas_total": 4
        }
      ]
    }
  ]
}
```

**¿Por que JSONB y no tablas normalizadas?**
Porque el snapshot es una foto inmutable. No se consulta por columnas individuales del snapshot; se lee completo y se renderiza. JSONB es el formato correcto para este caso: datos semi-estructurados que se escriben una vez y se leen como bloque.

**¿Por que no solo usar views?**
Porque las views recomputan en cada query. Para un panel ejecutivo que se abre muchas veces por dia, un snapshot pre-calculado es mas rapido y predecible. Las views son utiles para analytics en tiempo real; los snapshots para el dashboard principal.

---

### 4.12 `entrada_ia` (Capa E - V2)

**Proposito:** Registrar interacciones con el chatbot futuro, transcripciones de audio, y resultados de inferencia de IA.

| Campo | Tipo | Null | Descripcion |
|---|---|---|---|
| `id` | uuid PK | no | Identificador unico |
| `usuario_id` | uuid FK → perfil_usuario.id | no | Usuario que inicio la interaccion |
| `tipo` | enum tipo_entrada_ia | no | 'consulta', 'carga_por_voz', 'resumen_ejecutivo', 'alerta' |
| `input_texto` | text | si | Texto de entrada (escrito o transcrito) |
| `input_audio_url` | text | si | URL del audio original en Storage |
| `transcripcion` | text | si | Transcripcion del audio |
| `output_texto` | text | si | Respuesta generada por la IA |
| `acciones_ejecutadas` | jsonb | si | Registro de lo que hizo la IA (ej: creo un avance con id X) |
| `avance_generado_id` | uuid FK → avance.id | si | Si la IA genero un avance, referencia directa |
| `modelo` | text | si | Modelo usado (ej: "claude-sonnet-4-6") |
| `metadata` | jsonb | si | Tokens, latencia, contexto, etc. |
| `created_at` | timestamptz | no | Auto |

**No es MVP** pero el modelo esta preparado: la tabla `avance` ya tiene `fuente = 'chatbot'` y `fuente = 'audio'`, y su `metadata` JSONB puede guardar el `entrada_ia.id` como referencia cruzada.

---

## 5. Relaciones entre Tablas

### 5.1 Diagrama de Relaciones

```
                        ┌─────────────────────┐
                        │       periodo        │
                        └──────────┬──────────┘
                                   │ 1:N
                                   ▼
┌──────────────────┐    ┌─────────────────────┐
│     unidad       │◄───│      proyecto        │
│ organizacional   │ 1:N└──────────┬──────────┘
│  (arbol padre-   │               │ 1:N
│    hijo)         │               ▼
└──────────────────┘    ┌─────────────────────┐
        ▲               │        meta          │
        │ N:1           └───┬─────────────┬───┘
        │                   │ 1:N         │ 1:N
┌───────┴──────┐           ▼              ▼
│perfil_usuario│  ┌──────────────┐  ┌───────────┐
└──────────────┘  │    hito      │  │  avance   │
        │         └──────┬───────┘  │(append-   │
        │                │ 1:N      │  only)    │
        │                ▼          └─────┬─────┘
        │         ┌──────────────┐        │ 1:N
        │         │ hito_avance  │        ▼
        │         │ (append-only)│  ┌───────────┐
        │         └──────────────┘  │ evidencia │
        │                           │  (V1.1)   │
        └───────────────────────────┘
                 (usuario carga)

┌─────────────────────┐    ┌─────────────────────┐
│  snapshot_estado     │    │    entrada_ia        │
│  (Capa D - cache)    │    │  (Capa E - V2)      │
└─────────────────────┘    └─────────────────────┘
```

### 5.2 Relaciones Explicitas

| Relacion | Tipo | FK en | Apunta a |
|---|---|---|---|
| unidad → unidad padre | N:1 auto-referencial | `unidad_organizacional.parent_id` | `unidad_organizacional.id` |
| perfil_usuario → unidad | N:1 | `perfil_usuario.unidad_id` | `unidad_organizacional.id` |
| proyecto → periodo | N:1 | `proyecto.periodo_id` | `periodo.id` |
| proyecto → unidad | N:1 | `proyecto.unidad_id` | `unidad_organizacional.id` |
| meta → proyecto | N:1 | `meta.proyecto_id` | `proyecto.id` |
| hito → meta | N:1 | `hito.meta_id` | `meta.id` |
| avance → meta | N:1 | `avance.meta_id` | `meta.id` |
| avance → usuario | N:1 | `avance.usuario_id` | `perfil_usuario.id` |
| hito_avance → hito | N:1 | `hito_avance.hito_id` | `hito.id` |
| hito_avance → usuario | N:1 | `hito_avance.usuario_id` | `perfil_usuario.id` |
| evidencia → avance | N:1 | `evidencia.avance_id` | `avance.id` |
| evidencia → meta | N:1 | `evidencia.meta_id` | `meta.id` |
| evidencia → usuario | N:1 | `evidencia.usuario_id` | `perfil_usuario.id` |
| snapshot → periodo | N:1 | `snapshot_estado.periodo_id` | `periodo.id` |
| entrada_ia → usuario | N:1 | `entrada_ia.usuario_id` | `perfil_usuario.id` |
| entrada_ia → avance | N:1 opcional | `entrada_ia.avance_generado_id` | `avance.id` |

---

## 6. Enums y Tipos Recomendados

### 6.1 Enums de PostgreSQL

| Enum | Valores | Usado en |
|---|---|---|
| `tipo_unidad` | `secretaria`, `subsecretaria`, `direccion`, `departamento`, `coordinacion`, `otro` | `unidad_organizacional.tipo` |
| `rol_usuario` | `admin`, `gestor_estrategico`, `referente_area`, `visualizador` | `perfil_usuario.rol` |
| `estado_proyecto` | `borrador`, `activo`, `pausado`, `completado`, `cancelado` | `proyecto.estado` |
| `tipo_medicion` | `cuantitativo`, `cualitativo`, `hito_unico` | `meta.tipo_medicion` |
| `frecuencia` | `mensual`, `bimestral`, `trimestral`, `semestral`, `anual`, `puntual` | `meta.frecuencia_medicion` |
| `estado_semaforo` | `verde`, `amarillo`, `rojo`, `gris`, `sin_datos` | `meta.estado_actual`, `avance.estado_calculado` |
| `fuente_avance` | `manual`, `importacion`, `chatbot`, `audio` | `avance.fuente` |
| `accion_hito` | `completado`, `revertido` | `hito_avance.accion` |
| `tipo_snapshot` | `diario`, `semanal`, `mensual`, `manual` | `snapshot_estado.tipo` |
| `tipo_entrada_ia` | `consulta`, `carga_por_voz`, `resumen_ejecutivo`, `alerta` | `entrada_ia.tipo` |

### 6.2 Consideraciones sobre Enums

**¿Por que enums y no tablas de lookup?**

- Los enums son mas rapidos (no requieren JOIN)
- Son auto-documentados (el valor es legible)
- PostgreSQL los valida en escritura
- Son suficientes para conjuntos pequeños y estables

**¿Cuando migraria a tablas de lookup?**

Si algun enum necesita metadata adicional (descripcion, icono, orden, activo/inactivo) o si los usuarios finales necesitan administrar los valores. En V1 no se necesita nada de eso.

**Trade-off:** Modificar un enum en PostgreSQL requiere una migracion. Agregar valores es facil (`ALTER TYPE ... ADD VALUE`), pero eliminar valores es costoso. Los valores propuestos son conservadores para minimizar este riesgo.

---

## 7. Modelado de Proyectos Cuantitativos, Cualitativos y Mixtos

### 7.1 El Problema

Un POA real tiene metas de distinta naturaleza:

| Tipo | Ejemplo | Como se mide |
|---|---|---|
| Cuantitativo | "Capacitar a 500 agentes" | Numero: 0 → 500 |
| Cualitativo | "Mejorar la atencion al ciudadano" | Escala: no_iniciado → en_proceso → implementado → consolidado |
| Hito unico | "Firmar el convenio con la UNT" | Binario: si / no |
| Mixto | Un proyecto con metas cuantitativas Y cualitativas | Cada meta con su propio tipo |

### 7.2 La Solucion: Tipo de Medicion en la Meta, No en el Proyecto

**Decision clave:** El `tipo_medicion` vive en `meta`, no en `proyecto`.

**¿Por que?** Porque un mismo proyecto puede tener metas de distinta naturaleza. Ejemplo:

> **Proyecto:** "Programa de Capacitacion 2026"
> - Meta 1 (cuantitativa): "Capacitar a 500 agentes" → se mide con numero
> - Meta 2 (cualitativa): "Mejorar la satisfaccion de los capacitados" → se mide con escala
> - Meta 3 (hito unico): "Firmar convenio con la UNT" → se mide con si/no

Si el tipo viviera en `proyecto`, seria imposible representar esto sin forzar un unico tipo a todas las metas.

### 7.3 Como Funciona Cada Tipo

#### Cuantitativo

```
meta.tipo_medicion = 'cuantitativo'
meta.unidad_medida = 'personas'
meta.valor_linea_base = 0
meta.valor_meta = 500
meta.valor_actual = 215  (consolidado)

avance.valor_numerico = 215
avance.porcentaje = 43.0  (calculable: 215/500 * 100)
```

**Calculo de semaforo:** Se compara `porcentaje` contra el porcentaje esperado segun la fecha. Si la meta vence el 31/12 y estamos al 50% del tiempo, el avance esperado es ~50%. Si el real es 43%, esta ligeramente bajo → amarillo.

#### Cualitativo

```
meta.tipo_medicion = 'cualitativo'
meta.escala_cualitativa = {
  "niveles": [
    {"clave": "no_iniciado", "label": "No iniciado", "valor_numerico": 0},
    {"clave": "en_proceso", "label": "En proceso", "valor_numerico": 33},
    {"clave": "implementado", "label": "Implementado", "valor_numerico": 66},
    {"clave": "consolidado", "label": "Consolidado", "valor_numerico": 100}
  ]
}
meta.nivel_actual = 'en_proceso'  (consolidado)

avance.valor_cualitativo = 'en_proceso'
avance.porcentaje = 33.0  (derivado del valor_numerico del nivel)
```

**¿Por que cada nivel tiene un `valor_numerico`?** Para poder calcular porcentaje y semaforo de forma uniforme. "En proceso" = 33% permite comparar con metas cuantitativas en el mismo dashboard. Sin esto, las metas cualitativas serian incomparables.

**¿Por que la escala esta en JSONB?** Porque distintas metas pueden tener distintas escalas. "Satisfaccion" podria tener 5 niveles mientras que "Implementacion" tiene 4. No se justifica una tabla separada de escalas para V1.

#### Hito Unico

```
meta.tipo_medicion = 'hito_unico'
meta.valor_meta = 1  (1 = completado)
meta.valor_actual = 0 o 1  (consolidado)

(tiene un unico hito asociado en la tabla hito)
hito.completado = false/true

avance: no se usa directamente. El avance se registra via hito_avance.
```

**Un hito unico es una meta con un solo hito.** El % de avance es 0% o 100%. El semaforo depende de la fecha: si falta mucho, gris; si esta cerca y no se cumplio, amarillo/rojo.

### 7.4 Como se Calcula el Avance del Proyecto (Mixto)

```
avance_proyecto = promedio_ponderado(
  para cada meta activa del proyecto:
    peso_meta * porcentaje_avance_meta
)
```

Si las metas no tienen peso asignado, se usa promedio simple. El campo `proyecto.porcentaje_avance` guarda este resultado consolidado.

**Esto funciona para proyectos mixtos** porque cada meta, independientemente de su tipo, produce un `porcentaje` comparable (0-100).

---

## 8. Tres Niveles de Verdad: Historica, Consolidada y Visual

### 8.1 Verdad Historica (inmutable)

| Tabla | Dato | Caracteristica |
|---|---|---|
| `avance` | Cada reporte individual | Nunca se modifica ni borra |
| `hito_avance` | Cada cambio de estado de un hito | Nunca se modifica ni borra |

**Regla:** Estas tablas solo aceptan INSERT. Ningun UPDATE ni DELETE jamas.

### 8.2 Estado Consolidado (derivado, actualizable)

| Tabla | Campo | Se actualiza cuando... |
|---|---|---|
| `meta` | `valor_actual` | Se inserta un avance |
| `meta` | `nivel_actual` | Se inserta un avance cualitativo |
| `meta` | `estado_actual` | Se inserta un avance (recalculo semaforo) |
| `hito` | `completado` | Se inserta un hito_avance |
| `hito` | `fecha_completado` | Se inserta un hito_avance |
| `proyecto` | `porcentaje_avance` | Se inserta un avance en cualquiera de sus metas |

**Mecanismo sugerido:** Trigger PostgreSQL en la tabla `avance` que:
1. Actualiza `meta.valor_actual` / `meta.nivel_actual`
2. Recalcula `meta.estado_actual` (semaforo)
3. Recalcula `proyecto.porcentaje_avance`

Alternativa: hacerlo desde la aplicacion (Supabase Edge Function o en el endpoint de Next.js). El trigger es mas seguro porque garantiza consistencia incluso si se carga desde la API directamente.

### 8.3 Representacion Visual (cacheable)

| Tabla | Dato | Se genera cuando... |
|---|---|---|
| `snapshot_estado` | JSON con todo el estado | Periodicamente (cron) o al cargar avance |

**El panel ejecutivo puede leer desde:**
- **Snapshot** para carga rapida (< 100ms, un solo query)
- **Tablas consolidadas** para datos en tiempo real (queries mas complejos pero siempre frescos)

La estrategia de V1 deberia ser: leer de tablas consolidadas (son pocas filas, la performance sera aceptable) y generar snapshots para el modo TV y para analytics historicos.

---

## 9. Tablas MVP vs Segunda Etapa

### MVP (necesarias para el primer deploy funcional)

| Tabla | Justificacion |
|---|---|
| `unidad_organizacional` | Sin estructura, no hay dashboard |
| `perfil_usuario` | Sin usuarios, no hay carga |
| `periodo` | Sin periodo, no hay POA |
| `proyecto` | Unidad central del POA |
| `meta` | Sin metas no hay nada que medir |
| `hito` | Puntos de control esenciales |
| `avance` | Sin avances, el dashboard esta vacio |
| `hito_avance` | Complemento minimo de hitos |
| `snapshot_estado` | Puede ser MVP-tardio, pero es simple y agrega mucho valor para el modo TV |

### Segunda Etapa (V1.1+)

| Tabla | Justificacion para postergar |
|---|---|
| `evidencia` | Agrega friccion a la carga. No esencial para visualizacion |
| `comentario` | Nice-to-have, no bloquea ningun flujo core |
| `entrada_ia` | Claramente V2, pero el modelo ya esta preparado |

---

## 10. Decisiones de Modelado y Trade-offs

### D1: Arbol flexible vs tablas por nivel

**Decision:** Un unico arbol recursivo en `unidad_organizacional`.
**A favor:** Flexibilidad total, no se rompe si cambia la estructura organica.
**En contra:** Las queries recursivas son mas complejas (CTEs necesarias).
**Mitigacion:** El campo `nivel` desnormalizado simplifica las queries mas comunes. Para el dashboard, rara vez se necesita mas que `WHERE nivel = 1` (unidades directas de la Secretaria).

### D2: Tipo de medicion en meta, no en proyecto

**Decision:** `meta.tipo_medicion` define como se mide cada meta individualmente.
**A favor:** Un proyecto puede tener metas cuanti y cuali. Refleja la realidad del POA.
**En contra:** Ligeramente mas complejo de cargar (el formulario debe adaptarse al tipo).
**Mitigacion:** El frontend detecta el tipo y muestra solo los campos relevantes. El usuario no sabe ni le importa como se llama el campo.

### D3: Campos consolidados en tablas principales

**Decision:** `meta.valor_actual`, `meta.estado_actual`, `proyecto.porcentaje_avance` son campos de lectura rapida.
**A favor:** El dashboard no necesita JOINs pesados para mostrar un semaforo.
**En contra:** Datos duplicados (el valor vive en `avance` y en `meta`).
**Mitigacion:** Se actualizan via trigger, garantizando consistencia. La tabla `avance` es la fuente de verdad; los campos consolidados son cache.

### D4: Semaforo como dato derivado, no primario

**Decision:** `estado_actual` se calcula a partir de avance + fecha + umbrales. No lo carga el usuario.
**A favor:** Consistencia, objetividad, no depende del criterio subjetivo de quien carga.
**En contra:** La formula puede no capturar todos los matices.
**Mitigacion:** Los umbrales son configurables por periodo. En V2, se puede agregar la posibilidad de override manual con justificacion.

### D5: JSONB con disciplina

**Decision:** JSONB se usa en `metadata` (extensibilidad), `escala_cualitativa` (escalas variables), `snapshot_estado.datos` (cache completo) y `periodo.metadata` (configuracion).
**No se usa para:** La jerarquia organizacional, las relaciones entre tablas, los campos de medicion principales, ni los estados.

### D6: Soft delete selectivo

**Decision:** Solo en `unidad_organizacional`, `proyecto`, `meta`, `hito`. NO en `avance`, `hito_avance`, `snapshot_estado`.
**Razon:** Las tablas de log son inmutables por definicion. Soft delete en ellas seria un contrasentido. En tablas estructurales, soft delete permite desactivar sin perder historia.

### D7: No modelar reglas de evaluacion como tabla separada (todavia)

**Decision:** Los umbrales de semaforo viven en `periodo.metadata` como JSONB.
**A favor:** Simplicidad. En V1 hay un unico conjunto de reglas.
**En contra:** Si se necesitan reglas por unidad, por proyecto, o por tipo de meta, habra que migrar.
**Cuando migrar:** Si en la practica se identifica que distintas areas necesitan umbrales distintos, se crea una tabla `regla_evaluacion` con FK a la entidad y se mueve la logica.

---

## 11. Riesgos de Mal Diseño a Evitar

| Riesgo | Descripcion | Como lo evita este modelo |
|---|---|---|
| **Tipo unico de medicion** | Forzar todo a porcentaje o todo a escala | `tipo_medicion` por meta con campos adaptados |
| **Semaforo hardcodeado** | Colores fijos sin posibilidad de ajuste | Umbrales en `periodo.metadata`, recalculables |
| **Historial inexistente** | Sobreescribir el valor actual sin guardar el anterior | `avance` es append-only, `meta.valor_actual` es cache |
| **Estructura rigida** | Tablas separadas para cada nivel organizacional | Arbol recursivo en `unidad_organizacional` |
| **JSONB abusivo** | Meter relaciones core en JSON | JSONB solo para metadata, escalas variables y cache |
| **Carga compleja** | Modelo que requiere llenar 10 campos por avance | `avance` necesita solo: meta_id + valor + observacion |
| **Sin auditoria** | No saber quien cargo que ni cuando | `avance.usuario_id` + `avance.created_at` + `avance.fuente` |
| **Dashboard lento** | Recomputar todo en cada request | Campos consolidados + snapshot_estado |
| **Single-year** | No poder ver POA de años anteriores | `periodo` como tabla, todo vinculado a periodo |
| **Sin preparacion IA** | Modelo incompatible con carga por chatbot | `fuente_avance` enum + `entrada_ia` tabla + `metadata` JSONB |

---

## 12. Preparacion para IA y Chatbot

### 12.1 Lo que ya esta listo en V1

| Capacidad | Soporte en el modelo |
|---|---|
| Consultas por nombre | Todos los nombres son text legible y buscable |
| Identificacion de entidades | UUIDs + codigos + nombres unicos por contexto |
| Carga de avance por IA | `avance.fuente = 'chatbot'` o `'audio'` |
| Trazabilidad de acciones IA | `avance.metadata` puede guardar `{"entrada_ia_id": "uuid"}` |
| Transcripcion de audio | `avance.metadata` puede guardar `{"transcripcion": "texto"}` |
| Resumen ejecutivo | `snapshot_estado.datos` es un JSON listo para resumir por IA |

### 12.2 Lo que se agrega en V2

| Capacidad | Tabla/campo |
|---|---|
| Historial de conversaciones | `entrada_ia` |
| Audio original | `entrada_ia.input_audio_url` → Supabase Storage |
| Acciones ejecutadas por IA | `entrada_ia.acciones_ejecutadas` (JSONB) |
| Vinculo avance ↔ entrada IA | `entrada_ia.avance_generado_id` FK |

### 12.3 Ejemplo de Flujo IA Futuro

```
Usuario dice: "Actualizar la meta de capacitacion al 60%"

1. IA interpreta: meta = "Capacitar a 500 agentes", valor = 60%
2. Se crea entrada_ia (tipo = 'carga_por_voz', transcripcion = "...")
3. Se crea avance (meta_id = X, valor_numerico = 300, porcentaje = 60, fuente = 'audio')
4. Trigger actualiza meta.valor_actual = 300, meta.estado_actual = recalculo
5. Trigger actualiza proyecto.porcentaje_avance
6. Se vincula: entrada_ia.avance_generado_id = avance.id
```

El modelo soporta esto sin modificaciones estructurales.

---

## 13. Recomendaciones para Migraciones

### 13.1 Orden de Creacion

Las migraciones deben respetar las dependencias de FK:

```
1. Enums (todos)
2. unidad_organizacional (sin FK externas)
3. perfil_usuario (FK → unidad_organizacional)
4. periodo (sin FK externas)
5. proyecto (FK → periodo, unidad_organizacional)
6. meta (FK → proyecto)
7. hito (FK → meta)
8. avance (FK → meta, perfil_usuario)
9. hito_avance (FK → hito, perfil_usuario)
10. snapshot_estado (FK → periodo)
11. [V1.1] evidencia (FK → avance, meta, perfil_usuario)
12. [V1.1] comentario (FK → perfil_usuario)
13. [V2] entrada_ia (FK → perfil_usuario, avance)
```

### 13.2 Triggers Recomendados

| Trigger | Tabla fuente | Accion |
|---|---|---|
| `after_insert_avance` | `avance` | Actualiza `meta.valor_actual`, `meta.nivel_actual`, `meta.estado_actual`, recalcula `proyecto.porcentaje_avance` |
| `after_insert_hito_avance` | `hito_avance` | Actualiza `hito.completado`, `hito.fecha_completado` |
| `auto_updated_at` | Todas las tablas con `updated_at` | Actualiza `updated_at = now()` en cada UPDATE |

### 13.3 Views Sugeridas (no tablas, para analytics)

| View | Proposito |
|---|---|
| `v_resumen_por_unidad` | Agrega proyectos y metas por unidad para el panel ejecutivo |
| `v_metas_en_riesgo` | Metas con semaforo rojo o sin actualizacion reciente |
| `v_proximos_hitos` | Hitos pendientes ordenados por fecha esperada |
| `v_historial_avances` | JOIN de avance + meta + proyecto + unidad para explorador |

Estas views se crean despues de las tablas base y se usan como complemento de los campos consolidados.

---

*Este documento define la arquitectura de datos del dashboard ejecutivo. El proximo paso es traducirlo en migraciones SQL para Supabase, comenzando por los enums y las tablas MVP en el orden especificado.*

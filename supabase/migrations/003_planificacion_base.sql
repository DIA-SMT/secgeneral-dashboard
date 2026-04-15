-- ============================================================
-- MIGRACION 003: Planificacion base del POA
-- ============================================================
-- Tablas: periodo, proyecto, meta, hito
--
-- Esta migracion define la ESTRUCTURA de la planificacion.
-- No define el seguimiento (eso va en 004_avance.sql).
--
-- Relaciones clave:
--   periodo  1:N  proyecto
--   unidad   1:N  proyecto   (responsable principal)
--   proyecto 1:N  meta
--   proyecto 1:N  hito
-- ============================================================


-- -------------------------------------------------------
-- PERIODO
-- -------------------------------------------------------
-- Delimita ciclos de planificacion. Permite coexistencia
-- de multiples POA (2026, 2027) sin interferencia.

CREATE TABLE public.periodo (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  anio         smallint    NOT NULL UNIQUE,
  nombre       text        NOT NULL,       -- "POA 2026"
  fecha_inicio date        NOT NULL,
  fecha_fin    date        NOT NULL,

  -- Solo un periodo activo a la vez para el dashboard principal.
  -- Multiples periodos pueden existir para historico.
  activo       boolean     NOT NULL DEFAULT false,

  -- Configuracion del periodo. Incluye umbrales de semaforo.
  -- Ejemplo:
  --   {
  --     "umbrales_semaforo": {
  --       "verde_min": 80,
  --       "amarillo_min": 50,
  --       "dias_sin_actualizar_alerta": 15
  --     }
  --   }
  -- Los umbrales pueden variar entre periodos. JSONB es correcto
  -- aqui porque es configuracion, no datos relacionales.
  configuracion jsonb      DEFAULT '{}',

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_periodo_fechas CHECK (fecha_fin > fecha_inicio),
  CONSTRAINT chk_periodo_anio   CHECK (anio >= 2020 AND anio <= 2100)
);

CREATE TRIGGER trg_periodo_updated_at
  BEFORE UPDATE ON public.periodo
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.periodo IS
  'Ciclo de planificacion operativa anual. Capa B.';


-- -------------------------------------------------------
-- PROYECTO
-- -------------------------------------------------------
-- Unidad central del POA. Pertenece a un periodo y a una
-- unidad organizacional responsable. Esas dos FK son
-- obligatorias y definen el contexto completo del proyecto.

CREATE TABLE public.proyecto (
  id           uuid             PRIMARY KEY DEFAULT gen_random_uuid(),

  -- FK obligatorias: un proyecto siempre tiene periodo y unidad.
  periodo_id   uuid             NOT NULL
               REFERENCES public.periodo(id) ON DELETE RESTRICT,
  unidad_id    uuid             NOT NULL
               REFERENCES public.unidad_organizacional(id) ON DELETE RESTRICT,

  codigo       text,                    -- codigo POA interno (ej: "PY-GE-001")
  nombre       text             NOT NULL,
  descripcion  text,
  objetivo     text,                    -- objetivo general del proyecto

  fecha_inicio date,
  fecha_fin    date,

  estado       estado_proyecto  NOT NULL DEFAULT 'borrador',

  -- Ponderacion dentro de la unidad (0-100).
  -- Si es NULL, el calculo de avance de la unidad trata a todos
  -- los proyectos como iguales (promedio simple).
  peso         numeric(5,2)     CHECK (peso IS NULL OR (peso >= 0 AND peso <= 100)),

  orden        smallint         NOT NULL DEFAULT 0,
  observaciones text,

  -- Metadata extensible. NO para datos relacionales.
  metadata     jsonb            DEFAULT '{}',

  deleted_at   timestamptz,             -- soft delete
  created_at   timestamptz      NOT NULL DEFAULT now(),
  updated_at   timestamptz      NOT NULL DEFAULT now(),

  CONSTRAINT chk_proyecto_fechas CHECK (
    fecha_inicio IS NULL OR fecha_fin IS NULL OR fecha_fin >= fecha_inicio
  )
);

CREATE TRIGGER trg_proyecto_updated_at
  BEFORE UPDATE ON public.proyecto
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_proyecto_periodo   ON public.proyecto(periodo_id);
CREATE INDEX idx_proyecto_unidad    ON public.proyecto(unidad_id);
CREATE INDEX idx_proyecto_estado    ON public.proyecto(estado);
CREATE INDEX idx_proyecto_activo    ON public.proyecto(deleted_at)
  WHERE deleted_at IS NULL;

COMMENT ON TABLE public.proyecto IS
  'Proyecto del POA. Vinculado obligatoriamente a un periodo '
  'y a una unidad organizacional responsable. Capa B.';


-- -------------------------------------------------------
-- META
-- -------------------------------------------------------
-- Unidad fundamental de medicion del POA. Cada meta define
-- QUE se mide, COMO se mide, y CUANTO se espera.
--
-- DECISION CLAVE: el tipo de medicion vive aqui, no en
-- proyecto. Un mismo proyecto puede tener metas cuantitativas,
-- cualitativas y de hito unico sin conflicto.

CREATE TABLE public.meta (
  id                  uuid              PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id         uuid              NOT NULL
                      REFERENCES public.proyecto(id) ON DELETE RESTRICT,

  codigo              text,                     -- codigo interno (ej: "M-001")
  nombre              text              NOT NULL,
  descripcion         text,

  -- -------------------------------------------------------
  -- TIPO DE MEDICION
  -- Define la naturaleza del dato. Determina que campos
  -- aplican y como se interpreta el avance.
  --
  --   cuantitativo: usa valor_linea_base, valor_meta, unidad_medida
  --   cualitativo:  usa escala_cualitativa
  --   hito_unico:   binario (0/1), se completa o no
  -- -------------------------------------------------------
  tipo_medicion       tipo_medicion     NOT NULL,

  -- Solo para cuantitativas
  unidad_medida       text,                     -- "%", "personas", "documentos"
  valor_linea_base    numeric(12,2),            -- punto de partida
  valor_meta          numeric(12,2),            -- objetivo a alcanzar

  -- Solo para cualitativas.
  -- Define la escala con niveles y su equivalente numerico
  -- para poder derivar porcentaje comparativo (capa de interpretacion,
  -- NO la esencia del dato).
  --
  -- Ejemplo:
  --   {
  --     "niveles": [
  --       {"clave": "no_iniciado",  "label": "No iniciado",  "valor_numerico": 0},
  --       {"clave": "en_proceso",   "label": "En proceso",   "valor_numerico": 33},
  --       {"clave": "implementado", "label": "Implementado", "valor_numerico": 66},
  --       {"clave": "consolidado",  "label": "Consolidado",  "valor_numerico": 100}
  --     ]
  --   }
  --
  -- IMPORTANTE: el valor_numerico de cada nivel es una TRADUCCION
  -- para comparabilidad visual, no reemplaza el dato cualitativo.
  -- La esencia sigue siendo el nivel reportado segun su tipo.
  escala_cualitativa  jsonb,

  frecuencia_medicion frecuencia_medicion,       -- cada cuanto se mide
  medio_verificacion  text,                      -- como se verifica el cumplimiento
  fecha_limite        date,                      -- plazo final

  -- Ponderacion dentro del proyecto (0-100). Misma logica que proyecto.peso.
  peso                numeric(5,2)     CHECK (peso IS NULL OR (peso >= 0 AND peso <= 100)),
  orden               smallint         NOT NULL DEFAULT 0,

  -- ============================================================
  -- CAMPOS MATERIALIZADOS / CONSOLIDADOS
  --
  -- ATENCION: estos campos NO son la verdad historica primaria.
  -- La verdad historica vive en la tabla avance (append-only).
  --
  -- Estos campos existen como cache de lectura para el dashboard.
  -- Deben actualizarse UNICAMENTE por proceso controlado
  -- (trigger, funcion de base de datos, o logica de aplicacion
  -- explicita al insertar un avance).
  --
  -- NUNCA deben exponerse como campos editables en el frontend.
  -- NUNCA deben modificarse directamente por un usuario.
  --
  -- Si en algun momento divergen del historial de avances,
  -- la tabla avance es la fuente de verdad y estos campos
  -- deben regenerarse desde ella.
  -- ============================================================
  valor_actual        numeric(12,2),            -- ultimo valor numerico reportado
  nivel_actual        text,                     -- ultimo nivel cualitativo reportado
  estado_semaforo     estado_semaforo   NOT NULL DEFAULT 'sin_datos',
  ultima_actualizacion timestamptz,             -- timestamp del ultimo avance

  metadata            jsonb            DEFAULT '{}',
  deleted_at          timestamptz,
  created_at          timestamptz      NOT NULL DEFAULT now(),
  updated_at          timestamptz      NOT NULL DEFAULT now(),

  -- -------------------------------------------------------
  -- Validaciones de coherencia segun tipo de medicion
  -- -------------------------------------------------------
  -- Si es cuantitativa, valor_meta es obligatorio.
  CONSTRAINT chk_meta_cuantitativa CHECK (
    tipo_medicion != 'cuantitativo' OR valor_meta IS NOT NULL
  ),
  -- Si es cualitativa, la escala es obligatoria.
  CONSTRAINT chk_meta_cualitativa CHECK (
    tipo_medicion != 'cualitativo' OR escala_cualitativa IS NOT NULL
  )
);

CREATE TRIGGER trg_meta_updated_at
  BEFORE UPDATE ON public.meta
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_meta_proyecto      ON public.meta(proyecto_id);
CREATE INDEX idx_meta_tipo          ON public.meta(tipo_medicion);
CREATE INDEX idx_meta_semaforo      ON public.meta(estado_semaforo);
CREATE INDEX idx_meta_fecha_limite  ON public.meta(fecha_limite);
CREATE INDEX idx_meta_activa        ON public.meta(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.meta IS
  'Unidad fundamental de medicion del POA. El tipo de medicion '
  'vive aqui (no en proyecto) para soportar proyectos mixtos. '
  'Contiene campos materializados para lectura rapida del dashboard. '
  'La verdad historica esta en la tabla avance. Capa B.';


-- -------------------------------------------------------
-- HITO
-- -------------------------------------------------------
-- Punto de control dentro de un proyecto. Binario: se
-- cumplio o no se cumplio. Tiene fecha esperada.
--
-- Los hitos pertenecen al PROYECTO, no a una meta especifica.
-- Un hito es un evento del proyecto ("Firma del convenio"),
-- no una medicion ("Capacitar 500 personas").
--
-- El seguimiento de completitud se registra a traves de
-- la tabla avance con hito_id. No existe tabla hito_avance
-- separada (simplificacion del MVP).

CREATE TABLE public.hito (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id     uuid        NOT NULL
                  REFERENCES public.proyecto(id) ON DELETE RESTRICT,

  nombre          text        NOT NULL,
  descripcion     text,
  fecha_esperada  date,                  -- cuando se espera que se cumpla

  -- Indica si el hito es critico para el proyecto.
  -- Util para filtrar "hitos obligatorios pendientes" en el dashboard.
  obligatorio     boolean     NOT NULL DEFAULT false,

  -- Ponderacion si se desea ponderar hitos dentro del proyecto.
  peso            numeric(5,2) CHECK (peso IS NULL OR (peso >= 0 AND peso <= 100)),
  orden           smallint    NOT NULL DEFAULT 0,

  -- ============================================================
  -- CAMPOS MATERIALIZADOS
  -- Se actualizan cuando un avance referencia este hito.
  -- La verdad historica es el registro en avance con hito_id.
  -- ============================================================
  completado      boolean     NOT NULL DEFAULT false,
  fecha_completado date,

  metadata        jsonb       DEFAULT '{}',
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  -- Si esta completado, debe tener fecha de completitud
  CONSTRAINT chk_hito_completado CHECK (
    completado = false OR fecha_completado IS NOT NULL
  )
);

CREATE TRIGGER trg_hito_updated_at
  BEFORE UPDATE ON public.hito
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX idx_hito_proyecto    ON public.hito(proyecto_id);
CREATE INDEX idx_hito_completado  ON public.hito(completado) WHERE completado = false;
CREATE INDEX idx_hito_fecha       ON public.hito(fecha_esperada);
CREATE INDEX idx_hito_activo      ON public.hito(deleted_at) WHERE deleted_at IS NULL;

COMMENT ON TABLE public.hito IS
  'Punto de control binario de un proyecto. Completado o pendiente. '
  'Su seguimiento se registra via avance con hito_id. Capa B.';

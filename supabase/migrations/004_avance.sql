-- ============================================================
-- MIGRACION 004: Registro de avances (seguimiento)
-- ============================================================
-- La tabla avance es el CORAZON de la trazabilidad del sistema.
--
-- PRINCIPIOS FUNDAMENTALES:
--
-- 1. APPEND-ONLY: los registros se insertan y NUNCA se
--    modifican ni eliminan. No tiene updated_at ni deleted_at.
--
-- 2. VERDAD HISTORICA: esta tabla es la fuente de verdad
--    del sistema. Los campos materializados en meta y hito
--    son derivados de ella. Si hay divergencia, avance gana.
--
-- 3. FLEXIBILIDAD: un avance puede ser sobre una meta
--    (reporte de valor), sobre un hito (marcarlo completo),
--    o una observacion general del proyecto.
--
-- 4. FUENTE TRAZABLE: cada avance registra su origen
--    (manual, importacion, chatbot, audio) para auditoria
--    y para diferenciar visualmente en el dashboard.
-- ============================================================

CREATE TABLE public.avance (
  id                uuid           PRIMARY KEY DEFAULT gen_random_uuid(),

  -- -------------------------------------------------------
  -- CONTEXTO: a que entidad se refiere este avance
  -- -------------------------------------------------------

  -- Proyecto siempre presente. Desnormalizado respecto a
  -- meta.proyecto_id y hito.proyecto_id para simplificar
  -- queries del dashboard sin JOINs adicionales.
  -- La consistencia (que meta/hito pertenezcan al mismo
  -- proyecto) se valida en la capa de aplicacion.
  proyecto_id       uuid           NOT NULL
                    REFERENCES public.proyecto(id) ON DELETE RESTRICT,

  -- Meta sobre la que se reporta. NULL si el avance es
  -- solo sobre un hito o una observacion general.
  meta_id           uuid
                    REFERENCES public.meta(id) ON DELETE RESTRICT,

  -- Hito que se esta marcando como completado. NULL si el
  -- avance es solo sobre una meta o una observacion general.
  -- Cuando hito_id esta presente, la logica de aplicacion
  -- debe actualizar hito.completado y hito.fecha_completado.
  hito_id           uuid
                    REFERENCES public.hito(id) ON DELETE RESTRICT,

  -- -------------------------------------------------------
  -- DATOS DEL REPORTE
  -- -------------------------------------------------------

  -- Fecha efectiva del reporte. Puede diferir de created_at
  -- (ej: se carga el lunes un avance que ocurrio el viernes).
  fecha_reporte     date           NOT NULL DEFAULT CURRENT_DATE,

  -- Origen del avance. Permite filtrar y auditar.
  fuente            fuente_avance  NOT NULL DEFAULT 'manual',

  -- -------------------------------------------------------
  -- VALOR REPORTADO
  --
  -- Segun meta.tipo_medicion se usa uno u otro campo:
  --   cuantitativo → valor_numerico
  --   cualitativo  → valor_cualitativo (clave del nivel)
  --   hito_unico   → se usa hito_id, valor puede ser NULL
  --
  -- IMPORTANTE: el porcentaje NO se almacena aqui.
  -- El porcentaje es una CAPA DE INTERPRETACION COMPARATIVA,
  -- no la esencia del dato. Se calcula cuando se necesita:
  --   cuanti: valor_numerico / meta.valor_meta * 100
  --   cuali:  valor_numerico del nivel en escala_cualitativa
  --   hito:   0 o 100
  -- Esta decision evita que "todo se deforme para entrar
  -- en porcentaje".
  -- -------------------------------------------------------
  valor_numerico    numeric(12,2),          -- para cuantitativas
  valor_cualitativo text,                   -- para cualitativas (clave del nivel)

  -- Texto libre del operador. Lo que quiere dejar anotado.
  observacion       text,

  -- -------------------------------------------------------
  -- USUARIO
  -- -------------------------------------------------------
  -- Referencia directa a auth.users de Supabase.
  -- No se crea perfil_usuario en MVP. Cuando se necesiten
  -- datos de perfil (nombre, rol, unidad), se agrega una
  -- tabla perfil_usuario que extienda auth.users.
  created_by        uuid
                    REFERENCES auth.users(id),

  -- -------------------------------------------------------
  -- PAYLOAD EXTENSIBLE
  -- -------------------------------------------------------
  -- Para integraciones futuras. Ejemplos de uso:
  --   fuente='audio':  {"transcripcion": "...", "audio_url": "..."}
  --   fuente='chatbot': {"entrada_ia_id": "uuid", "modelo": "claude-sonnet"}
  --   fuente='importacion': {"archivo": "poa_2026.xlsx", "fila": 42}
  -- No reemplaza campos estructurados; complementa.
  payload_original  jsonb,

  -- -------------------------------------------------------
  -- TIMESTAMP
  -- -------------------------------------------------------
  -- Solo created_at. NO hay updated_at (inmutable).
  -- NO hay deleted_at (no se borra).
  created_at        timestamptz    NOT NULL DEFAULT now(),

  -- -------------------------------------------------------
  -- VALIDACIONES
  -- -------------------------------------------------------

  -- Un avance debe tener contenido: sobre una meta, un hito,
  -- o al menos una observacion textual.
  CONSTRAINT chk_avance_contenido CHECK (
    meta_id IS NOT NULL
    OR hito_id IS NOT NULL
    OR observacion IS NOT NULL
  )
);

-- -------------------------------------------------------
-- INDICES
-- -------------------------------------------------------
-- Optimizados para los patrones de query del dashboard:
--   - "todos los avances de un proyecto"
--   - "ultimos avances de una meta" (el mas frecuente)
--   - "avances de un hito"
--   - "avances por fecha"
--   - "avances por usuario"

CREATE INDEX idx_avance_proyecto   ON public.avance(proyecto_id);
CREATE INDEX idx_avance_meta       ON public.avance(meta_id)       WHERE meta_id IS NOT NULL;
CREATE INDEX idx_avance_hito       ON public.avance(hito_id)       WHERE hito_id IS NOT NULL;
CREATE INDEX idx_avance_fecha      ON public.avance(fecha_reporte);
CREATE INDEX idx_avance_created_by ON public.avance(created_by)    WHERE created_by IS NOT NULL;
CREATE INDEX idx_avance_fuente     ON public.avance(fuente);

-- Indice compuesto para la query mas comun del dashboard:
-- "dame el ultimo avance de esta meta"
CREATE INDEX idx_avance_meta_fecha ON public.avance(meta_id, created_at DESC)
  WHERE meta_id IS NOT NULL;

-- Indice compuesto para timeline de proyecto:
-- "dame todos los avances de este proyecto ordenados por fecha"
CREATE INDEX idx_avance_proyecto_fecha ON public.avance(proyecto_id, fecha_reporte DESC);

COMMENT ON TABLE public.avance IS
  'Registro historico inmutable de avances. APPEND-ONLY. '
  'Fuente de verdad del sistema. Los campos materializados en '
  'meta y hito son derivados de esta tabla. Capa C.';

-- ============================================================
-- MIGRACION 005: Tabla propuesta_carga para V1.1 del chatbot
-- ============================================================
-- Registra cada propuesta de carga generada por el asistente,
-- incluyendo el texto original del usuario, la interpretacion
-- del sistema, si fue confirmada o cancelada, y el avance
-- generado en caso de confirmacion.
-- ============================================================

CREATE TYPE estado_propuesta AS ENUM (
  'pendiente',
  'confirmada',
  'cancelada',
  'corregida'
);

CREATE TYPE tipo_propuesta AS ENUM (
  'avance',
  'hito'
);

CREATE TABLE public.propuesta_carga (
  id                  uuid             PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                tipo_propuesta   NOT NULL,

  -- Entidades referenciadas
  proyecto_id         uuid             NOT NULL REFERENCES public.proyecto(id),
  meta_id             uuid             REFERENCES public.meta(id),
  hito_id             uuid             REFERENCES public.hito(id),

  -- Valores propuestos
  valor_numerico      numeric(12,2),
  valor_cualitativo   text,
  observacion         text,

  -- Trazabilidad
  texto_usuario       text             NOT NULL,  -- lo que dijo el usuario
  estado              estado_propuesta NOT NULL DEFAULT 'pendiente',
  avance_generado_id  uuid             REFERENCES public.avance(id),

  -- Timestamps
  created_at          timestamptz      NOT NULL DEFAULT now(),
  confirmada_at       timestamptz,

  -- Coherencia
  CONSTRAINT chk_propuesta_tipo CHECK (
    (tipo = 'avance' AND meta_id IS NOT NULL) OR
    (tipo = 'hito' AND hito_id IS NOT NULL)
  )
);

CREATE INDEX idx_propuesta_estado ON public.propuesta_carga(estado);
CREATE INDEX idx_propuesta_proyecto ON public.propuesta_carga(proyecto_id);

COMMENT ON TABLE public.propuesta_carga IS
  'Propuestas de carga generadas por el asistente conversacional. '
  'Registra interpretacion, confirmacion y vinculo con avance generado.';

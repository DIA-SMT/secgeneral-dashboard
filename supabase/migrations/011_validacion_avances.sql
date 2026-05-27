-- ============================================================
-- MIGRACION 011: Workflow de validación jerárquica de avances
-- ============================================================
-- Cada avance cargado por un Director queda en estado 'pendiente'
-- hasta que su Subsecretario lo valide o lo observe.
--
-- Flujo:
--   Director carga avance → 'pendiente'
--   Subsec valida         → 'validado'  (firma con validado_por/validado_at)
--   Subsec observa        → 'observado' (+ observacion_validacion)
--                            el Director debe corregir y vuelve a 'pendiente'
-- ============================================================

CREATE TYPE estado_validacion AS ENUM ('pendiente', 'validado', 'observado');

ALTER TABLE public.avance
  ADD COLUMN estado_validacion       estado_validacion NOT NULL DEFAULT 'pendiente',
  ADD COLUMN validado_por            uuid REFERENCES auth.users(id),
  ADD COLUMN validado_at             timestamptz,
  ADD COLUMN observacion_validacion  text;

CREATE INDEX idx_avance_estado_validacion
  ON public.avance(estado_validacion)
  WHERE estado_validacion = 'pendiente';

COMMENT ON COLUMN public.avance.estado_validacion IS
  'Estado del workflow jerárquico: pendiente (recién cargado), validado (firmado por Subsec), observado (rechazado por Subsec con motivo).';

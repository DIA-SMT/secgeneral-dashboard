-- ============================================================
-- MIGRACION 008: Correccion de avances
-- ============================================================
-- Habilita correccion del grado de avance manteniendo audit trail.
-- Append-only: un avance correctivo es un NUEVO registro que
-- referencia al original via reemplaza_avance_id.
-- ============================================================

-- Extender enum fuente_avance con 'correccion'
ALTER TYPE fuente_avance ADD VALUE IF NOT EXISTS 'correccion';

-- Columna para trazar correcciones
ALTER TABLE public.avance
  ADD COLUMN reemplaza_avance_id uuid
    REFERENCES public.avance(id) ON DELETE SET NULL;

CREATE INDEX idx_avance_reemplaza
  ON public.avance(reemplaza_avance_id)
  WHERE reemplaza_avance_id IS NOT NULL;

COMMENT ON COLUMN public.avance.reemplaza_avance_id IS
  'Si este avance es una correccion, apunta al avance original que reemplaza. NULL en avances normales.';

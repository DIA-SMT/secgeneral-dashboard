-- ============================================================
-- MIGRACION 013: Agregar columna `codigo` a unidad_organizacional
-- ============================================================
-- Necesaria para mapear cada unidad con su identificador del Excel
-- POA 2026 (SEC01..07, DIR01..43). Permite trazabilidad y re-import.
-- ============================================================

ALTER TABLE public.unidad_organizacional
  ADD COLUMN IF NOT EXISTS codigo text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_unidad_codigo
  ON public.unidad_organizacional(codigo)
  WHERE codigo IS NOT NULL;

COMMENT ON COLUMN public.unidad_organizacional.codigo IS
  'Código corto identificador (ej. SEC01, DIR01). Vincula con la planilla POA 2026.';

-- ============================================================
-- MIGRACION 015: Permitir valores no numéricos en indicador
-- ============================================================
-- Muchas metas son cualitativas ("Actividad realizada Si/No",
-- "Realizado", etc.) — el indicador necesita poder guardar texto
-- como valor además del numérico.
--
-- También se relaja unidad_medida para permitir cualquier texto
-- libre (%, días, personas, Si/No, etc.) y se pueda editar.
-- ============================================================

ALTER TABLE public.indicador
  ADD COLUMN IF NOT EXISTS valor_actual_texto text,
  ADD COLUMN IF NOT EXISTS valor_objetivo_texto text,
  ADD COLUMN IF NOT EXISTS observacion text;

COMMENT ON COLUMN public.indicador.valor_actual_texto IS
  'Valor actual del indicador como texto (ej. "Sí", "Realizado"). Si está presente, prevalece sobre valor_actual numérico.';

COMMENT ON COLUMN public.indicador.valor_objetivo_texto IS
  'Objetivo del indicador como texto (cuando la meta no es cuantitativa).';

COMMENT ON COLUMN public.indicador.observacion IS
  'Observación libre del último avance cargado en el indicador.';

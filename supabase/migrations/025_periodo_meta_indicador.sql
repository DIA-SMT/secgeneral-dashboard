-- ============================================================
-- MIGRACION 025: Variable tiempo (periodos en meta e indicador)
-- ============================================================
-- Contexto (correcciones 23.07): el seguimiento debe considerar el
-- PLAZO. Un indicador ("realizar 30 intervenciones entre mayo-junio")
-- se mide segun si llego al objetivo dentro de su periodo. Las metas
-- tambien pueden tener un periodo (inicio -> fecha_limite).
--
-- meta ya tiene `fecha_limite` (fin del periodo); se agrega `fecha_inicio`.
-- indicador no tenia ninguna fecha de planificacion; se agregan ambas.
--
-- Las columnas son nullable: si no hay periodo, el calculo de avance
-- se comporta como antes (sin dimension temporal).
-- RLS: las policies de meta/indicador operan por fila (scope de unidad),
-- no por columna, asi que cubren estas columnas nuevas sin cambios.
-- ============================================================

ALTER TABLE public.meta
  ADD COLUMN IF NOT EXISTS fecha_inicio date;

ALTER TABLE public.indicador
  ADD COLUMN IF NOT EXISTS fecha_inicio date,
  ADD COLUMN IF NOT EXISTS fecha_fin date;

COMMENT ON COLUMN public.meta.fecha_inicio IS
  'Inicio del periodo de la meta. El fin es fecha_limite. Usado para el estado por plazo (Programado / Vigente / Vencido).';

COMMENT ON COLUMN public.indicador.fecha_inicio IS
  'Inicio del periodo del indicador. El avance se mide segun si llego al objetivo dentro de [fecha_inicio, fecha_fin].';

COMMENT ON COLUMN public.indicador.fecha_fin IS
  'Fin del periodo del indicador. Vencido sin alcanzar el objetivo => rojo.';

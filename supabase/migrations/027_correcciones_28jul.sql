-- ============================================================
-- MIGRACION 027: Correcciones de estructura del 28/07/2026
-- ============================================================
-- 1) Nombres que se muestran abreviados (en pantalla se usa `nombre_corto`,
--    igual que en la migración 026):
--      * SEC09 "Convivencia"   -> "Secretaría de Ordenamiento y Convivencia"
--      * DIR52 "Señalización"  -> "Dirección de Señalización y Cartelería"
--
-- 2) Nueva dirección "Proyectos de la Secretaría" (DIR54) bajo la Secretaría
--    de Ambiente y Desarrollo Sustentable (SEC07). Hay proyectos que son de la
--    Secretaría y de ninguna dirección; al filtrar por secretaría se mezclaban
--    con los de todas sus direcciones y era difícil encontrarlos.
--    Los proyectos NO se mueven acá: se reasignan desde la app.
--
-- Idempotente: se puede volver a correr sin efecto.
-- ============================================================

BEGIN;

-- 1) Nombres cortos --------------------------------------------------------
UPDATE public.unidad_organizacional
  SET nombre_corto = 'Secretaría de Ordenamiento y Convivencia'
  WHERE codigo = 'SEC09';

UPDATE public.unidad_organizacional
  SET nombre_corto = 'Dirección de Señalización y Cartelería'
  WHERE codigo = 'DIR52';

-- 2) Dirección "Proyectos de la Secretaría" en Ambiente (SEC07) ------------
INSERT INTO public.unidad_organizacional
  (parent_id, nombre, nombre_corto, tipo, nivel, orden, codigo, activa)
SELECT
  sec.id,
  'Proyectos de la Secretaría',
  'Proyectos de la Secretaría',
  'direccion',
  2,
  COALESCE((SELECT MAX(orden) FROM public.unidad_organizacional WHERE parent_id = sec.id), 0) + 1,
  'DIR54',
  true
FROM public.unidad_organizacional sec
WHERE sec.codigo = 'SEC07'
  AND NOT EXISTS (
    SELECT 1 FROM public.unidad_organizacional WHERE codigo = 'DIR54'
  );

COMMIT;

-- Para revertir:
--   update unidad_organizacional set nombre_corto='Convivencia'  where codigo='SEC09';
--   update unidad_organizacional set nombre_corto='Señalización' where codigo='DIR52';
--   delete from unidad_organizacional where codigo='DIR54';   -- solo si no tiene proyectos

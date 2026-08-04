-- ============================================================
-- MIGRACION 032: Programas de la Secretaría de Ambiente (03/08/2026)
-- ============================================================
-- Pedido: dentro de la Secretaría de Ambiente y Desarrollo Sustentable crear
-- EDUCÁ, COMPOSTÁ, TRANSFORMÁ, CIRCULÁ y BAM.
--
-- Se cargan igual que "Proyectos de la Secretaría" (migración 027): unidades de
-- nivel 2 colgando de SEC07. El filtro de áreas del POA Operativo agrupa por
-- nivel (0 secretarías, 1 subsecretarías, >=2 direcciones), así que aparecen en
-- la lista junto a Ambiente, Bromatología y Salud Ambiental.
--
-- Los proyectos NO se mueven acá: se reasignan desde la app.
--
-- Idempotente: se puede volver a correr sin efecto.
-- ============================================================

BEGIN;

INSERT INTO public.unidad_organizacional
  (parent_id, nombre, nombre_corto, tipo, nivel, orden, codigo, activa)
SELECT
  sec.id,
  nuevo.nombre,
  nuevo.nombre,
  'coordinacion',   -- son programas, no direcciones de línea
  2,
  COALESCE((SELECT MAX(orden) FROM public.unidad_organizacional WHERE parent_id = sec.id), 0)
    + nuevo.offset_orden,
  nuevo.codigo,
  true
FROM public.unidad_organizacional sec
CROSS JOIN (VALUES
  ('EDUCÁ',      'DIR55', 1),
  ('COMPOSTÁ',   'DIR56', 2),
  ('TRANSFORMÁ', 'DIR57', 3),
  ('CIRCULÁ',    'DIR58', 4),
  ('BAM',        'DIR59', 5)
) AS nuevo(nombre, codigo, offset_orden)
WHERE sec.codigo = 'SEC07'
  AND NOT EXISTS (
    SELECT 1 FROM public.unidad_organizacional u WHERE u.codigo = nuevo.codigo
  );

COMMIT;

-- Verificación:
--   SELECT u.codigo, u.nombre, u.tipo, u.nivel
--     FROM public.unidad_organizacional u
--     JOIN public.unidad_organizacional s ON s.id = u.parent_id
--    WHERE s.codigo = 'SEC07'
--    ORDER BY u.orden;
--
-- Para revertir (solo si no tienen proyectos asignados):
--   DELETE FROM public.unidad_organizacional
--    WHERE codigo IN ('DIR55','DIR56','DIR57','DIR58','DIR59');

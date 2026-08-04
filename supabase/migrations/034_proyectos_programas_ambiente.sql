-- ============================================================
-- MIGRACION 034: EDUCÁ / COMPOSTÁ / TRANSFORMÁ / CIRCULÁ / BAM
--                como PROYECTOS de Ambiente (03/08/2026)
-- ============================================================
-- Corrige la migración 032, que los creó como unidades del filtro de áreas.
-- El pedido era crearlos en PROYECTOS, dentro de la Secretaría de Ambiente.
--
--   1) Deshace la 032: borra DIR55..DIR59 (solo si quedaron vacías).
--   2) Crea los cinco proyectos colgando de SEC07, que es donde ya viven los
--      otros 19 proyectos de la Secretaría (no de una dirección puntual).
--
-- Idempotente: no duplica proyectos ni falla si la 032 nunca se aplicó.
-- ============================================================

BEGIN;

-- 1) Deshacer la 032 -------------------------------------------------------
-- Solo se borran si nadie las está usando: sin proyectos, sin agendas y sin
-- usuarios asignados. Si alguna quedó en uso, se conserva y hay que mirarla.
DELETE FROM public.unidad_organizacional u
 WHERE u.codigo IN ('DIR55', 'DIR56', 'DIR57', 'DIR58', 'DIR59')
   AND NOT EXISTS (SELECT 1 FROM public.proyecto p WHERE p.unidad_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM public.agenda_semana a WHERE a.unidad_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM public.perfil_usuario pu WHERE pu.unidad_id = u.id);

-- 2) Los cinco proyectos ---------------------------------------------------
INSERT INTO public.proyecto (periodo_id, unidad_id, codigo, nombre, estado)
SELECT
  per.id,
  sec.id,
  nuevo.codigo,
  nuevo.nombre,
  'activo'
FROM public.unidad_organizacional sec
CROSS JOIN (SELECT id FROM public.periodo WHERE activo = true LIMIT 1) per
CROSS JOIN (VALUES
  ('EDUCÁ',      'PRY403'),
  ('COMPOSTÁ',   'PRY404'),
  ('TRANSFORMÁ', 'PRY405'),
  ('CIRCULÁ',    'PRY406'),
  ('BAM',        'PRY407')
) AS nuevo(nombre, codigo)
WHERE sec.codigo = 'SEC07'
  AND NOT EXISTS (
    SELECT 1 FROM public.proyecto p WHERE p.codigo = nuevo.codigo
  );

COMMIT;

-- Verificación:
--   SELECT p.codigo, p.nombre, p.estado
--     FROM public.proyecto p
--     JOIN public.unidad_organizacional u ON u.id = p.unidad_id
--    WHERE u.codigo = 'SEC07' AND p.codigo IN ('PRY403','PRY404','PRY405','PRY406','PRY407');
--
--   SELECT codigo FROM public.unidad_organizacional
--    WHERE codigo IN ('DIR55','DIR56','DIR57','DIR58','DIR59');  -- debe dar 0 filas
--
-- Para revertir:
--   DELETE FROM public.proyecto
--    WHERE codigo IN ('PRY403','PRY404','PRY405','PRY406','PRY407');

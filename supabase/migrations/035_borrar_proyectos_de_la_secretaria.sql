-- ============================================================
-- MIGRACION 035: Borrar el área "Proyectos de la Secretaría" (03/08/2026)
-- ============================================================
-- La creó la migración 027 a pedido del 28/07, para separar los proyectos que
-- son de la Secretaría de Ambiente y de ninguna dirección. Nunca se le
-- reasignó ningún proyecto: quedó vacía y confunde en el filtro de áreas.
--
-- En la práctica esos proyectos cuelgan directo de la Secretaría (SEC07), que
-- es lo que terminó funcionando. Así que el área sobra.
--
-- Se borra con las mismas guardas de siempre: solo si no tiene proyectos,
-- agendas, usuarios asignados ni unidades hijas. Si alguna de esas cosas
-- apareciera, la unidad se conserva y hay que revisarla a mano.
--
-- Idempotente: si ya no existe, no hace nada.
-- ============================================================

BEGIN;

DELETE FROM public.unidad_organizacional u
 WHERE u.codigo = 'DIR54'
   AND NOT EXISTS (SELECT 1 FROM public.proyecto p          WHERE p.unidad_id  = u.id)
   AND NOT EXISTS (SELECT 1 FROM public.agenda_semana a     WHERE a.unidad_id  = u.id)
   AND NOT EXISTS (SELECT 1 FROM public.perfil_usuario pu   WHERE pu.unidad_id = u.id)
   AND NOT EXISTS (SELECT 1 FROM public.ficha_prisma f      WHERE f.unidad_id  = u.id)
   AND NOT EXISTS (SELECT 1 FROM public.unidad_organizacional h WHERE h.parent_id = u.id);

COMMIT;

-- Verificación (debe dar 0 filas):
--   SELECT codigo, nombre FROM public.unidad_organizacional WHERE codigo = 'DIR54';
--
-- Para revertir, volver a correr el bloque 2 de la migración 027.

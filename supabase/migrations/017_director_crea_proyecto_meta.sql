-- ============================================================
-- MIGRACION 017: Directores crean proyectos y editan/crean metas
-- ============================================================
-- Hasta ahora solo admin_funcional podía crear proyectos y metas.
-- Ahora un Director puede:
--   - crear proyectos en SU dirección
--   - editar (UPDATE) proyectos de su dirección
--   - crear / editar / borrar (soft) metas de sus proyectos
-- Se apoya en usuario_puede_cargar_unidad() (Director de la unidad o
-- admin_funcional).
-- ============================================================

-- PROYECTO: insert y update por carga (Director de la unidad o admin)
DROP POLICY IF EXISTS proyecto_insert_carga ON public.proyecto;
CREATE POLICY proyecto_insert_carga ON public.proyecto
  FOR INSERT
  WITH CHECK (public.usuario_puede_cargar_unidad(unidad_id));

DROP POLICY IF EXISTS proyecto_update_carga ON public.proyecto;
CREATE POLICY proyecto_update_carga ON public.proyecto
  FOR UPDATE
  USING (public.usuario_puede_cargar_unidad(unidad_id))
  WITH CHECK (public.usuario_puede_cargar_unidad(unidad_id));

-- META: insert por carga (la unidad del proyecto debe estar en el scope de carga)
DROP POLICY IF EXISTS meta_insert_carga ON public.meta;
CREATE POLICY meta_insert_carga ON public.meta
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.proyecto p
    WHERE p.id = meta.proyecto_id
      AND public.usuario_puede_cargar_unidad(p.unidad_id)
  ));

-- (meta_update_carga ya existe en 012 y permite editar/soft-delete metas
--  de proyectos en el scope de carga del usuario.)

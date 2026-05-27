-- ============================================================
-- MIGRACION 012: RLS policies sobre tablas de planificación
-- ============================================================
-- Usa las funciones helper definidas en 010_rbac.sql:
--   usuario_puede_ver_unidad
--   usuario_puede_cargar_unidad
--   usuario_puede_validar_unidad
--   rol_actual
--
-- ⚠️ ACTIVAR SOLO DESPUÉS DE:
--   1. Migración 010 + 011 aplicadas
--   2. Al menos 1 admin_funcional o admin_tecnico sembrado en perfil_usuario
--   3. Todos los usuarios principales creados (sino quedan bloqueados)
-- ============================================================

-- ============================================================
-- unidad_organizacional: lectura libre para autenticados, edición solo admins
-- ============================================================
ALTER TABLE public.unidad_organizacional ENABLE ROW LEVEL SECURITY;

CREATE POLICY unidad_select_all ON public.unidad_organizacional
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY unidad_mutate_admin ON public.unidad_organizacional
  FOR ALL
  USING (public.rol_actual() = 'admin_funcional')
  WITH CHECK (public.rol_actual() = 'admin_funcional');

-- ============================================================
-- proyecto / meta / indicador / hito: scope por unidad
-- ============================================================

-- PROYECTO
ALTER TABLE public.proyecto ENABLE ROW LEVEL SECURITY;

CREATE POLICY proyecto_select_scope ON public.proyecto
  FOR SELECT
  USING (public.usuario_puede_ver_unidad(unidad_id));

CREATE POLICY proyecto_mutate_admin ON public.proyecto
  FOR ALL
  USING (public.rol_actual() = 'admin_funcional')
  WITH CHECK (public.rol_actual() = 'admin_funcional');

-- META
ALTER TABLE public.meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY meta_select_scope ON public.meta
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.proyecto p
    WHERE p.id = meta.proyecto_id
      AND public.usuario_puede_ver_unidad(p.unidad_id)
  ));

CREATE POLICY meta_update_carga ON public.meta
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.proyecto p
    WHERE p.id = meta.proyecto_id
      AND public.usuario_puede_cargar_unidad(p.unidad_id)
  ));

CREATE POLICY meta_mutate_admin ON public.meta
  FOR ALL
  USING (public.rol_actual() = 'admin_funcional')
  WITH CHECK (public.rol_actual() = 'admin_funcional');

-- INDICADOR
ALTER TABLE public.indicador ENABLE ROW LEVEL SECURITY;

CREATE POLICY indicador_select_scope ON public.indicador
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.meta m
    JOIN public.proyecto p ON p.id = m.proyecto_id
    WHERE m.id = indicador.meta_id
      AND public.usuario_puede_ver_unidad(p.unidad_id)
  ));

CREATE POLICY indicador_insert_carga ON public.indicador
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meta m
    JOIN public.proyecto p ON p.id = m.proyecto_id
    WHERE m.id = indicador.meta_id
      AND public.usuario_puede_cargar_unidad(p.unidad_id)
  ));

CREATE POLICY indicador_update_carga ON public.indicador
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.meta m
    JOIN public.proyecto p ON p.id = m.proyecto_id
    WHERE m.id = indicador.meta_id
      AND public.usuario_puede_cargar_unidad(p.unidad_id)
  ));

CREATE POLICY indicador_mutate_admin ON public.indicador
  FOR ALL
  USING (public.rol_actual() = 'admin_funcional')
  WITH CHECK (public.rol_actual() = 'admin_funcional');

-- HITO
ALTER TABLE public.hito ENABLE ROW LEVEL SECURITY;

CREATE POLICY hito_select_scope ON public.hito
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.proyecto p
    WHERE p.id = hito.proyecto_id
      AND public.usuario_puede_ver_unidad(p.unidad_id)
  ));

CREATE POLICY hito_mutate_admin ON public.hito
  FOR ALL
  USING (public.rol_actual() = 'admin_funcional')
  WITH CHECK (public.rol_actual() = 'admin_funcional');

-- ============================================================
-- AVANCE: scope + carga + validación
-- ============================================================
ALTER TABLE public.avance ENABLE ROW LEVEL SECURITY;

CREATE POLICY avance_select_scope ON public.avance
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.proyecto p
    WHERE p.id = avance.proyecto_id
      AND public.usuario_puede_ver_unidad(p.unidad_id)
  ));

-- Insert: Director de la unidad (o admin) puede cargar
CREATE POLICY avance_insert_carga ON public.avance
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.proyecto p
    WHERE p.id = avance.proyecto_id
      AND public.usuario_puede_cargar_unidad(p.unidad_id)
  ));

-- Update: solo para validar/observar (Subsec con scope) o admin
CREATE POLICY avance_update_validacion ON public.avance
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.proyecto p
    WHERE p.id = avance.proyecto_id
      AND (
        public.usuario_puede_validar_unidad(p.unidad_id)
        OR public.rol_actual() = 'admin_funcional'
      )
  ));

CREATE POLICY avance_delete_admin ON public.avance
  FOR DELETE
  USING (public.rol_actual() = 'admin_funcional');

-- ============================================================
-- AGENDA: carga por Director de la unidad
-- ============================================================
ALTER TABLE public.agenda_semana ENABLE ROW LEVEL SECURITY;

CREATE POLICY agenda_semana_select_scope ON public.agenda_semana
  FOR SELECT
  USING (public.usuario_puede_ver_unidad(unidad_id));

CREATE POLICY agenda_semana_mutate_carga ON public.agenda_semana
  FOR ALL
  USING (public.usuario_puede_cargar_unidad(unidad_id))
  WITH CHECK (public.usuario_puede_cargar_unidad(unidad_id));

ALTER TABLE public.agenda_actividad ENABLE ROW LEVEL SECURITY;

CREATE POLICY agenda_actividad_select_scope ON public.agenda_actividad
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.agenda_semana s
    WHERE s.id = agenda_actividad.agenda_semana_id
      AND public.usuario_puede_ver_unidad(s.unidad_id)
  ));

CREATE POLICY agenda_actividad_mutate_carga ON public.agenda_actividad
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.agenda_semana s
    WHERE s.id = agenda_actividad.agenda_semana_id
      AND public.usuario_puede_cargar_unidad(s.unidad_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.agenda_semana s
    WHERE s.id = agenda_actividad.agenda_semana_id
      AND public.usuario_puede_cargar_unidad(s.unidad_id)
  ));

-- ============================================================
-- PERIODO: lectura libre, edición solo admin
-- ============================================================
ALTER TABLE public.periodo ENABLE ROW LEVEL SECURITY;

CREATE POLICY periodo_select_all ON public.periodo
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY periodo_mutate_admin ON public.periodo
  FOR ALL
  USING (public.rol_actual() = 'admin_funcional')
  WITH CHECK (public.rol_actual() = 'admin_funcional');

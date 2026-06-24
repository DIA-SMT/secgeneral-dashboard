-- ============================================================
-- MIGRACION 018: El Secretario carga/edita como Director, pero
-- sobre TODAS las direcciones de su secretaría.
-- ============================================================
-- Un Secretario gestiona varias direcciones. Antes solo podía ver
-- (lectura) su secretaría; ahora también puede CARGAR avances, crear
-- proyectos y editar metas/indicadores en cualquier unidad dentro de
-- su ámbito (su secretaría + subsecretarías + direcciones).
--
-- Se redefine usuario_puede_cargar_unidad() agregando el caso
-- 'secretario' (y 'subsecretario', que también supervisa varias
-- direcciones), usando unidades_descendientes() para el alcance.
-- ============================================================

CREATE OR REPLACE FUNCTION public.usuario_puede_cargar_unidad(p_unidad_id uuid)
  RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfil_usuario p
    WHERE p.user_id = auth.uid()
      AND p.activo = true
      AND (
        p.rol = 'admin_funcional'
        OR (p.rol = 'director' AND p.unidad_id = p_unidad_id)
        OR (
          p.rol IN ('secretario', 'subsecretario')
          AND p_unidad_id IN (SELECT id FROM public.unidades_descendientes(p.unidad_id))
        )
      )
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

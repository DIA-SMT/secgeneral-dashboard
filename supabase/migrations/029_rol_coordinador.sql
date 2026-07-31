-- ============================================================
-- MIGRACION 029: Rol "coordinador" (30/07/2026)
-- ============================================================
-- "Crear el Rol de coordinador para la secretaría de ambiente."
--
-- Alcance elegido: igual al de un secretario/subsecretario — ve y CARGA sobre
-- su unidad + todos sus descendientes. No valida avances (eso sigue siendo del
-- subsecretario). Se asigna la unidad desde /admin/usuarios; el rol es genérico,
-- el caso concreto es la Secretaría de Ambiente y Desarrollo Sustentable.
--
-- OJO: sin BEGIN/COMMIT a propósito. `ALTER TYPE ... ADD VALUE` no puede usarse
-- dentro de la misma transacción en la que se agrega el valor (el CHECK de más
-- abajo lo compara contra un literal), así que cada sentencia va suelta.
--
-- Idempotente: se puede volver a correr sin efecto.
-- ============================================================

-- 1) Nuevo valor del enum ---------------------------------------------------
ALTER TYPE rol_usuario ADD VALUE IF NOT EXISTS 'coordinador';

-- 2) El coordinador necesita unidad asignada, igual que sec/subsec/director --
ALTER TABLE public.perfil_usuario DROP CONSTRAINT IF EXISTS chk_perfil_unidad;

ALTER TABLE public.perfil_usuario ADD CONSTRAINT chk_perfil_unidad CHECK (
  (rol IN ('intendenta', 'admin_funcional', 'admin_tecnico'))
  OR (rol IN ('secretario', 'subsecretario', 'director', 'coordinador')
      AND unidad_id IS NOT NULL)
);

-- 3) Permiso de carga: su unidad + descendientes -----------------------------
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
          p.rol IN ('secretario', 'subsecretario', 'coordinador')
          AND p_unidad_id IN (SELECT id FROM public.unidades_descendientes(p.unidad_id))
        )
      )
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- `usuario_puede_ver_unidad` no necesita cambios: ya resuelve por unidad propia
-- + ancestros + descendientes para cualquier rol no global.

-- Para revertir (el valor del enum NO se puede quitar en Postgres; basta con
-- dejar de asignarlo):
--   ...volver a la definición de usuario_puede_cargar_unidad de la migración 018
--   ...y al CHECK de la migración 010.

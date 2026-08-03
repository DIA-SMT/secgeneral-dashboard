-- ============================================================
-- MIGRACION 031: Acceso global de LECTURA (03/08/2026)
-- ============================================================
-- Pedido: "darle al Secretario General acceso a todas las POAs".
--
-- Un `secretario` ve y carga sobre su secretaría y descendientes. Acá hace
-- falta que VEAN todo sin dejar de ser secretarios de su área.
--
-- Se resuelve con una marca en el perfil, no con un rol nuevo:
--   * el rol y la unidad quedan intactos (siguen figurando como Secretario de
--     su secretaría, y siguen cargando SOLO ahí);
--   * `acceso_global` amplía únicamente la VISIBILIDAD.
--
-- Es a propósito que NO se toca `usuario_puede_cargar_unidad`: ver todo no es
-- poder editar todo. Si en algún momento hace falta lo otro, es otra decisión.
--
-- Reutilizable: para el próximo que necesite ver todo, alcanza con marcarle
-- la casilla desde /admin/usuarios.
--
-- Idempotente: se puede volver a correr sin efecto.
-- ============================================================

BEGIN;

ALTER TABLE public.perfil_usuario
  ADD COLUMN IF NOT EXISTS acceso_global boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.perfil_usuario.acceso_global IS
  'Ve TODAS las unidades sin importar su rol/unidad (solo lectura). No amplía permisos de carga.';

-- Visibilidad: se suma la marca a las reglas ya existentes.
CREATE OR REPLACE FUNCTION public.usuario_puede_ver_unidad(p_unidad_id uuid)
  RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfil_usuario p
    WHERE p.user_id = auth.uid()
      AND p.activo = true
      AND (
        p.rol IN ('intendenta', 'admin_funcional', 'admin_tecnico')
        OR p.acceso_global = true
        OR p.unidad_id = p_unidad_id
        OR p.unidad_id IN (SELECT id FROM public.unidades_ancestras(p_unidad_id))
        OR p_unidad_id IN (SELECT id FROM public.unidades_descendientes(p.unidad_id))
      )
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Los dos perfiles del pedido (ya existen; no se crea ningún usuario).
--   gomeztortosa.rodrigo@gmail.com → Secretaría General
--   giulianocamila@gmail.com       → Secretaría de Gobierno
UPDATE public.perfil_usuario
   SET acceso_global = true
 WHERE lower(email) IN (
   'gomeztortosa.rodrigo@gmail.com',
   'giulianocamila@gmail.com'
 );

COMMIT;

-- Verificación:
--   SELECT email, rol, acceso_global FROM public.perfil_usuario WHERE acceso_global;
--
-- Para revertir:
--   UPDATE public.perfil_usuario SET acceso_global = false;
--   ...y volver a la definición de usuario_puede_ver_unidad de la migración 010.

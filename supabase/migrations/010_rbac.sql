-- ============================================================
-- MIGRACION 010: RBAC (Roles + perfil_usuario + funciones)
-- ============================================================
-- Modelo de roles para el sistema de monitoreo:
--   intendenta       → acceso global (lectura)
--   secretario       → su Secretaría (nivel 0) + descendientes
--   subsecretario    → su Subsecretaría (nivel 1) + direcciones hijas
--   director         → su Dirección (nivel 2) — carga avances
--   admin_funcional  → Planificación Estratégica (admin metodológico)
--   admin_tecnico    → Sistemas/Modernización (admin técnico)
-- ============================================================

CREATE TYPE rol_usuario AS ENUM (
  'intendenta',
  'secretario',
  'subsecretario',
  'director',
  'admin_funcional',
  'admin_tecnico'
);

CREATE TABLE public.perfil_usuario (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        text NOT NULL UNIQUE,
  nombre       text,
  rol          rol_usuario NOT NULL,
  unidad_id    uuid REFERENCES public.unidad_organizacional(id) ON DELETE SET NULL,
  activo       boolean NOT NULL DEFAULT true,
  metadata     jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  -- Integridad por rol:
  --   intendenta / admins → unidad_id puede ser NULL (acceso global)
  --   secretario          → unidad_id obligatoria
  --   subsecretario       → unidad_id obligatoria
  --   director            → unidad_id obligatoria
  CONSTRAINT chk_perfil_unidad CHECK (
    (rol IN ('intendenta', 'admin_funcional', 'admin_tecnico'))
    OR (rol IN ('secretario', 'subsecretario', 'director') AND unidad_id IS NOT NULL)
  )
);

CREATE INDEX idx_perfil_unidad ON public.perfil_usuario(unidad_id) WHERE activo = true;
CREATE INDEX idx_perfil_rol ON public.perfil_usuario(rol) WHERE activo = true;

CREATE TRIGGER trg_perfil_updated_at
  BEFORE UPDATE ON public.perfil_usuario
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.perfil_usuario IS
  'Perfil extendido de cada usuario autenticado: rol + unidad asignada. RLS lo usa para filtrar visibilidad.';

-- ============================================================
-- FUNCIONES AUXILIARES
-- ============================================================

-- Devuelve todos los IDs de unidades descendientes (incluye la propia)
-- de una unidad dada.
CREATE OR REPLACE FUNCTION public.unidades_descendientes(p_unidad_id uuid)
  RETURNS TABLE(id uuid) AS $$
  WITH RECURSIVE tree AS (
    SELECT u.id FROM public.unidad_organizacional u WHERE u.id = p_unidad_id
    UNION ALL
    SELECT u.id FROM public.unidad_organizacional u
      JOIN tree t ON u.parent_id = t.id
  )
  SELECT id FROM tree;
$$ LANGUAGE SQL STABLE;

-- Devuelve todos los IDs de unidades ancestras (NO incluye la propia)
-- de una unidad dada. Útil para chequear si un usuario "supervisa" la unidad.
CREATE OR REPLACE FUNCTION public.unidades_ancestras(p_unidad_id uuid)
  RETURNS TABLE(id uuid) AS $$
  WITH RECURSIVE tree AS (
    SELECT u.parent_id AS id
      FROM public.unidad_organizacional u
      WHERE u.id = p_unidad_id AND u.parent_id IS NOT NULL
    UNION ALL
    SELECT u.parent_id AS id
      FROM public.unidad_organizacional u
      JOIN tree t ON u.id = t.id
      WHERE u.parent_id IS NOT NULL
  )
  SELECT id FROM tree;
$$ LANGUAGE SQL STABLE;

-- Devuelve true si el usuario autenticado (auth.uid()) puede VER la unidad.
-- Reglas:
--   - intendenta / admin_funcional / admin_tecnico → siempre true
--   - resto → la unidad es la propia O algún descendiente O algún ancestro
--     (un secretario "ve" sus subsecretarías y direcciones; una dirección
--     "ve" a su secretaría como contexto para reportes).
CREATE OR REPLACE FUNCTION public.usuario_puede_ver_unidad(p_unidad_id uuid)
  RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfil_usuario p
    WHERE p.user_id = auth.uid()
      AND p.activo = true
      AND (
        p.rol IN ('intendenta', 'admin_funcional', 'admin_tecnico')
        OR p.unidad_id = p_unidad_id
        OR p.unidad_id IN (SELECT id FROM public.unidades_ancestras(p_unidad_id))
        OR p_unidad_id IN (SELECT id FROM public.unidades_descendientes(p.unidad_id))
      )
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Devuelve true si el usuario actual puede CARGAR datos sobre la unidad
-- (es Director de esa unidad o admin_funcional).
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
      )
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Devuelve true si el usuario actual puede VALIDAR avances sobre la unidad
-- (es Subsecretario que tiene la unidad en su scope, o admin_funcional).
CREATE OR REPLACE FUNCTION public.usuario_puede_validar_unidad(p_unidad_id uuid)
  RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.perfil_usuario p
    WHERE p.user_id = auth.uid()
      AND p.activo = true
      AND (
        p.rol = 'admin_funcional'
        OR (
          p.rol = 'subsecretario'
          AND p_unidad_id IN (SELECT id FROM public.unidades_descendientes(p.unidad_id))
        )
      )
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Devuelve el rol del usuario actual (o NULL si no tiene perfil)
CREATE OR REPLACE FUNCTION public.rol_actual()
  RETURNS rol_usuario AS $$
  SELECT rol FROM public.perfil_usuario WHERE user_id = auth.uid() AND activo = true LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================
-- RLS para perfil_usuario
-- ============================================================
-- Cada usuario ve su propio perfil. Admins ven todos.

ALTER TABLE public.perfil_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY perfil_select_propio_o_admin ON public.perfil_usuario
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.rol_actual() IN ('admin_funcional', 'admin_tecnico')
  );

CREATE POLICY perfil_insert_admin ON public.perfil_usuario
  FOR INSERT
  WITH CHECK (public.rol_actual() IN ('admin_funcional', 'admin_tecnico'));

CREATE POLICY perfil_update_admin ON public.perfil_usuario
  FOR UPDATE
  USING (public.rol_actual() IN ('admin_funcional', 'admin_tecnico'));

CREATE POLICY perfil_delete_admin ON public.perfil_usuario
  FOR DELETE
  USING (public.rol_actual() = 'admin_tecnico');

-- ============================================================
-- MIGRACION 002: Estructura organizacional
-- ============================================================
-- Arbol recursivo padre-hijo para representar la jerarquia
-- de la Secretaria General sin rigidez de niveles.
--
-- Puede representar: Secretaria > Subsecretaria > Direccion >
-- Departamento > Coordinacion y cualquier variante futura
-- sin modificar el esquema.
-- ============================================================

CREATE TABLE public.unidad_organizacional (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relacion padre-hijo. NULL = nodo raiz (Secretaria General).
  -- ON DELETE RESTRICT: no se puede borrar una unidad que tiene hijos.
  parent_id   uuid        REFERENCES public.unidad_organizacional(id)
                          ON DELETE RESTRICT,

  nombre      text        NOT NULL,
  nombre_corto text,               -- abreviatura para dashboards y cards
  tipo        tipo_unidad NOT NULL,

  -- Nivel desnormalizado (0 = raiz). Facilita queries comunes
  -- como "todas las unidades de nivel 1" sin CTE recursiva.
  -- Se mantiene consistente por aplicacion al crear/mover nodos.
  nivel       smallint    NOT NULL DEFAULT 0,

  -- Orden de presentacion entre hermanos en la misma rama
  orden       smallint    NOT NULL DEFAULT 0,

  -- Nombre del responsable actual. Texto libre, NO FK a usuarios.
  -- Razon: en esta etapa, los responsables de area no necesariamente
  -- seran usuarios del sistema. Forzar un FK agregaria friccion.
  -- Cuando se implemente carga descentralizada, se puede agregar
  -- un campo responsable_usuario_id FK opcional.
  responsable_nombre text,

  activa      boolean     NOT NULL DEFAULT true,

  -- Metadata extensible: telefono, ubicacion fisica, etc.
  -- NO para datos relacionales principales.
  metadata    jsonb       DEFAULT '{}',

  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- -------------------------------------------------------
-- Trigger updated_at
-- -------------------------------------------------------
CREATE TRIGGER trg_unidad_updated_at
  BEFORE UPDATE ON public.unidad_organizacional
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -------------------------------------------------------
-- Indices
-- -------------------------------------------------------
CREATE INDEX idx_unidad_parent  ON public.unidad_organizacional(parent_id);
CREATE INDEX idx_unidad_tipo    ON public.unidad_organizacional(tipo);
CREATE INDEX idx_unidad_activa  ON public.unidad_organizacional(activa) WHERE activa = true;

-- -------------------------------------------------------
-- Comentario de tabla
-- -------------------------------------------------------
COMMENT ON TABLE public.unidad_organizacional IS
  'Arbol jerarquico flexible de la estructura organizacional. '
  'Relacion padre-hijo sin limite de profundidad. '
  'Capa A del modelo de datos.';

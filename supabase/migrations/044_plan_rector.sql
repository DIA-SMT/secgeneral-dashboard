-- ============================================================
-- MIGRACION 044: Plan Rector — jerarquia y vinculo con el POA (31/08/2026)
-- ============================================================
-- Pedido de las paginas 36 y 37: "vinculen los proyectos (con sus metas e
-- indicadores) con el ambito de intervencion y con lo demas del orden
-- jerarquico del plan rector".
--
-- Esta migracion crea SOLO la estructura. Los 104 nodos y los 14 ODS los carga
-- supabase/import/500_import_plan_rector.ts desde supabase/import/plan-rector.json,
-- siguiendo la convencion del repo (esquema en migrations, datos de archivo en
-- import). El vinculo proyecto -> nodo se carga desde la app.
--
-- CONTEXTO IMPORTANTE: la columna "Programas vinculados" del Excel del cliente
-- llego VACIA (0 celdas con dato, con los rangos combinados armados por eje).
-- O sea que el mapeo no existe como dato y hay que producirlo. Por eso el
-- vinculo nace como 'propuesto' y necesita confirmacion: no es un dato
-- importado, es una decision que alguien toma y firma.
--
-- Lo que esta migracion NO hace, a proposito:
--   * no calcula porcentajes. El avance se calcula en TypeScript reusando
--     src/lib/utils.ts (avanceIndicador / avanceAgregado). El repo ya decidio
--     esto: 0 vistas con calculo en 43 migraciones, y la 023 lo dice textual.
--     Reimplementar avanceIndicador en SQL son ~150 lineas con
--     metadata.invertida, los placeholders de texto y las reglas fechadas del
--     16.07, 23.07 y 28.07. Duplicadas, divergen.
--   * no toca nada existente. Ninguna tabla, funcion o policy previa se
--     modifica.
--
-- VOCABULARIO: en PlanIA "ambito" ya significa el recorte organizacional del
-- panel (`ambitoUsuario`, "mide siempre el ambito completo"). Para no pisar ese
-- sentido, el nivel 0 del Plan Rector se llama 'area_intervencion' en el enum y
-- se rotula "Ambito de intervencion (Plan Rector)" en la UI.
--
-- Idempotente: se puede volver a correr sin efecto.
-- ============================================================

BEGIN;

-- ============================================================
-- 1) Tipos
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_nodo_rector') THEN
    CREATE TYPE tipo_nodo_rector AS ENUM ('area_intervencion', 'eje', 'objetivo', 'linea');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'estado_vinculo_rector') THEN
    CREATE TYPE estado_vinculo_rector AS ENUM ('propuesto', 'confirmado', 'rechazado');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'origen_vinculo_rector') THEN
    CREATE TYPE origen_vinculo_rector AS ENUM ('carga_manual', 'sugerencia_lote', 'importacion');
  END IF;
END$$;

-- ============================================================
-- 2) plan_rector_nodo — los 104 nodos en un arbol
-- ============================================================
-- Patron `unidad_organizacional` (002): un arbol con parent_id y un nivel
-- desnormalizado, que es el que el repo ya sabe recorrer.
--
-- Sin periodo_id: el Plan Rector es plurianual, el POA es anual. El vinculo es
-- el que queda atado a un proyecto (y por lo tanto a un periodo), no el nodo.
--
-- Sin deleted_at: un solo mecanismo de baja, `activa`, como unidad_organizacional.
--
-- Sin columnas denormalizadas area_id / eje_id: con profundidad 4 el JOIN no
-- duele, y la denormalizacion miente en silencio el dia que alguien mueva un
-- parent_id a mano.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plan_rector_nodo (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id      uuid REFERENCES public.plan_rector_nodo(id) ON DELETE RESTRICT,
  tipo           tipo_nodo_rector NOT NULL,
  nivel          smallint NOT NULL,
  -- Clave de identidad ESTABLE, no posicional. Sale de la fila del Excel.
  -- Los ejes estan numerados 1..17 GLOBALES (A1: 1-3, A2: 4-7, A3: 8-10,
  -- A4: 11-15, A5: 16-17). Si el cliente inserta un eje en A1 se corren 16
  -- codigos; con un seed idempotente por codigo, la corrida siguiente
  -- insertaria ~60 nodos nuevos al lado de los viejos y los vinculos seguirian
  -- apuntando a los viejos: el tablero mostraria el arbol duplicado.
  clave_estable  text NOT NULL UNIQUE,
  -- Lo que dice el documento del cliente ('A1', '8'). NO unico a proposito:
  -- si renumeran, puede haber transitoriamente dos con el mismo codigo.
  codigo_cliente text,
  -- El texto completo del Excel, con sus typos incluidos: es el documento
  -- oficial y no nos toca corregirlo.
  nombre         text NOT NULL,
  nombre_corto   text,
  orden          smallint NOT NULL DEFAULT 0,
  activa         boolean NOT NULL DEFAULT true,
  metadata       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  -- Coherencia tipo <-> nivel, y la raiz es la unica sin padre.
  CONSTRAINT chk_prn_tipo_nivel CHECK (
    (tipo = 'area_intervencion' AND nivel = 0 AND parent_id IS NULL)
    OR (tipo = 'eje'            AND nivel = 1 AND parent_id IS NOT NULL)
    OR (tipo = 'objetivo'       AND nivel = 2 AND parent_id IS NOT NULL)
    OR (tipo = 'linea'          AND nivel = 3 AND parent_id IS NOT NULL)
  ),
  CONSTRAINT chk_prn_nombre CHECK (btrim(nombre) <> '')
);

CREATE INDEX IF NOT EXISTS idx_prn_parent ON public.plan_rector_nodo(parent_id);
CREATE INDEX IF NOT EXISTS idx_prn_tipo   ON public.plan_rector_nodo(tipo) WHERE activa;

DROP TRIGGER IF EXISTS trg_prn_updated_at ON public.plan_rector_nodo;
CREATE TRIGGER trg_prn_updated_at
  BEFORE UPDATE ON public.plan_rector_nodo
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.plan_rector_nodo IS
  'Jerarquia del Plan Rector: area de intervencion > eje > objetivo > linea (5/17/19/63 al 31.08.2026). Plurianual, sin periodo_id. El texto es el del documento oficial, con sus typos.';
COMMENT ON COLUMN public.plan_rector_nodo.clave_estable IS
  'Identidad estable del nodo, derivada de la fila del Excel. NUNCA posicional: los ejes estan numerados globalmente y renumerarlos duplicaria el arbol.';

-- Valida que el padre sea del nivel inmediatamente superior. El CHECK de
-- arriba no puede hacerlo (necesita mirar otra fila).
CREATE OR REPLACE FUNCTION public.prn_validar_padre()
  RETURNS trigger AS $$
DECLARE
  v_tipo_padre tipo_nodo_rector;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'Un nodo del Plan Rector no puede ser su propio padre';
  END IF;
  SELECT tipo INTO v_tipo_padre FROM public.plan_rector_nodo WHERE id = NEW.parent_id;
  IF v_tipo_padre IS DISTINCT FROM (
    CASE NEW.tipo
      WHEN 'eje'      THEN 'area_intervencion'::tipo_nodo_rector
      WHEN 'objetivo' THEN 'eje'::tipo_nodo_rector
      WHEN 'linea'    THEN 'objetivo'::tipo_nodo_rector
    END
  ) THEN
    RAISE EXCEPTION 'Jerarquia invalida del Plan Rector: un nodo % no puede colgar de un %',
      NEW.tipo, COALESCE(v_tipo_padre::text, 'nodo inexistente');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prn_validar_padre ON public.plan_rector_nodo;
CREATE TRIGGER trg_prn_validar_padre
  BEFORE INSERT OR UPDATE OF parent_id, tipo ON public.plan_rector_nodo
  FOR EACH ROW EXECUTE FUNCTION public.prn_validar_padre();

-- ============================================================
-- 3) ODS — tabla propia, con el numero como clave
-- ============================================================
-- No un text[] crudo en el eje: los ODS del Excel vienen con el numero adelante
-- y con typos ("infrestructura", "comunidades disponibles" por "sostenibles"),
-- y son 14 distintos de los 17. Con el numero como clave los typos dejan de
-- importar y la vista por ODS sale de un JOIN.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ods (
  numero      smallint PRIMARY KEY CHECK (numero BETWEEN 1 AND 17),
  nombre      text NOT NULL,
  -- El texto tal como lo escribe el Excel del cliente, para poder rastrear.
  nombre_documento text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ods IS
  'Objetivos de Desarrollo Sostenible. numero como PK: el Excel del Plan Rector los escribe con typos y con el numero adelante.';

-- Puente eje <-> ODS. En el Excel los ODS cuelgan del EJE (no de la linea):
-- de 63 filas con linea, 22 traen ODS sin linea, lo que confirma que el ODS es
-- del grupo y no de la fila.
CREATE TABLE IF NOT EXISTS public.pr_eje_ods (
  nodo_id     uuid NOT NULL REFERENCES public.plan_rector_nodo(id) ON DELETE CASCADE,
  ods_numero  smallint NOT NULL REFERENCES public.ods(numero) ON DELETE RESTRICT,
  PRIMARY KEY (nodo_id, ods_numero)
);

COMMENT ON TABLE public.pr_eje_ods IS
  'Que ODS declara cada eje estrategico. En el documento los ODS cuelgan del eje, no de la linea.';

-- ============================================================
-- 4) proyecto_plan_rector — el vinculo
-- ============================================================
-- Nace 'propuesto'. Solo admin_funcional confirma y marca el principal.
--
-- N:N a proposito: en la medicion del 31.08 sobre 63 proyectos, en 31 al menos
-- un criterio dijo que el proyecto aporta a mas de un eje y en 12 lo dijeron
-- los cuatro (los Puntos Verdes estan nombrados en el eje 6 Y en el 4).
-- Si el cliente decide que el vinculo es unico, se aprieta con el indice
-- parcial de mas abajo; al reves no se puede sin rehacer la tabla.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.proyecto_plan_rector (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- RESTRICT y no CASCADE: en PlanIA el borrado de proyectos es blando
  -- (deleted_at). Si algun dia se borra duro, que avise en vez de llevarse la
  -- imputacion en silencio.
  proyecto_id    uuid NOT NULL REFERENCES public.proyecto(id) ON DELETE RESTRICT,
  nodo_id        uuid NOT NULL REFERENCES public.plan_rector_nodo(id) ON DELETE RESTRICT,
  -- El vinculo que cuenta para los totales. Sin esto, un proyecto imputado a
  -- tres ejes se contaria tres veces y el total del area quedaria inflado.
  principal      boolean NOT NULL DEFAULT false,
  estado         estado_vinculo_rector NOT NULL DEFAULT 'propuesto',
  origen         origen_vinculo_rector NOT NULL DEFAULT 'carga_manual',
  confianza      smallint CHECK (confianza IS NULL OR confianza BETWEEN 0 AND 100),
  metodo         text,
  justificacion  text,
  creado_por     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmado_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  -- Permite re-proponer un par que fue rechazado antes.
  CONSTRAINT uq_ppr_par UNIQUE (proyecto_id, nodo_id, estado),
  -- Un vinculo confirmado tiene que tener firma y fecha.
  CONSTRAINT chk_ppr_confirmado CHECK (
    (estado <> 'confirmado') OR (confirmado_at IS NOT NULL)
  ),
  -- Solo un vinculo confirmado puede ser el principal.
  CONSTRAINT chk_ppr_principal_confirmado CHECK (
    (NOT principal) OR (estado = 'confirmado')
  )
);

-- UN solo principal por proyecto, garantizado por indice y no por convencion
-- de la app: es lo que hace que los totales cierren.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ppr_principal
  ON public.proyecto_plan_rector(proyecto_id)
  WHERE principal AND estado = 'confirmado';

CREATE INDEX IF NOT EXISTS idx_ppr_nodo
  ON public.proyecto_plan_rector(nodo_id) WHERE estado = 'confirmado';
CREATE INDEX IF NOT EXISTS idx_ppr_proyecto
  ON public.proyecto_plan_rector(proyecto_id);

DROP TRIGGER IF EXISTS trg_ppr_updated_at ON public.proyecto_plan_rector;
CREATE TRIGGER trg_ppr_updated_at
  BEFORE UPDATE ON public.proyecto_plan_rector
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.proyecto_plan_rector IS
  'Imputacion de un proyecto del POA a un nodo del Plan Rector. Nace propuesta; solo admin_funcional confirma. `principal` es el vinculo que cuenta para los totales (unico por proyecto, por indice).';

-- El vinculo nunca apunta al nivel 0: el area se deriva subiendo el arbol.
-- Asi no hay dos formas de decir lo mismo.
CREATE OR REPLACE FUNCTION public.ppr_validar_nodo()
  RETURNS trigger AS $$
DECLARE
  v_tipo tipo_nodo_rector;
BEGIN
  SELECT tipo INTO v_tipo FROM public.plan_rector_nodo WHERE id = NEW.nodo_id;
  IF v_tipo = 'area_intervencion' THEN
    RAISE EXCEPTION 'Un proyecto se imputa a un eje, objetivo o linea, no directamente a un area de intervencion';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ppr_validar_nodo ON public.proyecto_plan_rector;
CREATE TRIGGER trg_ppr_validar_nodo
  BEFORE INSERT OR UPDATE OF nodo_id ON public.proyecto_plan_rector
  FOR EACH ROW EXECUTE FUNCTION public.ppr_validar_nodo();

-- ============================================================
-- 5) proyecto_pr_exclusion — "este proyecto no corresponde al Plan Rector"
-- ============================================================
-- Imprescindible: sin esto no se distingue "falta clasificar" de "no
-- corresponde". En la medicion del 31.08, en 35 proyectos los cuatro criterios
-- coincidieron en que no encaja en ningun eje (auditoria de reparaciones,
-- indumentaria institucional, acreditacion de periodistas), y ese numero puede
-- llegar a 180 segun como el cliente resuelva las efemerides y la gestion
-- interna. Sobre 441 proyectos, la diferencia es el 40 % del POA.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.proyecto_pr_exclusion (
  proyecto_id   uuid PRIMARY KEY REFERENCES public.proyecto(id) ON DELETE RESTRICT,
  motivo        text NOT NULL CHECK (btrim(motivo) <> ''),
  declarado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.proyecto_pr_exclusion IS
  'Proyectos declarados fuera del Plan Rector, con motivo. Cuentan como cobertura resuelta y no entran a ningun denominador de porcentaje.';

-- ============================================================
-- 6) Historial del vinculo — append-only
-- ============================================================
-- Patron indicador_historial (028), con el autor desnormalizado porque el
-- perfil se puede desactivar o cambiar de unidad y el historial tiene que
-- seguir legible. Mover el `principal` de un proyecto mueve dos numeros del
-- tablero a la vez: eso tiene que tener firma.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plan_rector_vinculo_historial (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id           uuid NOT NULL REFERENCES public.proyecto(id) ON DELETE CASCADE,
  nodo_id               uuid REFERENCES public.plan_rector_nodo(id) ON DELETE SET NULL,
  accion                text NOT NULL,
  estado_resultante     estado_vinculo_rector,
  principal_resultante  boolean,
  observacion           text,
  registrado_por        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  registrado_por_email  text,
  registrado_por_nombre text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prvh_proyecto
  ON public.plan_rector_vinculo_historial(proyecto_id, created_at DESC);

COMMENT ON TABLE public.plan_rector_vinculo_historial IS
  'Trazabilidad de las imputaciones al Plan Rector. Append-only: no se edita ni se borra.';

-- ============================================================
-- 7) RLS
-- ============================================================
-- Sin politicas explicitas, con RLS activada, las tablas quedan invisibles y el
-- panel sale en blanco sin error; sin RLS quedan expuestas por PostgREST. Van
-- las dos cosas en esta misma migracion.

-- --- La jerarquia y los ODS: los ve cualquier autenticado, los edita el admin
--     funcional. Mismo criterio que unidad_organizacional (012).
ALTER TABLE public.plan_rector_nodo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prn_select_all ON public.plan_rector_nodo;
CREATE POLICY prn_select_all ON public.plan_rector_nodo
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS prn_mutate_admin ON public.plan_rector_nodo;
CREATE POLICY prn_mutate_admin ON public.plan_rector_nodo
  FOR ALL
  USING (public.rol_actual() = 'admin_funcional')
  WITH CHECK (public.rol_actual() = 'admin_funcional');

ALTER TABLE public.ods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ods_select_all ON public.ods;
CREATE POLICY ods_select_all ON public.ods
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS ods_mutate_admin ON public.ods;
CREATE POLICY ods_mutate_admin ON public.ods
  FOR ALL
  USING (public.rol_actual() = 'admin_funcional')
  WITH CHECK (public.rol_actual() = 'admin_funcional');

ALTER TABLE public.pr_eje_ods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pr_eje_ods_select_all ON public.pr_eje_ods;
CREATE POLICY pr_eje_ods_select_all ON public.pr_eje_ods
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS pr_eje_ods_mutate_admin ON public.pr_eje_ods;
CREATE POLICY pr_eje_ods_mutate_admin ON public.pr_eje_ods
  FOR ALL
  USING (public.rol_actual() = 'admin_funcional')
  WITH CHECK (public.rol_actual() = 'admin_funcional');

-- --- El vinculo: se ve con el alcance del proyecto; se propone si se puede
--     cargar sobre la unidad del proyecto; se confirma solo el admin funcional.
ALTER TABLE public.proyecto_plan_rector ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ppr_select_scope ON public.proyecto_plan_rector;
CREATE POLICY ppr_select_scope ON public.proyecto_plan_rector
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.proyecto p
    WHERE p.id = proyecto_plan_rector.proyecto_id
      AND public.usuario_puede_ver_unidad(p.unidad_id)
  ));

-- Propone quien puede cargar el POA de la unidad del proyecto, y SOLO puede
-- crear propuestas: el WITH CHECK le prohibe insertar algo ya confirmado o
-- marcado como principal. Ojo que despues de la 042 un director carga sobre
-- toda su secretaria.
DROP POLICY IF EXISTS ppr_insert_propuesta ON public.proyecto_plan_rector;
CREATE POLICY ppr_insert_propuesta ON public.proyecto_plan_rector
  FOR INSERT
  WITH CHECK (
    estado = 'propuesto'
    AND principal = false
    AND EXISTS (
      SELECT 1 FROM public.proyecto p
      WHERE p.id = proyecto_plan_rector.proyecto_id
        AND public.usuario_puede_cargar_unidad(p.unidad_id)
    )
  );

-- Puede retirar su propia propuesta mientras siga sin confirmar.
DROP POLICY IF EXISTS ppr_delete_propia_propuesta ON public.proyecto_plan_rector;
CREATE POLICY ppr_delete_propia_propuesta ON public.proyecto_plan_rector
  FOR DELETE
  USING (
    estado = 'propuesto'
    AND creado_por = auth.uid()
  );

-- Confirmar, rechazar y mover el principal: solo admin_funcional. Los demas no
-- tienen politica de UPDATE, asi que no pueden actualizar ninguna columna. Por
-- eso acá no hacen falta GRANT por columna como en la 043: ahi el destinatario
-- necesitaba tocar exactamente una columna, aca no toca ninguna.
DROP POLICY IF EXISTS ppr_mutate_admin ON public.proyecto_plan_rector;
CREATE POLICY ppr_mutate_admin ON public.proyecto_plan_rector
  FOR ALL
  USING (public.rol_actual() = 'admin_funcional')
  WITH CHECK (public.rol_actual() = 'admin_funcional');

-- --- Exclusiones: se ven con el alcance del proyecto, las declara el admin
--     funcional (es una afirmacion sobre el Plan Rector, no sobre el proyecto).
ALTER TABLE public.proyecto_pr_exclusion ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ppe_select_scope ON public.proyecto_pr_exclusion;
CREATE POLICY ppe_select_scope ON public.proyecto_pr_exclusion
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.proyecto p
    WHERE p.id = proyecto_pr_exclusion.proyecto_id
      AND public.usuario_puede_ver_unidad(p.unidad_id)
  ));

DROP POLICY IF EXISTS ppe_mutate_admin ON public.proyecto_pr_exclusion;
CREATE POLICY ppe_mutate_admin ON public.proyecto_pr_exclusion
  FOR ALL
  USING (public.rol_actual() = 'admin_funcional')
  WITH CHECK (public.rol_actual() = 'admin_funcional');

-- --- Historial: se lee con el alcance del proyecto, escribe quien puede
--     cargar. Append-only: no hay politica de UPDATE ni de DELETE, asi que
--     nadie puede reescribirlo.
ALTER TABLE public.plan_rector_vinculo_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS prvh_select_scope ON public.plan_rector_vinculo_historial;
CREATE POLICY prvh_select_scope ON public.plan_rector_vinculo_historial
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.proyecto p
    WHERE p.id = plan_rector_vinculo_historial.proyecto_id
      AND public.usuario_puede_ver_unidad(p.unidad_id)
  ));

DROP POLICY IF EXISTS prvh_insert_carga ON public.plan_rector_vinculo_historial;
CREATE POLICY prvh_insert_carga ON public.plan_rector_vinculo_historial
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.proyecto p
    WHERE p.id = plan_rector_vinculo_historial.proyecto_id
      AND public.usuario_puede_cargar_unidad(p.unidad_id)
  ));

-- Nadie edita ni borra el historial: ni el admin. Se revoca a nivel de tabla
-- para que no dependa solo de la ausencia de politica.
REVOKE UPDATE, DELETE ON public.plan_rector_vinculo_historial FROM anon, authenticated;

COMMIT;

-- ============================================================
-- Para revertir (en este orden, por las FK):
--   drop table if exists public.plan_rector_vinculo_historial;
--   drop table if exists public.proyecto_pr_exclusion;
--   drop table if exists public.proyecto_plan_rector;
--   drop table if exists public.pr_eje_ods;
--   drop table if exists public.ods;
--   drop function if exists public.ppr_validar_nodo();
--   drop function if exists public.prn_validar_padre();
--   drop table if exists public.plan_rector_nodo;
--   drop type if exists origen_vinculo_rector;
--   drop type if exists estado_vinculo_rector;
--   drop type if exists tipo_nodo_rector;
-- ============================================================

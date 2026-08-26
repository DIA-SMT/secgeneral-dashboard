-- ============================================================
-- MIGRACION 043: Alertas dentro del sistema (26/08/2026)
-- ============================================================
-- Pedido de las paginas 37-38: "generar herramienta para mandar mensaje de
-- alerta [...] Presentacion de informes de grado de avance: 01 de octubre. Por
-- favor actualice sus datos en el sistema", mas una alerta automatica para
-- indicadores proximos a vencer, y la posibilidad de mandar a todos o a cada
-- uno en particular.
--
-- Decision del 26.08: las alertas viven DENTRO de PlanIA (campanita en la barra
-- de arriba + cartel para las importantes), no por mail. Se descarto el email:
-- no hace falta proveedor externo, ni costo, ni que nadie confirme nada.
--
-- Que se guarda y que NO:
--   * Los mensajes MANUALES se guardan: tienen autor, texto y estado de lectura
--     por persona. Son estas dos tablas.
--   * Las alertas AUTOMATICAS de indicadores proximos a vencer NO se guardan.
--     Se calculan al leer, sobre indicador.fecha_fin y el avance del indicador.
--     Asi la alerta refleja la realidad: aparece cuando el indicador esta por
--     vencer y se va sola cuando lo cargan. No se puede tapar sin resolverlo, y
--     no hay filas repetidas ni desactualizadas que mantener.
--
-- El fan-out es explicito: mandar "a todos" escribe una fila por destinatario.
-- Cuesta 72 filas por mensaje y a cambio el "no leidas" y el "a quien le
-- llego" se responden con una sola consulta, sin casos especiales.
--
-- Idempotente: se puede volver a correr sin efecto.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- El mensaje
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alerta (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo            text NOT NULL,
  cuerpo            text NOT NULL,
  -- true => ademas de la campanita se muestra el cartel arriba de la pantalla.
  importante        boolean NOT NULL DEFAULT false,
  -- Ultimo dia en que se muestra. NULL = sin vencimiento.
  vigente_hasta     date,
  -- Autoria: se guarda tambien el email/nombre porque el perfil puede
  -- desactivarse o cambiar de unidad y el mensaje tiene que seguir legible.
  -- Mismo criterio que indicador_historial (migracion 028).
  creado_por        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  creado_por_email  text,
  creado_por_nombre text,
  created_at        timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT chk_alerta_titulo  CHECK (length(btrim(titulo)) BETWEEN 1 AND 160),
  CONSTRAINT chk_alerta_cuerpo  CHECK (length(btrim(cuerpo)) BETWEEN 1 AND 2000)
);

COMMENT ON TABLE public.alerta IS
  'Mensajes de alerta manuales que se muestran dentro del sistema (26.08). Las alertas automaticas de indicadores por vencer NO se guardan aca: se calculan al leer.';

-- ------------------------------------------------------------
-- A quien le llego y si la leyo
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.alerta_destinatario (
  alerta_id uuid NOT NULL REFERENCES public.alerta(id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leida_at  timestamptz,
  PRIMARY KEY (alerta_id, user_id)
);

-- El indice cubre la consulta de la campanita: mis alertas sin leer.
CREATE INDEX IF NOT EXISTS idx_alerta_destinatario_sin_leer
  ON public.alerta_destinatario(user_id)
  WHERE leida_at IS NULL;

COMMENT ON TABLE public.alerta_destinatario IS
  'Una fila por (alerta, destinatario). El fan-out es explicito, tambien para los envios a todos.';

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
ALTER TABLE public.alerta ENABLE ROW LEVEL SECURITY;

-- La ve quien la recibio. Los admins ven todas porque son los que las mandan.
DROP POLICY IF EXISTS alerta_select_destinatario ON public.alerta;
CREATE POLICY alerta_select_destinatario ON public.alerta
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.alerta_destinatario d
       WHERE d.alerta_id = alerta.id
         AND d.user_id = auth.uid()
    )
    OR public.rol_actual() IN ('admin_funcional', 'admin_tecnico')
  );

DROP POLICY IF EXISTS alerta_mutate_admin ON public.alerta;
CREATE POLICY alerta_mutate_admin ON public.alerta
  FOR ALL
  USING (public.rol_actual() IN ('admin_funcional', 'admin_tecnico'))
  WITH CHECK (public.rol_actual() IN ('admin_funcional', 'admin_tecnico'));

ALTER TABLE public.alerta_destinatario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS alerta_dest_select_propio ON public.alerta_destinatario;
CREATE POLICY alerta_dest_select_propio ON public.alerta_destinatario
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.rol_actual() IN ('admin_funcional', 'admin_tecnico')
  );

-- Cada uno marca como leida SOLO la propia.
DROP POLICY IF EXISTS alerta_dest_update_propio ON public.alerta_destinatario;
CREATE POLICY alerta_dest_update_propio ON public.alerta_destinatario
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS alerta_dest_mutate_admin ON public.alerta_destinatario;
CREATE POLICY alerta_dest_mutate_admin ON public.alerta_destinatario
  FOR ALL
  USING (public.rol_actual() IN ('admin_funcional', 'admin_tecnico'))
  WITH CHECK (public.rol_actual() IN ('admin_funcional', 'admin_tecnico'));

-- ------------------------------------------------------------
-- Permiso por COLUMNA sobre alerta_destinatario
-- ------------------------------------------------------------
-- La policy de UPDATE de arriba no alcanza sola. RLS no puede mirar el valor
-- viejo de la fila, asi que con permiso de UPDATE sobre toda la fila alguien
-- podria cambiar el `alerta_id` de SU propia fila y apuntarla a un mensaje que
-- no le mandaron: la WITH CHECK (user_id = auth.uid()) seguiria dando true y
-- se ganaria la lectura de ese mensaje.
--
-- Se resuelve donde corresponde: el rol solo puede escribir la columna
-- `leida_at`. Marcar como leido es lo unico que un destinatario hace.
REVOKE UPDATE ON public.alerta_destinatario FROM anon, authenticated;
GRANT  UPDATE (leida_at) ON public.alerta_destinatario TO authenticated;

COMMIT;

-- Para revertir:
--   drop table if exists public.alerta_destinatario;
--   drop table if exists public.alerta;

-- ============================================================
-- MIGRACION 028: Historial de Carga de indicadores (30/07/2026)
-- ============================================================
-- "Agregar una opción que sea un Historial de Carga, el cual permita
--  visualizar las cargas/actualización de datos realizadas sobre el
--  indicador, el valor y la fecha de las mismas. La idea es lograr una
--  trazabilidad en los datos para poder analizar su evolución en el tiempo."
--
-- Cada fila es una FOTO del indicador después de la operación (no un diff):
-- así el historial se lee como una serie temporal de valores.
--
-- Idempotente: se puede volver a correr sin efecto.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'accion_historial') THEN
    CREATE TYPE accion_historial AS ENUM ('carga', 'edicion', 'borrado');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.indicador_historial (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  indicador_id          uuid NOT NULL REFERENCES public.indicador(id) ON DELETE CASCADE,
  accion                accion_historial NOT NULL DEFAULT 'carga',
  -- Valores tal como quedaron después de la operación
  valor_actual          numeric(12,2),
  valor_actual_texto    text,
  valor_objetivo        numeric(12,2),
  valor_objetivo_texto  text,
  unidad_medida         text,
  estado_semaforo       estado_semaforo,
  observacion           text,
  -- Autoría: se guarda también el email/nombre porque el perfil puede
  -- desactivarse o cambiar de unidad y el historial tiene que seguir legible.
  registrado_por        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  registrado_por_email  text,
  registrado_por_nombre text,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_indicador_historial_indicador
  ON public.indicador_historial(indicador_id, created_at DESC);

COMMENT ON TABLE public.indicador_historial IS
  'Trazabilidad de las cargas/actualizaciones de cada indicador (30.07). Una fila por operación, con el valor resultante y la fecha.';

-- ============================================================
-- RLS: se ve con el mismo alcance que el indicador; escribe quien
-- puede cargar sobre la unidad del proyecto. No se edita ni se borra:
-- el historial es append-only.
-- ============================================================
ALTER TABLE public.indicador_historial ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS indicador_historial_select_scope ON public.indicador_historial;
CREATE POLICY indicador_historial_select_scope ON public.indicador_historial
  FOR SELECT
  USING (EXISTS (
    SELECT 1
    FROM public.indicador i
    JOIN public.meta m ON m.id = i.meta_id
    JOIN public.proyecto p ON p.id = m.proyecto_id
    WHERE i.id = indicador_historial.indicador_id
      AND public.usuario_puede_ver_unidad(p.unidad_id)
  ));

DROP POLICY IF EXISTS indicador_historial_insert_carga ON public.indicador_historial;
CREATE POLICY indicador_historial_insert_carga ON public.indicador_historial
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1
    FROM public.indicador i
    JOIN public.meta m ON m.id = i.meta_id
    JOIN public.proyecto p ON p.id = m.proyecto_id
    WHERE i.id = indicador_historial.indicador_id
      AND public.usuario_puede_cargar_unidad(p.unidad_id)
  ));

COMMIT;

-- Para revertir:
--   drop table if exists public.indicador_historial;
--   drop type if exists accion_historial;

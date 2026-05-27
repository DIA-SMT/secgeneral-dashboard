-- ============================================================
-- MIGRACION 007: Agenda Semanal
-- ============================================================
-- Permite que cada direccion cargue su agenda semanal.
-- Estructura: Unidad -> Semana (lunes) -> Actividades por dia.
-- Algunas direcciones (Planificacion Estrategica, Documentacion,
-- etc.) usan formato libre semanal (campo formato_libre).
-- ============================================================

CREATE TABLE public.agenda_semana (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id       uuid NOT NULL REFERENCES public.unidad_organizacional(id) ON DELETE CASCADE,
  fecha_lunes     date NOT NULL,
  formato_libre   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id),
  UNIQUE (unidad_id, fecha_lunes)
);

CREATE INDEX idx_agenda_semana_unidad_fecha
  ON public.agenda_semana(unidad_id, fecha_lunes);

CREATE TRIGGER trg_agenda_semana_updated_at
  BEFORE UPDATE ON public.agenda_semana
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TABLE public.agenda_actividad (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_semana_id  uuid NOT NULL REFERENCES public.agenda_semana(id) ON DELETE CASCADE,
  dia_semana        smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
  orden             smallint NOT NULL DEFAULT 0,
  es_feriado        boolean NOT NULL DEFAULT false,
  actividad         text NOT NULL,
  lugar             text,
  horario           text,
  observacion       text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agenda_actividad_semana
  ON public.agenda_actividad(agenda_semana_id, dia_semana, orden);

COMMENT ON TABLE public.agenda_semana IS
  'Agenda semanal de una unidad organizacional. Una entrada por (unidad, semana).';

COMMENT ON TABLE public.agenda_actividad IS
  'Actividades concretas dentro de una agenda semanal. dia_semana: 1=Lunes ... 7=Domingo.';

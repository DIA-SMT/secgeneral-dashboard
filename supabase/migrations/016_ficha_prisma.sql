-- ============================================================
-- MIGRACION 016: Ficha PRISMA (planificación POA 2027)
-- ============================================================
-- Cada Director carga las fichas PRISMA de los proyectos que
-- planifica para 2027. PRISMA es un acrónimo:
--   P - Programa / Proyecto
--   R - Relevancia (descripción y objetivo)
--   I - Indicador
--   S - Secretaría
--   M - Meta anual
--   A - Ancla (línea de base)
-- Más la Dirección y un Código identificador.
--
-- Estas fichas son la base de la futura POA 2027. No se vinculan
-- con la estructura del POA 2026 (proyecto/meta/indicador) — son
-- una planificación independiente para el año siguiente.
-- ============================================================

CREATE TABLE public.ficha_prisma (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unidad_id       uuid NOT NULL REFERENCES public.unidad_organizacional(id) ON DELETE CASCADE,
  anio            integer NOT NULL DEFAULT 2027,
  codigo          text,
  -- Campos PRISMA
  programa        text NOT NULL,                 -- P: Programa / Proyecto
  relevancia      text,                          -- R: Relevancia (descripción y objetivo)
  indicador       text,                          -- I: Indicador
  secretaria      text,                          -- S: Secretaría (texto libre o derivado)
  meta_anual      text,                          -- M: Meta anual
  ancla           text,                          -- A: Ancla (línea de base)
  -- Auditoría
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX idx_ficha_prisma_unidad ON public.ficha_prisma(unidad_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ficha_prisma_created_by ON public.ficha_prisma(created_by) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_ficha_prisma_updated_at
  BEFORE UPDATE ON public.ficha_prisma
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.ficha_prisma IS
  'Fichas PRISMA de planificación POA 2027. Una por programa/proyecto planificado por cada Dirección.';

-- ============================================================
-- MIGRACION 006: Indicadores
-- ============================================================
-- Un indicador es una medida operativa de una meta.
-- Una meta puede tener N indicadores. Ej: meta "Reducir tiempo
-- de espera para diagnosticos" tiene indicadores "tiempo
-- promedio en dias", "% de pacientes atendidos en < 45 dias", etc.
-- ============================================================

CREATE TABLE public.indicador (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meta_id               uuid NOT NULL REFERENCES public.meta(id) ON DELETE CASCADE,
  codigo                text,
  nombre                text NOT NULL,
  descripcion           text,
  formula               text,
  unidad_medida         text,
  valor_actual          numeric(12,2),
  valor_objetivo        numeric(12,2),
  estado_semaforo       estado_semaforo NOT NULL DEFAULT 'sin_datos',
  ultima_actualizacion  timestamptz,
  orden                 smallint NOT NULL DEFAULT 0,
  metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
  deleted_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_indicador_meta ON public.indicador(meta_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_indicador_semaforo ON public.indicador(estado_semaforo) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_indicador_updated_at
  BEFORE UPDATE ON public.indicador
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.indicador IS
  'Indicadores operativos asociados a cada meta. Una meta puede tener N indicadores medibles.';

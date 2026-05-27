-- ============================================================
-- MIGRACION 014: Relajar constraints rígidos en `meta`
-- ============================================================
-- Contexto: el Excel POA 2026 viene con metas en formato enunciado
-- ("Reducir el tiempo promedio de espera de 60 a 45 días...") sin
-- valores numéricos pre-cargados. Los Directores los van a cuantificar
-- después. La validación se mueve de la DB a la UI/Server Action.
-- ============================================================

ALTER TABLE public.meta
  DROP CONSTRAINT IF EXISTS chk_meta_cuantitativa,
  DROP CONSTRAINT IF EXISTS chk_meta_cualitativa;

-- Constraints más permisivos (solo validan si los valores existen,
-- pero no fuerzan que existan al insertar)
ALTER TABLE public.meta
  ADD CONSTRAINT chk_meta_tipo_medicion_valida CHECK (
    tipo_medicion IN ('cuantitativo', 'cualitativo', 'hito_unico')
  );

COMMENT ON CONSTRAINT chk_meta_tipo_medicion_valida ON public.meta IS
  'Tipo de medición válido. Los valores objetivo (valor_meta, escala_cualitativa) son opcionales en la importación inicial y se completan posteriormente vía UI.';

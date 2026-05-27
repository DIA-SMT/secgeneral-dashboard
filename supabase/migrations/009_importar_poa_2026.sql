-- ============================================================
-- MIGRACION 009: Reset para reimport completo del POA 2026
-- ============================================================
-- Limpia los datos de planificacion existentes para reimportar
-- desde el Excel oficial "poa 26 - indicadores.xlsx" (7 secretarias,
-- ~315 proyectos, ~690 metas, ~1280 indicadores).
--
-- IMPORTANTE: ejecutar solo despues de respaldar la base.
-- Esta migracion borra avances historicos cargados manualmente.
--
-- Mantiene:
--   - perfil_usuario (si existe), auth.users
--   - agenda_semana / agenda_actividad (datos operativos)
--
-- Borra:
--   - avance, hito, indicador, meta, proyecto
--   - unidad_organizacional (se reinserta con la jerarquia del Excel)
-- ============================================================

-- Soltar referencias de agenda a unidad antes de truncar
ALTER TABLE public.agenda_semana
  DROP CONSTRAINT IF EXISTS agenda_semana_unidad_id_fkey;

-- Limpiar planificacion en cascada
TRUNCATE TABLE
  public.avance,
  public.hito,
  public.indicador,
  public.meta,
  public.proyecto,
  public.unidad_organizacional
RESTART IDENTITY CASCADE;

-- Restaurar FK de agenda (ahora puede no resolver para agendas viejas)
ALTER TABLE public.agenda_semana
  ADD CONSTRAINT agenda_semana_unidad_id_fkey
  FOREIGN KEY (unidad_id)
  REFERENCES public.unidad_organizacional(id)
  ON DELETE CASCADE;

-- Tambien limpiar agenda por las dudas (las referencias quedaron huerfanas)
TRUNCATE TABLE public.agenda_actividad, public.agenda_semana RESTART IDENTITY CASCADE;

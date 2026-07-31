-- ============================================================
-- MIGRACION 030: Poder eliminar usuarios (31/07/2026)
-- ============================================================
-- "Necesito que me permitan eliminar usuarios."
--
-- Hoy no se puede: varias tablas apuntan a auth.users SIN regla de borrado
-- (NO ACTION), así que borrar a alguien que alguna vez cargó una agenda, un
-- avance o una ficha PRISMA falla con violación de clave foránea.
--
-- Se pasan esas FK a ON DELETE SET NULL: el dato histórico QUEDA (no se borra
-- el avance ni la agenda), solo se pierde el autor. Es preferible a un CASCADE,
-- que se llevaría puesta la carga histórica de toda la gestión.
--
--   agenda_semana.created_by
--   avance.created_by
--   avance.validado_por
--   ficha_prisma.created_by
--
-- perfil_usuario.user_id ya es ON DELETE CASCADE (migración 010): borrar el
-- usuario de Auth se lleva su perfil solo.
-- indicador_historial.registrado_por ya es ON DELETE SET NULL (migración 028) y
-- además guarda email/nombre en texto, así que el historial sigue legible.
--
-- Idempotente: solo toca las FK que todavía están en NO ACTION.
-- ============================================================

BEGIN;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT con.conname,
           con.conrelid::regclass AS tabla,
           att.attname            AS columna
    FROM pg_constraint con
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid
     AND att.attnum   = con.conkey[1]
    WHERE con.contype = 'f'
      AND con.confrelid = 'auth.users'::regclass
      AND con.conrelid IN (
        'public.agenda_semana'::regclass,
        'public.avance'::regclass,
        'public.ficha_prisma'::regclass
      )
      AND con.confdeltype = 'a'          -- 'a' = NO ACTION (lo que queremos cambiar)
      AND array_length(con.conkey, 1) = 1
  LOOP
    RAISE NOTICE 'FK % sobre %.% -> ON DELETE SET NULL', r.conname, r.tabla, r.columna;
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tabla, r.conname);
    EXECUTE format(
      'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE SET NULL',
      r.tabla, r.conname, r.columna
    );
  END LOOP;
END$$;

COMMIT;

-- Verificación (deberían figurar todas con confdeltype = 'n' = SET NULL):
--   SELECT conrelid::regclass AS tabla, conname, confdeltype
--     FROM pg_constraint
--    WHERE contype = 'f' AND confrelid = 'auth.users'::regclass
--    ORDER BY 1;

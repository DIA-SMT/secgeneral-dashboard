-- ============================================================
-- MIGRACION 037: color por actividad de agenda (correcciones 06/08/2026)
-- ============================================================
-- Pedido: "agregar la opción de variar los colores de cada actividad".
--
-- Hasta ahora el color del calendario salía de la UNIDAD que cargó la agenda
-- (una paleta rotativa asignada por posición en la vista). Eso se mantiene
-- como valor por defecto: `color` NULL ⇒ sigue usando el color de la unidad.
--
-- Se guarda la CLAVE del color, no el hex, para que el color sobreviva a un
-- cambio de paleta y para que no entre CSS arbitrario desde la base. El CHECK
-- deja la lista cerrada; tiene que coincidir con src/lib/colores-agenda.ts.
--
-- Idempotente: se puede volver a correr sin efecto.
-- ============================================================

BEGIN;

ALTER TABLE public.agenda_actividad
  ADD COLUMN IF NOT EXISTS color text;

ALTER TABLE public.agenda_actividad
  DROP CONSTRAINT IF EXISTS agenda_actividad_color_check;

ALTER TABLE public.agenda_actividad
  ADD CONSTRAINT agenda_actividad_color_check
  CHECK (color IS NULL OR color IN
    ('azul', 'verde', 'ambar', 'rojo', 'violeta', 'cian', 'rosa', 'gris'));

COMMENT ON COLUMN public.agenda_actividad.color IS
  'Clave de color de la actividad (ver src/lib/colores-agenda.ts). NULL = usa el color de la unidad.';

COMMIT;

-- Verificación:
--   SELECT column_name, data_type FROM information_schema.columns
--    WHERE table_name = 'agenda_actividad' AND column_name = 'color';
--
-- Para revertir:
--   ALTER TABLE public.agenda_actividad DROP COLUMN color;

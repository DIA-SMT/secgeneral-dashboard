-- ============================================================
-- 110: Importacion del periodo POA 2026
-- ============================================================

BEGIN;

INSERT INTO periodo (anio, nombre, fecha_inicio, fecha_fin, activo, configuracion)
VALUES (
  2026,
  'Plan Operativo Anual 2026',
  '2026-01-01',
  '2026-12-31',
  true,
  '{
    "umbrales_semaforo": {
      "verde_min": 80,
      "amarillo_min": 50,
      "dias_sin_actualizar_alerta": 15
    }
  }'::jsonb
);

COMMIT;

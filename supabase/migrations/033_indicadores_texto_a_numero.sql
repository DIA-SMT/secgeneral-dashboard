-- ============================================================
-- MIGRACION 033: Indicadores con números guardados como texto (03/08/2026)
-- ============================================================
-- El modo "texto" del formulario existe para valores tipo "Sí/No/Realizado",
-- pero se venía usando también para cargar CANTIDADES ("783", "820"). Guardadas
-- en `valor_actual_texto`, el avance no se puede calcular contra el objetivo:
-- el indicador queda clavado en el 50 % del semáforo y el porcentaje del
-- proyecto no se mueve por más que se recargue el valor.
--
-- El código ya normaliza las cargas NUEVAS. Esta migración arregla las viejas.
--
-- Solo convierte lo INEQUÍVOCO — mismo criterio que el código:
--     "783"  "0"  "12,5"  "-3"   -> sí
--     "1.234"  "45%"  "Si"  "No" -> no (ambiguo o no numérico)
-- ("1.234" puede ser mil doscientos treinta y cuatro o uno coma dos.)
--
-- El texto original se guarda en metadata.valor_texto_original para poder
-- deshacerlo. Idempotente: una vez convertido, valor_actual deja de ser NULL.
-- ============================================================

BEGIN;

-- Vista previa de lo que se va a tocar (queda en los logs):
DO $$
DECLARE n integer;
BEGIN
  SELECT count(*) INTO n
    FROM public.indicador
   WHERE deleted_at IS NULL
     AND valor_actual IS NULL
     AND btrim(valor_actual_texto) ~ '^-?[0-9]+([.,][0-9]{1,2})?$';
  RAISE NOTICE 'Indicadores a convertir de texto a número: %', n;
END$$;

UPDATE public.indicador
   SET valor_actual = replace(btrim(valor_actual_texto), ',', '.')::numeric(12,2),
       valor_actual_texto = NULL,
       metadata = metadata || jsonb_build_object(
         'valor_texto_original', valor_actual_texto,
         'migracion_033', true
       )
 WHERE deleted_at IS NULL
   AND valor_actual IS NULL
   AND btrim(valor_actual_texto) ~ '^-?[0-9]+([.,][0-9]{1,2})?$';

-- Mismo criterio para el objetivo.
UPDATE public.indicador
   SET valor_objetivo = replace(btrim(valor_objetivo_texto), ',', '.')::numeric(12,2),
       valor_objetivo_texto = NULL,
       metadata = metadata || jsonb_build_object(
         'objetivo_texto_original', valor_objetivo_texto,
         'migracion_033', true
       )
 WHERE deleted_at IS NULL
   AND valor_objetivo IS NULL
   AND btrim(valor_objetivo_texto) ~ '^-?[0-9]+([.,][0-9]{1,2})?$';

COMMIT;

-- OJO: el `estado_semaforo` materializado de las metas NO se recalcula acá
-- (la regla vive en la app, no en SQL). Se reacomoda solo la próxima vez que
-- se cargue cualquier indicador de esa meta.
--
-- Verificación — no deberían quedar números guardados como texto:
--   SELECT count(*) FROM public.indicador
--    WHERE deleted_at IS NULL AND valor_actual IS NULL
--      AND btrim(valor_actual_texto) ~ '^-?[0-9]+([.,][0-9]{1,2})?$';
--
-- Para revertir:
--   UPDATE public.indicador
--      SET valor_actual_texto = metadata->>'valor_texto_original',
--          valor_actual = NULL
--    WHERE metadata->>'migracion_033' = 'true'
--      AND metadata ? 'valor_texto_original';

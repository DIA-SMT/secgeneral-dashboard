-- ============================================================
-- MIGRACION 039: falta la Subsecretaría de Seguridad Vial (corrige la 038)
-- ============================================================
-- La 038 dejó a "Dirección Licencia de Conducir" (DIR59) colgando directo de
-- la Secretaría de Movilidad Urbana. Está mal: en el organigrama depende de la
-- "Subsecretaría de Seguridad Vial y Licencia de Conducir".
--
-- El error salió de la fuente: en el archivo que circuló ("poa 26 - indicadores
-- (5).xlsx") las celdas C60 y C62 de Hoja1 están VACÍAS, y de ahí se dedujo que
-- esas direcciones no tenían subsecretaría. En la versión buena de la planilla
-- esas celdas dicen:
--   C60:C61 → "Subsecretaría de Seguridad Vial y Licencia de Conducir"
--   C62:C63 → "Secretaria de Movilidad Urbana"  (= cuelgan de la secretaría)
--
-- O sea que DIR61 (Centro de Monitoreo) y DIR62 (Transporte) SÍ van directo de
-- la secretaría, como quedaron. Lo único que hay que corregir es DIR59.
--
-- Estructura correcta:
--
--   SEC10  Secretaría de Movilidad Urbana
--   ├── Subsecretaría de Movilidad Urbana
--   │   ├── DIR56  Dirección Administrativa de Tránsito
--   │   ├── DIR57  Dirección Operativa de Tránsito
--   │   └── DIR58  Dirección SUTRAPPA
--   ├── Subsecretaría de Seguridad Vial y Licencia de Conducir   ← esta faltaba
--   │   └── DIR59  Dirección Licencia de Conducir
--   ├── DIR61  Centro de Monitoreo de Movilidad Urbana
--   └── DIR62  Dirección de Transporte
--
-- Nota sobre los códigos: en la planilla, "Dirección Licencia de Conducir"
-- ocupa DOS filas (DIR59 y DIR60, con RES59 y RES60). Acá entra una sola
-- dirección, con DIR59: el código DIR60 ya es del Tribunal de Faltas desde la
-- 036 y no se toca.
--
-- Idempotente: si la subsecretaría ya existe, no hace nada.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_sec uuid;
  v_sub uuid;
BEGIN
  SELECT id INTO v_sec FROM public.unidad_organizacional WHERE codigo = 'SEC10';
  IF v_sec IS NULL THEN
    RAISE EXCEPTION 'No existe SEC10: correr antes la migración 038';
  END IF;

  SELECT id INTO v_sub
    FROM public.unidad_organizacional
   WHERE parent_id = v_sec
     AND nivel = 1
     AND nombre = 'Subsecretaría de Seguridad Vial y Licencia de Conducir';

  IF v_sub IS NULL THEN
    INSERT INTO public.unidad_organizacional
      (parent_id, nombre, nombre_corto, tipo, nivel, orden, activa)
    VALUES
      (v_sec, 'Subsecretaría de Seguridad Vial y Licencia de Conducir',
       'Subsecretaría de Seguridad Vial', 'subsecretaria', 1, 1, true)
    RETURNING id INTO v_sub;
  END IF;

  -- Licencia de Conducir pasa a depender de la subsecretaría.
  UPDATE public.unidad_organizacional
     SET parent_id = v_sub, nivel = 2, orden = 1
   WHERE codigo = 'DIR59';
END $$;

COMMIT;

-- Verificación (Licencia de Conducir tiene que aparecer bajo la subsecretaría):
--   WITH RECURSIVE arbol AS (
--     SELECT id, parent_id, nombre, codigo, tipo, nivel, orden
--       FROM public.unidad_organizacional WHERE codigo = 'SEC10'
--     UNION ALL
--     SELECT u.id, u.parent_id, u.nombre, u.codigo, u.tipo, u.nivel, u.orden
--       FROM public.unidad_organizacional u JOIN arbol a ON u.parent_id = a.id
--   )
--   SELECT nivel, codigo, nombre, tipo, orden FROM arbol ORDER BY nivel, orden;
--
-- Para revertir (vuelve a colgar de la secretaría y borra la subsecretaría):
--   UPDATE public.unidad_organizacional u
--      SET parent_id = (SELECT id FROM public.unidad_organizacional WHERE codigo = 'SEC10'),
--          nivel = 2, orden = 1
--    WHERE u.codigo = 'DIR59';
--   DELETE FROM public.unidad_organizacional
--    WHERE nombre = 'Subsecretaría de Seguridad Vial y Licencia de Conducir'
--      AND NOT EXISTS (SELECT 1 FROM public.unidad_organizacional h
--                       WHERE h.parent_id = unidad_organizacional.id);

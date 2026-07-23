-- 024: Reorganización de la Secretaría de Gobierno + nueva Secretaría de
-- Ordenamiento y Convivencia (pedido 23/7/2026).
--
-- SEC02 pasa de tener 7 direcciones colgando directo a tener 2 subsecretarías:
--   * Subsec. de Seguridad Ciudadana  ← DIR30 (COMM), DIR31 (Defensa Civil)
--   * Subsec. de Gobierno             ← DIR29 (Capital Humano), DIR32 (Rel.
--                                        Institucionales), DIR33 (Empleo),
--                                        DIR34 (Deportes)
-- Nueva Secretaría de Ordenamiento y Convivencia (SEC09):
--   * DIR35 (Vía Pública) se muda desde SEC02
--   * + Dirección de Señalización y Cartelería (nueva, DIR52)
--   * + Fiscalía Ambiental Municipal (nueva, DIR53)
--
-- Los proyectos siguen colgando de cada dirección (no se tocan).
-- Reversible: _backup_unidades_reorg_sec02 guarda parent_id/nivel/orden previos.

BEGIN;

CREATE TABLE IF NOT EXISTS _backup_unidades_reorg_sec02 AS
SELECT id, codigo, parent_id, nivel, orden, now() AS respaldado_en
FROM unidad_organizacional
WHERE codigo IN ('DIR29','DIR30','DIR31','DIR32','DIR33','DIR34','DIR35');

DO $$
DECLARE
  v_sec02 uuid;
  v_seg   uuid;
  v_gob   uuid;
  v_conv  uuid;
BEGIN
  SELECT id INTO v_sec02 FROM unidad_organizacional WHERE codigo = 'SEC02';

  -- Subsecretarías nuevas bajo SEC02
  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, activa)
  VALUES (v_sec02, 'Subsecretaría de Seguridad Ciudadana', 'Seguridad Ciudadana', 'subsecretaria', 1, 1, true)
  RETURNING id INTO v_seg;

  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, activa)
  VALUES (v_sec02, 'Subsecretaría de Gobierno', 'Subsec. Gobierno', 'subsecretaria', 1, 2, true)
  RETURNING id INTO v_gob;

  -- Reparentar direcciones → Seguridad Ciudadana
  UPDATE unidad_organizacional SET parent_id = v_seg, nivel = 2, orden = 1 WHERE codigo = 'DIR30';
  UPDATE unidad_organizacional SET parent_id = v_seg, nivel = 2, orden = 2 WHERE codigo = 'DIR31';

  -- Reparentar direcciones → Subsec. de Gobierno
  UPDATE unidad_organizacional SET parent_id = v_gob, nivel = 2, orden = 1 WHERE codigo = 'DIR29';
  UPDATE unidad_organizacional SET parent_id = v_gob, nivel = 2, orden = 2 WHERE codigo = 'DIR32';
  UPDATE unidad_organizacional SET parent_id = v_gob, nivel = 2, orden = 3 WHERE codigo = 'DIR33';
  UPDATE unidad_organizacional SET parent_id = v_gob, nivel = 2, orden = 4 WHERE codigo = 'DIR34';

  -- Nueva Secretaría de Ordenamiento y Convivencia
  INSERT INTO unidad_organizacional (nombre, nombre_corto, tipo, nivel, orden, codigo, activa)
  VALUES ('Secretaría de Ordenamiento y Convivencia', 'Convivencia', 'secretaria', 0, 8, 'SEC09', true)
  RETURNING id INTO v_conv;

  -- Vía Pública se muda a Convivencia
  UPDATE unidad_organizacional SET parent_id = v_conv, nivel = 2, orden = 1 WHERE codigo = 'DIR35';

  -- Direcciones nuevas bajo Convivencia
  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, codigo, responsable_nombre, activa) VALUES
    (v_conv, 'Dirección de Señalización y Cartelería', 'Señalización', 'direccion', 2, 2, 'DIR52', 'Sr. Juan José Artigas', true),
    (v_conv, 'Fiscalía Ambiental Municipal', 'Fiscalía Ambiental', 'direccion', 2, 3, 'DIR53', NULL, true);
END $$;

COMMIT;

-- Para revertir la reorganización de direcciones:
--   update unidad_organizacional u set parent_id=b.parent_id, nivel=b.nivel, orden=b.orden
--   from _backup_unidades_reorg_sec02 b where u.id=b.id;
--   (y borrar las unidades nuevas: subsecs, SEC09, DIR52, DIR53)

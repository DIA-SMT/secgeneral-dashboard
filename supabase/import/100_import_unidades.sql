-- ============================================================
-- 100: Importacion de unidades organizacionales reales
-- ============================================================
-- Arbol jerarquico extraido del PDF del POA 2026.
-- 15 unidades: 1 secretaria + 2 subsecretarias + 12 direcciones
--
-- Nota D-06: El responsable de la Subsecretaria de Desarrollo
-- Humano no figura en el PDF. Se deja null.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_sg   uuid;
  v_sdh  uuid;
  v_sge  uuid;
BEGIN

  -- =========================
  -- NIVEL 0: Secretaria General
  -- =========================
  INSERT INTO unidad_organizacional (nombre, nombre_corto, tipo, nivel, orden, responsable_nombre)
  VALUES ('Secretaría General', 'Sec. General', 'secretaria', 0, 1, 'Dr. Rodrigo Gómez Tortosa')
  RETURNING id INTO v_sg;

  -- =========================
  -- NIVEL 1: Subsecretarias
  -- =========================

  -- D-06: responsable no identificado en el PDF, se deja null
  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, responsable_nombre)
  VALUES (v_sg, 'Subsecretaría de Desarrollo Humano', 'Desarrollo Humano', 'subsecretaria', 1, 1, NULL)
  RETURNING id INTO v_sdh;

  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, responsable_nombre)
  VALUES (v_sg, 'Subsecretaría de Gestión Estratégica y Documentación', 'Gestión Estratégica', 'subsecretaria', 1, 2, 'Mg. Humberto Ponce de León')
  RETURNING id INTO v_sge;

  -- =========================
  -- NIVEL 2: Direcciones bajo Desarrollo Humano
  -- =========================
  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden) VALUES
    (v_sdh, 'Dirección de Asistencia Pública', 'Asistencia Pública', 'direccion', 2, 1),
    (v_sdh, 'Dirección de CIM CEA', 'CIM CEA', 'direccion', 2, 2),
    (v_sdh, 'Dirección de Tartamudez', 'Tartamudez', 'direccion', 2, 3),
    (v_sdh, 'Dirección de Salud', 'Salud', 'direccion', 2, 4),
    (v_sdh, 'Dirección de Educación', 'Educación', 'direccion', 2, 5),
    (v_sdh, 'Dirección de Niñez y Juventud', 'Niñez y Juventud', 'direccion', 2, 6),
    (v_sdh, 'Dirección de Género y Diversidad', 'Género y Diversidad', 'direccion', 2, 7),
    (v_sdh, 'Dirección de Adultos Mayores', 'Adultos Mayores', 'direccion', 2, 8),
    (v_sdh, 'Dirección de Población Animal', 'Población Animal', 'direccion', 2, 9);

  -- =========================
  -- NIVEL 2: Direcciones bajo Gestion Estrategica
  -- =========================
  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden) VALUES
    (v_sge, 'Dirección de Documentación Estratégica', 'Doc. Estratégica', 'direccion', 2, 1),
    (v_sge, 'Dirección de Planificación Estratégica', 'Planificación', 'direccion', 2, 2),
    (v_sge, 'Dirección de Gerencia de Datos', 'Gerencia de Datos', 'direccion', 2, 3);

END;
$$;

COMMIT;

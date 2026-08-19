-- ============================================================
-- MIGRACION 038: Secretaría de Movilidad Urbana (pedido 18/08/2026)
-- ============================================================
-- Pedido de Juan Pablo Pinna: "les comparto el excel donde necesito que me
-- creen la Secretaria de Movilidad Urbana (pintado de rosa) así les pueda
-- asignar usuario y contraseña a cada uno".
--
-- Fuente: "poa 26 - indicadores (5).xlsx", hoja "Hoja1", filas 57 a 63 (el
-- bloque resaltado). La hoja "SMUrb" del mismo archivo está vacía: por ahora
-- entra SOLO la estructura, sin proyectos ni metas.
--
-- Estructura que arma (según cómo están combinadas las celdas de la columna
-- "nombre_subsecretaria" en la planilla):
--
--   SEC10  Secretaría de Movilidad Urbana
--   ├── Subsecretaría de Movilidad Urbana        (celdas C57:C59)
--   │   ├── DIR56  Dirección Administrativa de Tránsito
--   │   ├── DIR57  Dirección Operativa de Tránsito
--   │   └── DIR58  Dirección SUTRAPPA
--   ├── DIR59  Dirección Licencia de Conducir     (C60:C61, sin subsecretaría)
--   ├── DIR61  Centro de Monitoreo de Movilidad Urbana (C62:C63, ídem)
--   └── DIR62  Dirección de Transporte
--
-- Las tres últimas cuelgan DIRECTO de la secretaría porque en la planilla su
-- celda de subsecretaría está combinada pero vacía. El árbol ya soporta ese
-- caso (Tribunal de Faltas en la 036, Vía Pública en la 024). Si más adelante
-- aparece el nombre de esa subsecretaría, se reparentan con un UPDATE.
--
-- Todas van con nivel 2 / tipo 'direccion': `nivel >= 2` es lo que hace que la
-- unidad aparezca en el filtro de áreas, pueda cargar su POA y tenga agenda.
--
-- Sobre los códigos: son los de la planilla, que es para lo que existe la
-- columna `codigo` (ver 013). DIR56..DIR59 los había usado la 032 para los
-- programas de Ambiente y los borró la 034; la 036 había decidido no
-- reutilizarlos, pero acá pesa más que coincidan con el Excel, que es el
-- documento con el que trabajan las áreas. DIR60 sigue siendo Tribunal de
-- Faltas y no se toca: la planilla también saltea ese número en este bloque.
--
-- Los usuarios los crean ellos. Correos que trae la planilla, por si sirven
-- al darlos de alta:
--   Dirección SUTRAPPA .................. nildavaleriaamaya@gmail.com
--   Dirección Licencia de Conducir ...... dirlicenciasdeconducir@smt.gob.ar
--   Centro de Monitoreo (CEMMU) ......... Cemmu@smt.gob.ar
--   (Administrativa de Tránsito, Operativa de Tránsito y Transporte vienen
--    sin correo en el Excel)
--
-- APLICADA EN PRODUCCION EL 19/08/2026 (las 8 filas ya estan creadas). Queda
-- igual en el repo para el resto de los ambientes: es idempotente, si SEC10 ya
-- existe no hace nada.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_sec uuid;
  v_sub uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.unidad_organizacional WHERE codigo = 'SEC10') THEN
    RAISE NOTICE 'SEC10 ya existe, no se hace nada';
    RETURN;
  END IF;

  -- Secretaría (nivel 0). orden 9: va después de SEC09.
  INSERT INTO public.unidad_organizacional
    (nombre, nombre_corto, tipo, nivel, orden, codigo, activa)
  VALUES
    ('Secretaría de Movilidad Urbana', 'Secretaría de Movilidad Urbana',
     'secretaria', 0, 9, 'SEC10', true)
  RETURNING id INTO v_sec;

  -- Subsecretaría (nivel 1). Sin código, igual que el resto de las subsecretarías.
  INSERT INTO public.unidad_organizacional
    (parent_id, nombre, nombre_corto, tipo, nivel, orden, activa)
  VALUES
    (v_sec, 'Subsecretaría de Movilidad Urbana', 'Subsecretaría de Movilidad Urbana',
     'subsecretaria', 1, 0, true)
  RETURNING id INTO v_sub;

  -- Direcciones bajo la subsecretaría
  INSERT INTO public.unidad_organizacional
    (parent_id, nombre, nombre_corto, tipo, nivel, orden, codigo, responsable_nombre, activa)
  VALUES
    (v_sub, 'Dirección Administrativa de Tránsito', 'Dirección Administrativa de Tránsito',
     'direccion', 2, 1, 'DIR56', 'Eduardo Mosconi', true),
    (v_sub, 'Dirección Operativa de Tránsito', 'Dirección Operativa de Tránsito',
     'direccion', 2, 2, 'DIR57', 'Sergio Suaréz', true),
    (v_sub, 'Dirección SUTRAPPA', 'Dirección SUTRAPPA',
     'direccion', 2, 3, 'DIR58', 'Valeria Amaya', true);

  -- Direcciones que cuelgan directo de la secretaría
  INSERT INTO public.unidad_organizacional
    (parent_id, nombre, nombre_corto, tipo, nivel, orden, codigo, responsable_nombre, activa)
  VALUES
    (v_sec, 'Dirección Licencia de Conducir', 'Dirección Licencia de Conducir',
     'direccion', 2, 1, 'DIR59', 'Viviana Tirone', true),
    (v_sec, 'Dirección Centro de Monitoreo de Movilidad Urbana', 'CEMMU',
     'direccion', 2, 2, 'DIR61', 'Mariela Cortez', true),
    (v_sec, 'Dirección de Transporte', 'Dirección de Transporte',
     'direccion', 2, 3, 'DIR62', 'Máximo Stenvers', true);
END $$;

COMMIT;

-- Verificación (debe dar 7 filas: la secretaría, la subsecretaría y 6 direcciones):
--   WITH RECURSIVE arbol AS (
--     SELECT id, parent_id, nombre, codigo, tipo, nivel, orden
--       FROM public.unidad_organizacional WHERE codigo = 'SEC10'
--     UNION ALL
--     SELECT u.id, u.parent_id, u.nombre, u.codigo, u.tipo, u.nivel, u.orden
--       FROM public.unidad_organizacional u JOIN arbol a ON u.parent_id = a.id
--   )
--   SELECT nivel, codigo, nombre, tipo, orden FROM arbol ORDER BY nivel, orden;
--
-- Para revertir (solo si todavía no se le cargó nada):
--   DELETE FROM public.unidad_organizacional u
--    WHERE u.codigo IN ('DIR56','DIR57','DIR58','DIR59','DIR61','DIR62')
--      AND NOT EXISTS (SELECT 1 FROM public.proyecto p        WHERE p.unidad_id  = u.id)
--      AND NOT EXISTS (SELECT 1 FROM public.agenda_semana a   WHERE a.unidad_id  = u.id)
--      AND NOT EXISTS (SELECT 1 FROM public.perfil_usuario pu WHERE pu.unidad_id = u.id);
--   DELETE FROM public.unidad_organizacional
--    WHERE nombre = 'Subsecretaría de Movilidad Urbana' AND nivel = 1
--      AND NOT EXISTS (SELECT 1 FROM public.unidad_organizacional h
--                       WHERE h.parent_id = unidad_organizacional.id);
--   DELETE FROM public.unidad_organizacional
--    WHERE codigo = 'SEC10'
--      AND NOT EXISTS (SELECT 1 FROM public.unidad_organizacional h
--                       WHERE h.parent_id = unidad_organizacional.id);

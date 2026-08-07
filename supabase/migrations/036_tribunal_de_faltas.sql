-- ============================================================
-- MIGRACION 036: Tribunal de Faltas (correcciones 06/08/2026)
-- ============================================================
-- Pedido: "Por favor agregar al Tribunal de Faltas dentro de la Secretaría de
-- Gobierno".
--
-- Cuelga DIRECTO de SEC02, sin subsecretaría en el medio: el Tribunal no
-- depende de Seguridad Ciudadana ni de la Subsec. de Gobierno. El árbol ya
-- soporta ese caso (la 024 dejó a DIR35 colgando directo de SEC09) y el panel
-- contempla explícitamente "las direcciones que cuelgan directo de una
-- secretaría".
--
-- Va con nivel 2 / tipo 'direccion' aunque no sea una dirección en sentido
-- estricto: `nivel >= 2` es lo que hace que una unidad aparezca en el filtro de
-- áreas, pueda cargar su POA y tenga agenda propia. `tipo` es solo la etiqueta
-- que se ve en /estructura.
--
-- Código DIR60: los DIR55..DIR59 los usó la 032 (programas de Ambiente) y los
-- borró la 034, pero solo si habían quedado vacíos. No se reutilizan.
--
-- Idempotente: si ya existe, no hace nada.
-- ============================================================

BEGIN;

INSERT INTO public.unidad_organizacional
  (parent_id, nombre, nombre_corto, tipo, nivel, orden, codigo, activa)
SELECT s.id, 'Tribunal de Faltas', 'Tribunal de Faltas', 'direccion', 2, 3, 'DIR60', true
  FROM public.unidad_organizacional s
 WHERE s.codigo = 'SEC02'
   AND NOT EXISTS (
     SELECT 1 FROM public.unidad_organizacional u WHERE u.codigo = 'DIR60'
   );

COMMIT;

-- Verificación (debe dar 1 fila, con parent = Secretaría de Gobierno):
--   SELECT u.codigo, u.nombre, u.nivel, p.nombre AS parent
--     FROM public.unidad_organizacional u
--     JOIN public.unidad_organizacional p ON p.id = u.parent_id
--    WHERE u.codigo = 'DIR60';
--
-- Para revertir (solo si no se le cargó nada):
--   DELETE FROM public.unidad_organizacional u
--    WHERE u.codigo = 'DIR60'
--      AND NOT EXISTS (SELECT 1 FROM public.proyecto p        WHERE p.unidad_id  = u.id)
--      AND NOT EXISTS (SELECT 1 FROM public.agenda_semana a   WHERE a.unidad_id  = u.id)
--      AND NOT EXISTS (SELECT 1 FROM public.perfil_usuario pu WHERE pu.unidad_id = u.id);

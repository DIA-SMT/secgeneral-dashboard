-- ============================================================
-- MIGRACION 040: Dirección de Crédito Público (pedido 19/08/2026)
-- ============================================================
-- Fuente: "poa 26 - indicadores (6).xlsx", hoja "Hoja1", fila 42 (la que está
-- resaltada en naranja). Pertenece a la Secretaría de Ingresos Municipales.
--
-- Cuelga DIRECTO de SEC04: en la planilla las filas 39 a 42 comparten la celda
-- de subsecretaría (C39:C42) y está vacía, igual que el resto de las
-- direcciones de esa secretaría, que ya cuelgan directo.
--
--   SEC04  Secretaría de Ingresos Municipales
--   ├── DIR38  Direccion de Ingresos Municipales
--   ├── DIR39  Dirección de Informatica Tributaria
--   ├── DIR40  Dirección de Politica Fiscal
--   └── DIR63  Dirección de Crédito Público          ← esta
--
-- Código DIR63: la planilla no le asigna uno (la columna id_direccion está
-- vacía en todo el bloque de SEC04), así que sigue la numeración del sistema,
-- después de DIR62. No se reutilizan DIR54/DIR55, que quedaron libres al
-- borrarse los programas de Ambiente (032 → 034).
--
-- Correo del responsable, por si dan de alta el usuario:
--   Dirección de Crédito Público ... jorgefabianmartinez36@gmail.com
--
-- ------------------------------------------------------------
-- SEGUNDA PARTE: el responsable de DIR38 estaba cruzado
-- ------------------------------------------------------------
-- La carga original le puso a "Direccion de Ingresos Municipales" el
-- responsable de Crédito Público (C.P.N. Fabián Martínez). En la planilla esa
-- dirección es de C.P.N. Julio Cesar Mazzioti — sin esta corrección, las dos
-- direcciones quedarían con el mismo responsable.
--
-- Idempotente: si DIR63 ya existe, no crea nada. El UPDATE de DIR38 solo pisa
-- el valor viejo, así que se puede correr de nuevo sin problema.
-- ============================================================

BEGIN;

INSERT INTO public.unidad_organizacional
  (parent_id, nombre, nombre_corto, tipo, nivel, orden, codigo, responsable_nombre, activa)
SELECT s.id, 'Dirección de Crédito Público', 'Dirección de Crédito Público',
       'direccion', 2, 40, 'DIR63', 'C.P.N. Fabián Martínez', true
  FROM public.unidad_organizacional s
 WHERE s.codigo = 'SEC04'
   AND NOT EXISTS (
     SELECT 1 FROM public.unidad_organizacional u WHERE u.codigo = 'DIR63'
   );

-- Ingresos Municipales: responsable según la planilla.
UPDATE public.unidad_organizacional
   SET responsable_nombre = 'C.P.N. Julio Cesar Mazzioti'
 WHERE codigo = 'DIR38'
   AND responsable_nombre IS DISTINCT FROM 'C.P.N. Julio Cesar Mazzioti';

COMMIT;

-- Verificación (las cuatro direcciones de Ingresos Municipales, con su responsable):
--   SELECT u.codigo, u.nombre, u.responsable_nombre, u.orden
--     FROM public.unidad_organizacional u
--     JOIN public.unidad_organizacional s ON s.id = u.parent_id
--    WHERE s.codigo = 'SEC04'
--    ORDER BY u.orden;
--
-- Para revertir:
--   DELETE FROM public.unidad_organizacional u
--    WHERE u.codigo = 'DIR63'
--      AND NOT EXISTS (SELECT 1 FROM public.proyecto p        WHERE p.unidad_id  = u.id)
--      AND NOT EXISTS (SELECT 1 FROM public.agenda_semana a   WHERE a.unidad_id  = u.id)
--      AND NOT EXISTS (SELECT 1 FROM public.perfil_usuario pu WHERE pu.unidad_id = u.id);
--   UPDATE public.unidad_organizacional
--      SET responsable_nombre = 'C.P.N. Fabián Martínez' WHERE codigo = 'DIR38';

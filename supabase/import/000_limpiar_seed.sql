-- ============================================================
-- 000: Limpieza del seed de prueba
-- ============================================================
-- Elimina todos los datos de prueba para reemplazarlos con
-- la importacion real del POA 2026.
-- Orden inverso a las FK para evitar violaciones.
-- ============================================================

BEGIN;

DELETE FROM avance;
DELETE FROM hito;
DELETE FROM meta;
DELETE FROM proyecto;
DELETE FROM periodo;
DELETE FROM unidad_organizacional;

COMMIT;

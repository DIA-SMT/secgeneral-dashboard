-- ============================================================
-- MIGRACION 026: Corregir nombre_corto de subsecretarías de Gobierno
-- ============================================================
-- Pedido 28/07/2026 (Juan Pablo): en pantalla se muestra el nombre_corto,
-- que había quedado abreviado por un error de transcripción. Debe mostrarse
-- el nombre completo de la subsecretaría.
--   * "Seguridad Ciudadana" -> "Subsecretaría de Seguridad Ciudadana"
--   * "Subsec. Gobierno"     -> "Subsecretaría de Gobierno"
-- El campo `nombre` ya era correcto; solo se ajusta `nombre_corto`.
-- ============================================================

UPDATE public.unidad_organizacional
  SET nombre_corto = 'Subsecretaría de Seguridad Ciudadana'
  WHERE nombre = 'Subsecretaría de Seguridad Ciudadana'
    AND tipo = 'subsecretaria';

UPDATE public.unidad_organizacional
  SET nombre_corto = 'Subsecretaría de Gobierno'
  WHERE nombre = 'Subsecretaría de Gobierno'
    AND tipo = 'subsecretaria';

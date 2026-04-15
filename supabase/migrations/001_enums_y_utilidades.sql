-- ============================================================
-- MIGRACION 001: Enums del dominio y funciones utilitarias
-- ============================================================
-- Crea todos los tipos enumerados del sistema y la funcion
-- compartida para auto-actualizar updated_at.
-- ============================================================

-- -------------------------------------------------------
-- CAPA A: Estructura Organizacional
-- -------------------------------------------------------

CREATE TYPE tipo_unidad AS ENUM (
  'secretaria',
  'subsecretaria',
  'direccion',
  'departamento',
  'coordinacion',
  'otro'
);

-- -------------------------------------------------------
-- CAPA B: Planificacion Base
-- -------------------------------------------------------

CREATE TYPE estado_proyecto AS ENUM (
  'borrador',
  'activo',
  'pausado',
  'completado',
  'cancelado'
);

CREATE TYPE tipo_medicion AS ENUM (
  'cuantitativo',
  'cualitativo',
  'hito_unico'
);

CREATE TYPE frecuencia_medicion AS ENUM (
  'mensual',
  'bimestral',
  'trimestral',
  'semestral',
  'anual',
  'puntual'
);

-- -------------------------------------------------------
-- CAPA C: Seguimiento
-- -------------------------------------------------------

-- Semaforo como dato DERIVADO. No lo carga el usuario.
-- Se calcula a partir de avance + fecha + umbrales.
-- Puede materializarse en meta.estado_semaforo para lectura
-- rapida, pero la fuente de verdad es siempre el calculo.
CREATE TYPE estado_semaforo AS ENUM (
  'verde',
  'amarillo',
  'rojo',
  'gris',
  'sin_datos'
);

CREATE TYPE fuente_avance AS ENUM (
  'manual',
  'importacion',
  'chatbot',
  'audio'
);

-- -------------------------------------------------------
-- FUNCION UTILITARIA: auto-updated_at
-- -------------------------------------------------------
-- Se asigna como trigger BEFORE UPDATE en toda tabla mutable.
-- Las tablas append-only (avance) NO usan este trigger.

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

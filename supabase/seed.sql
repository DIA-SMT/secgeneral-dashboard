-- ============================================================
-- SEED: Datos iniciales representativos del MVP
-- Dashboard Ejecutivo - Secretaria General - SMT
-- ============================================================
--
-- ESTRATEGIA DE SEED
--
-- Este archivo puebla la base con una muestra reducida pero
-- estrategicamente disenada para validar:
--
--   1. Arbol organizacional de 3 niveles (10 unidades)
--   2. 1 periodo activo (POA 2026)
--   3. 10 proyectos en distintos estados y niveles de avance
--   4. 24 metas: cuantitativas, cualitativas y hito_unico
--   5. 16 hitos: completados, proximos, vencidos
--   6. ~50 avances con fechas y valores coherentes
--   7. Campos materializados actualizados para consistencia
--
-- Casos de prueba cubiertos:
--   - Proyecto verde (>80% esperado)
--   - Proyecto amarillo (50-79%)
--   - Proyecto rojo (<50% o vencido)
--   - Proyecto gris (sin avances)
--   - Proyecto en borrador (sin datos)
--   - Hito completado, proximo, y vencido
--   - Meta cuantitativa, cualitativa, y hito_unico
--   - Metrica invertida (menor es mejor)
--   - Avances de distintas fuentes
--   - Area con y sin actualizacion reciente
--
-- Fecha de referencia: 13 de abril de 2026
-- ============================================================

BEGIN;

-- ============================================================
-- SECCION 1: ESTRUCTURA ORGANIZACIONAL
-- ============================================================
-- Arbol:
--   Secretaria General (nivel 0)
--     ├── Subsec. Gestion Estrategica (nivel 1)
--     │     ├── Dir. Planificacion y Seguimiento (nivel 2)
--     │     └── Dir. Innovacion y Gobierno Abierto (nivel 2)
--     ├── Subsec. Coordinacion Administrativa (nivel 1)
--     │     ├── Dir. Despacho y Mesa de Entradas (nivel 2)
--     │     └── Dir. Recursos Humanos (nivel 2)
--     └── Subsec. Relaciones Institucionales (nivel 1)
--           ├── Dir. Ceremonial y Protocolo (nivel 2)
--           └── Dir. Relaciones con la Comunidad (nivel 2)

DO $$
DECLARE
  -- Unidades organizacionales
  u_sg    uuid;  -- Secretaria General
  u_sge   uuid;  -- Subsec. Gestion Estrategica
  u_sca   uuid;  -- Subsec. Coordinacion Administrativa
  u_sri   uuid;  -- Subsec. Relaciones Institucionales
  u_dps   uuid;  -- Dir. Planificacion y Seguimiento
  u_diga  uuid;  -- Dir. Innovacion y Gobierno Abierto
  u_dme   uuid;  -- Dir. Despacho y Mesa de Entradas
  u_drh   uuid;  -- Dir. Recursos Humanos
  u_dcp   uuid;  -- Dir. Ceremonial y Protocolo
  u_drc   uuid;  -- Dir. Relaciones con la Comunidad

  -- Periodo
  v_periodo uuid;

  -- Proyectos
  py01 uuid; py02 uuid; py03 uuid; py04 uuid; py05 uuid;
  py06 uuid; py07 uuid; py08 uuid; py09 uuid; py10 uuid;

  -- Metas
  m01 uuid; m02 uuid; m03 uuid; m04 uuid; m05 uuid;
  m06 uuid; m07 uuid; m08 uuid; m09 uuid; m10 uuid;
  m11 uuid; m12 uuid; m13 uuid; m14 uuid; m15 uuid;
  m16 uuid; m17 uuid; m18 uuid; m19 uuid; m20 uuid;
  m21 uuid; m22 uuid; m23 uuid; m24 uuid;

  -- Hitos
  h01 uuid; h02 uuid; h03 uuid; h04 uuid; h05 uuid;
  h06 uuid; h07 uuid; h08 uuid; h09 uuid; h10 uuid;
  h11 uuid; h12 uuid; h13 uuid; h14 uuid; h15 uuid;
  h16 uuid;

  -- Escalas cualitativas reutilizables
  escala_implementacion jsonb := '{
    "niveles": [
      {"clave": "no_iniciado",      "label": "No iniciado",      "valor_numerico": 0},
      {"clave": "en_diseno",        "label": "En diseño",        "valor_numerico": 25},
      {"clave": "en_implementacion","label": "En implementación", "valor_numerico": 50},
      {"clave": "implementado",     "label": "Implementado",     "valor_numerico": 75},
      {"clave": "consolidado",      "label": "Consolidado",      "valor_numerico": 100}
    ]
  }'::jsonb;

  escala_satisfaccion jsonb := '{
    "niveles": [
      {"clave": "insatisfactorio", "label": "Insatisfactorio", "valor_numerico": 0},
      {"clave": "en_proceso",      "label": "En proceso",      "valor_numerico": 33},
      {"clave": "satisfactorio",   "label": "Satisfactorio",   "valor_numerico": 66},
      {"clave": "destacado",       "label": "Destacado",       "valor_numerico": 100}
    ]
  }'::jsonb;

BEGIN

  -- ===========================================================
  -- 1.1 Nivel 0: Raiz
  -- ===========================================================
  INSERT INTO unidad_organizacional (nombre, nombre_corto, tipo, nivel, orden, responsable_nombre)
  VALUES ('Secretaría General', 'Sec. General', 'secretaria', 0, 1, 'Dr. Carlos Montoya')
  RETURNING id INTO u_sg;

  -- ===========================================================
  -- 1.2 Nivel 1: Subsecretarias
  -- ===========================================================
  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, responsable_nombre)
  VALUES (u_sg, 'Subsecretaría de Gestión Estratégica', 'Gestión Estratégica', 'subsecretaria', 1, 1, 'Lic. María Fernández')
  RETURNING id INTO u_sge;

  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, responsable_nombre)
  VALUES (u_sg, 'Subsecretaría de Coordinación Administrativa', 'Coord. Administrativa', 'subsecretaria', 1, 2, 'Cr. Roberto Díaz')
  RETURNING id INTO u_sca;

  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, responsable_nombre)
  VALUES (u_sg, 'Subsecretaría de Relaciones Institucionales', 'Rel. Institucionales', 'subsecretaria', 1, 3, 'Dra. Laura Gutiérrez')
  RETURNING id INTO u_sri;

  -- ===========================================================
  -- 1.3 Nivel 2: Direcciones
  -- ===========================================================
  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, responsable_nombre)
  VALUES (u_sge, 'Dirección de Planificación y Seguimiento', 'Planificación', 'direccion', 2, 1, 'Lic. Ana Torres')
  RETURNING id INTO u_dps;

  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, responsable_nombre)
  VALUES (u_sge, 'Dirección de Innovación y Gobierno Abierto', 'Innovación', 'direccion', 2, 2, 'Ing. Pablo Ruiz')
  RETURNING id INTO u_diga;

  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, responsable_nombre)
  VALUES (u_sca, 'Dirección de Despacho y Mesa de Entradas', 'Despacho', 'direccion', 2, 1, 'Abog. Silvia Paz')
  RETURNING id INTO u_dme;

  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, responsable_nombre)
  VALUES (u_sca, 'Dirección de Recursos Humanos', 'RRHH', 'direccion', 2, 2, 'Lic. Jorge Mendoza')
  RETURNING id INTO u_drh;

  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, responsable_nombre)
  VALUES (u_sri, 'Dirección de Ceremonial y Protocolo', 'Ceremonial', 'direccion', 2, 1, 'Prof. Claudia Vega')
  RETURNING id INTO u_dcp;

  INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, responsable_nombre)
  VALUES (u_sri, 'Dirección de Relaciones con la Comunidad', 'Rel. Comunidad', 'direccion', 2, 2, 'Lic. Martín Herrera')
  RETURNING id INTO u_drc;


  -- ===========================================================
  -- SECCION 2: PERIODO
  -- ===========================================================
  INSERT INTO periodo (anio, nombre, fecha_inicio, fecha_fin, activo, configuracion)
  VALUES (
    2026,
    'Plan Operativo Anual 2026',
    '2026-01-01',
    '2026-12-31',
    true,
    '{
      "umbrales_semaforo": {
        "verde_min": 80,
        "amarillo_min": 50,
        "dias_sin_actualizar_alerta": 15
      }
    }'::jsonb
  )
  RETURNING id INTO v_periodo;


  -- ===========================================================
  -- SECCION 3: PROYECTOS
  -- ===========================================================
  -- 10 proyectos distribuidos entre unidades, con distintos
  -- estados y niveles de avance esperados.
  --
  --   PY01: Dashboard Ejecutivo         → Dir. Planificacion  → VERDE
  --   PY02: Plan de Capacitacion        → Dir. RRHH           → AMARILLO
  --   PY03: Digitalizacion Mesa         → Dir. Despacho       → ROJO
  --   PY04: Gobierno Abierto            → Dir. Innovacion     → AMARILLO
  --   PY05: Modernizacion Ceremonial    → Dir. Ceremonial     → VERDE
  --   PY06: Vinculo Comunitario         → Dir. Rel. Comunidad → GRIS (sin avances)
  --   PY07: Optimizacion Procesos       → Subsec. Coord Admin → AMARILLO
  --   PY08: Atencion al Vecino          → Subsec. Rel. Inst.  → VERDE
  --   PY09: Relevamiento Normativo      → Dir. Despacho       → SIN_DATOS (borrador)
  --   PY10: Comunicacion Institucional  → Subsec. Gest. Estr. → ROJO

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, u_dps, 'PY-GE-001', 'Dashboard de Gestión Ejecutiva',
    'Diseño e implementación de una plataforma web de seguimiento del POA',
    'Proveer al Secretario General una herramienta de visualización ejecutiva del estado de la planificación',
    '2026-01-15', '2026-06-30', 'activo', 1)
  RETURNING id INTO py01;

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, u_drh, 'PY-CA-001', 'Plan de Capacitación Municipal 2026',
    'Programa integral de formación para agentes municipales en competencias de gestión',
    'Capacitar al 80% de los agentes de la Secretaría General en herramientas de gestión moderna',
    '2026-01-01', '2026-11-30', 'activo', 2)
  RETURNING id INTO py02;

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, u_dme, 'PY-DA-001', 'Digitalización de Mesa de Entradas',
    'Implementación del sistema GDE y digitalización de expedientes en papel',
    'Eliminar el 100% de los expedientes en papel y reducir el tiempo de tramitación a 5 días',
    '2026-01-01', '2026-09-30', 'activo', 3)
  RETURNING id INTO py03;

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, u_diga, 'PY-IN-001', 'Programa de Gobierno Abierto',
    'Publicación de datos abiertos y fortalecimiento de la transparencia activa',
    'Alcanzar 25 datasets publicados y nivel satisfactorio de transparencia activa',
    '2026-02-01', '2026-12-31', 'activo', 4)
  RETURNING id INTO py04;

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, u_dcp, 'PY-CP-001', 'Modernización del Ceremonial Institucional',
    'Actualización de protocolos y digitalización del manual de ceremonial',
    'Actualizar el 100% de los protocolos y producir un manual digital accesible',
    '2026-01-15', '2026-07-31', 'activo', 5)
  RETURNING id INTO py05;

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, u_drc, 'PY-RC-001', 'Fortalecimiento del Vínculo Comunitario',
    'Programa de encuentros barriales y relevamiento de necesidades ciudadanas',
    'Realizar 48 encuentros barriales y alcanzar nivel de satisfacción comunitaria destacado',
    '2026-03-01', '2026-12-31', 'activo', 6)
  RETURNING id INTO py06;

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, u_sca, 'PY-CA-002', 'Optimización de Procesos Administrativos',
    'Relevamiento, documentación y automatización de procesos clave de la Secretaría',
    'Relevar y documentar 30 procesos, automatizar los 10 más críticos',
    '2026-02-01', '2026-10-31', 'activo', 7)
  RETURNING id INTO py07;

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, u_sri, 'PY-RI-001', 'Sistema de Atención al Vecino',
    'Centro multicanal de atención ciudadana con seguimiento de consultas',
    'Atender 500 consultas mensuales con tiempo de respuesta menor a 24 horas',
    '2026-01-01', '2026-12-31', 'activo', 8)
  RETURNING id INTO py08;

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, u_dme, 'PY-DA-002', 'Relevamiento y Actualización Normativa',
    'Compilación y actualización del cuerpo normativo vigente de la Secretaría',
    'Relevar 200 normas vigentes y proponer actualizaciones al 30% del corpus',
    '2026-05-01', '2026-12-31', 'borrador', 9)
  RETURNING id INTO py09;

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, u_sge, 'PY-GE-002', 'Plan de Comunicación Institucional',
    'Estrategia de comunicación digital y presencia en redes sociales',
    'Triplicar el alcance en redes y establecer una identidad comunicacional coherente',
    '2026-01-01', '2026-12-31', 'activo', 10)
  RETURNING id INTO py10;


  -- ===========================================================
  -- SECCION 4: METAS
  -- ===========================================================

  -- ----- PY01: Dashboard de Gestión Ejecutiva (VERDE) -----

  INSERT INTO meta (proyecto_id, codigo, nombre, descripcion, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, medio_verificacion, fecha_limite, peso, orden)
  VALUES (py01, 'M-GE-001', 'Avance de implementación de la plataforma',
    'Porcentaje de funcionalidades desarrolladas e integradas',
    'cuantitativo', '%', 0, 100, 'mensual', 'Repositorio y deploy en Vercel', '2026-06-30', 50, 1)
  RETURNING id INTO m01;

  INSERT INTO meta (proyecto_id, codigo, nombre, descripcion, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, medio_verificacion, fecha_limite, peso, orden)
  VALUES (py01, 'M-GE-002', 'Usuarios internos capacitados en la plataforma',
    'Cantidad de usuarios de Gestión Estratégica capacitados para operar el dashboard',
    'cuantitativo', 'personas', 0, 15, 'mensual', 'Registro de asistencia', '2026-07-31', 25, 2)
  RETURNING id INTO m02;

  INSERT INTO meta (proyecto_id, codigo, nombre, descripcion, tipo_medicion, escala_cualitativa, frecuencia_medicion, medio_verificacion, fecha_limite, peso, orden)
  VALUES (py01, 'M-GE-003', 'Calidad de la visualización ejecutiva',
    'Nivel de madurez de la interfaz de visualización para el Secretario',
    'cualitativo', escala_implementacion, 'mensual', 'Revisión con Secretario General', '2026-06-30', 25, 3)
  RETURNING id INTO m03;

  -- ----- PY02: Plan de Capacitación (AMARILLO) -----

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py02, 'M-CA-001', 'Agentes municipales capacitados',
    'cuantitativo', 'personas', 0, 500, 'mensual', '2026-11-30', 40, 1)
  RETURNING id INTO m04;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py02, 'M-CA-002', 'Cursos dictados',
    'cuantitativo', 'cursos', 0, 24, 'mensual', '2026-11-30', 30, 2)
  RETURNING id INTO m05;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, escala_cualitativa, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py02, 'M-CA-003', 'Satisfacción de los participantes',
    'cualitativo', escala_satisfaccion, 'trimestral', '2026-11-30', 30, 3)
  RETURNING id INTO m06;

  -- ----- PY03: Digitalización Mesa de Entradas (ROJO) -----

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py03, 'M-DA-001', 'Expedientes digitalizados',
    'cuantitativo', 'expedientes', 0, 5000, 'mensual', '2026-09-30', 40, 1)
  RETURNING id INTO m07;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, escala_cualitativa, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py03, 'M-DA-002', 'Implementación del sistema GDE',
    'cualitativo', escala_implementacion, 'mensual', '2026-06-30', 35, 2)
  RETURNING id INTO m08;

  -- Metrica invertida: menor es mejor (15 dias → 5 dias)
  INSERT INTO meta (proyecto_id, codigo, nombre, descripcion, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, peso, orden,
    metadata)
  VALUES (py03, 'M-DA-003', 'Tiempo promedio de tramitación',
    'Días promedio desde ingreso hasta resolución de expediente. Menor es mejor.',
    'cuantitativo', 'días', 15, 5, 'mensual', '2026-09-30', 25, 3,
    '{"invertida": true}'::jsonb)
  RETURNING id INTO m09;

  -- ----- PY04: Gobierno Abierto (AMARILLO) -----

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py04, 'M-IN-001', 'Datasets publicados en portal de datos abiertos',
    'cuantitativo', 'datasets', 3, 25, 'mensual', '2026-12-31', 50, 1)
  RETURNING id INTO m10;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, escala_cualitativa, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py04, 'M-IN-002', 'Nivel de transparencia activa',
    'cualitativo', escala_implementacion, 'trimestral', '2026-12-31', 50, 2)
  RETURNING id INTO m11;

  -- ----- PY05: Modernización Ceremonial (VERDE) -----

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py05, 'M-CP-001', 'Protocolos actualizados',
    'cuantitativo', '%', 0, 100, 'mensual', '2026-07-31', 60, 1)
  RETURNING id INTO m12;

  INSERT INTO meta (proyecto_id, codigo, nombre, descripcion, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, fecha_limite, peso, orden)
  VALUES (py05, 'M-CP-002', 'Manual de protocolo digital publicado',
    'Publicación oficial del manual digital de ceremonial y protocolo',
    'hito_unico', 'unidad', 0, 1, '2026-05-31', 40, 2)
  RETURNING id INTO m13;

  -- ----- PY06: Vínculo Comunitario (GRIS - sin avances) -----

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py06, 'M-RC-001', 'Encuentros barriales realizados',
    'cuantitativo', 'encuentros', 0, 48, 'mensual', '2026-12-31', 50, 1)
  RETURNING id INTO m14;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, escala_cualitativa, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py06, 'M-RC-002', 'Nivel de satisfacción comunitaria',
    'cualitativo', escala_satisfaccion, 'trimestral', '2026-12-31', 50, 2)
  RETURNING id INTO m15;

  -- ----- PY07: Optimización Procesos (AMARILLO) -----

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py07, 'M-CA-004', 'Procesos relevados y documentados',
    'cuantitativo', 'procesos', 0, 30, 'mensual', '2026-10-31', 50, 1)
  RETURNING id INTO m16;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, escala_cualitativa, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py07, 'M-CA-005', 'Nivel de automatización de procesos críticos',
    'cualitativo', escala_implementacion, 'trimestral', '2026-10-31', 50, 2)
  RETURNING id INTO m17;

  -- ----- PY08: Atención al Vecino (VERDE) -----

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py08, 'M-RI-001', 'Consultas atendidas por mes',
    'cuantitativo', 'consultas/mes', 200, 500, 'mensual', '2026-12-31', 35, 1)
  RETURNING id INTO m18;

  INSERT INTO meta (proyecto_id, codigo, nombre, descripcion, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, peso, orden,
    metadata)
  VALUES (py08, 'M-RI-002', 'Tiempo de respuesta promedio',
    'Horas promedio desde recepción de consulta hasta primera respuesta. Menor es mejor.',
    'cuantitativo', 'horas', 72, 24, 'mensual', '2026-12-31', 35, 2,
    '{"invertida": true}'::jsonb)
  RETURNING id INTO m19;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, escala_cualitativa, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py08, 'M-RI-003', 'Satisfacción del vecino',
    'cualitativo', escala_satisfaccion, 'trimestral', '2026-12-31', 30, 3)
  RETURNING id INTO m20;

  -- ----- PY09: Relevamiento Normativo (BORRADOR - sin metas activas) -----

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden)
  VALUES (py09, 'M-DA-004', 'Normas vigentes relevadas',
    'cuantitativo', 'normas', 0, 200, 'mensual', '2026-12-31', 1)
  RETURNING id INTO m21;

  -- ----- PY10: Comunicación Institucional (ROJO) -----

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py10, 'M-GE-004', 'Publicaciones institucionales realizadas',
    'cuantitativo', 'publicaciones', 0, 120, 'mensual', '2026-12-31', 30, 1)
  RETURNING id INTO m22;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py10, 'M-GE-005', 'Alcance en redes sociales',
    'cuantitativo', 'seguidores', 5000, 15000, 'mensual', '2026-12-31', 30, 2)
  RETURNING id INTO m23;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, escala_cualitativa, frecuencia_medicion, fecha_limite, peso, orden)
  VALUES (py10, 'M-GE-006', 'Estrategia de comunicación digital definida',
    'cualitativo', escala_implementacion, 'trimestral', '2026-06-30', 40, 3)
  RETURNING id INTO m24;


  -- ===========================================================
  -- SECCION 5: HITOS
  -- ===========================================================

  -- ----- PY01: Dashboard -----
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden, completado, fecha_completado)
  VALUES (py01, 'Definición de arquitectura técnica', '2026-02-15', true, 1, true, '2026-02-14')
  RETURNING id INTO h01;

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden, completado, fecha_completado)
  VALUES (py01, 'Prototipo funcional validado', '2026-03-31', true, 2, true, '2026-03-20')
  RETURNING id INTO h02;

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden)
  VALUES (py01, 'Lanzamiento beta con datos reales', '2026-04-30', true, 3)
  RETURNING id INTO h03;

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden)
  VALUES (py01, 'Deploy en producción', '2026-06-15', true, 4)
  RETURNING id INTO h04;

  -- ----- PY02: Capacitación -----
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden, completado, fecha_completado)
  VALUES (py02, 'Convenio marco con universidades firmado', '2026-02-15', true, 1, true, '2026-01-30')
  RETURNING id INTO h05;

  -- VENCIDO y NO completado → caso de prueba "hito atrasado"
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden)
  VALUES (py02, 'Primer ciclo de cursos finalizado', '2026-04-15', true, 2)
  RETURNING id INTO h06;

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden)
  VALUES (py02, 'Segundo ciclo de cursos finalizado', '2026-08-30', 3)
  RETURNING id INTO h07;

  -- ----- PY03: Digitalización -----
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden, completado, fecha_completado)
  VALUES (py03, 'Licitación del sistema GDE adjudicada', '2026-02-28', true, 1, true, '2026-02-28')
  RETURNING id INTO h08;

  -- VENCIDO y NO completado → caso de prueba "hito atrasado critico"
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden)
  VALUES (py03, 'Sistema GDE instalado y configurado', '2026-03-31', true, 2)
  RETURNING id INTO h09;

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden)
  VALUES (py03, 'Migración de datos históricos completada', '2026-06-30', 3)
  RETURNING id INTO h10;

  -- ----- PY05: Ceremonial -----
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden, completado, fecha_completado)
  VALUES (py05, 'Manual digital de protocolo aprobado', '2026-03-31', true, 1, true, '2026-03-10')
  RETURNING id INTO h11;

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden)
  VALUES (py05, 'Capacitación del equipo de ceremonial completada', '2026-05-15', 2)
  RETURNING id INTO h12;

  -- ----- PY08: Atención al Vecino -----
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden, completado, fecha_completado)
  VALUES (py08, 'Centro de atención presencial operativo', '2026-01-31', true, 1, true, '2026-01-15')
  RETURNING id INTO h13;

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden)
  VALUES (py08, 'Integración multicanal (tel + web + presencial)', '2026-05-01', true, 2)
  RETURNING id INTO h14;

  -- ----- PY10: Comunicación -----
  -- VENCIDO y NO completado
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden)
  VALUES (py10, 'Plan de medios aprobado por Secretario', '2026-02-28', true, 1)
  RETURNING id INTO h15;

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden)
  VALUES (py10, 'Rediseño de perfiles en redes sociales', '2026-05-30', 2)
  RETURNING id INTO h16;


  -- ===========================================================
  -- SECCION 6: AVANCES
  -- ===========================================================
  -- Cada INSERT simula un reporte de avance en una fecha
  -- consistente. Los avances van de enero a abril 2026.
  -- No hay created_by (no hay usuarios auth en seed).

  -- -------------------------------------------------------
  -- PY01 - Dashboard (VERDE)
  -- -------------------------------------------------------
  -- M01: Avance de implementación 0→85%
  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_numerico, observacion)
  VALUES
    (py01, m01, '2026-01-31', 'manual', 15, 'Relevamiento de requerimientos completado'),
    (py01, m01, '2026-02-28', 'manual', 35, 'Modelo de datos definido y primera migración aplicada'),
    (py01, m01, '2026-03-15', 'manual', 55, 'Frontend scaffolding con Next.js y componentes base'),
    (py01, m01, '2026-03-31', 'manual', 70, 'Integración con Supabase y datos de prueba'),
    (py01, m01, '2026-04-10', 'manual', 85, 'Panel ejecutivo funcional con semáforos y drill-down');

  -- M02: Usuarios capacitados 0→12
  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_numerico, observacion)
  VALUES
    (py01, m02, '2026-03-15', 'manual', 5, 'Primera ronda de capacitación a equipo Gestión Estratégica'),
    (py01, m02, '2026-04-05', 'manual', 12, 'Segunda ronda incluyendo directores');

  -- M03: Calidad visualización (cualitativa)
  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_cualitativo, observacion)
  VALUES
    (py01, m03, '2026-02-15', 'manual', 'en_diseno', 'Wireframes aprobados por el Secretario'),
    (py01, m03, '2026-03-20', 'manual', 'en_implementacion', 'Primeros componentes visuales implementados'),
    (py01, m03, '2026-04-08', 'manual', 'implementado', 'Dashboard con datos reales. Pendiente pulir modo TV');

  -- Avances de hitos completados
  INSERT INTO avance (proyecto_id, hito_id, fecha_reporte, fuente, observacion)
  VALUES
    (py01, h01, '2026-02-14', 'manual', 'Documento de arquitectura entregado y aprobado'),
    (py01, h02, '2026-03-20', 'manual', 'Prototipo presentado al Secretario General');

  -- -------------------------------------------------------
  -- PY02 - Capacitación (AMARILLO)
  -- -------------------------------------------------------
  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_numerico, observacion)
  VALUES
    (py02, m04, '2026-02-28', 'manual', 60, 'Primer módulo presencial completado'),
    (py02, m04, '2026-03-31', 'manual', 130, 'Segundo módulo. Buena recepción pero ritmo insuficiente'),
    (py02, m04, '2026-04-10', 'manual', 180, 'Módulo virtual incorporado para acelerar');

  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_numerico, observacion)
  VALUES
    (py02, m05, '2026-02-28', 'manual', 3, NULL),
    (py02, m05, '2026-03-31', 'manual', 6, 'Se sumaron cursos de ofimática'),
    (py02, m05, '2026-04-10', 'manual', 8, NULL);

  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_cualitativo, observacion)
  VALUES
    (py02, m06, '2026-03-31', 'manual', 'en_proceso', 'Encuestas de primera cohorte con resultados mixtos');

  INSERT INTO avance (proyecto_id, hito_id, fecha_reporte, fuente, observacion)
  VALUES
    (py02, h05, '2026-01-30', 'manual', 'Convenio firmado con UNT y UNSTA');

  -- -------------------------------------------------------
  -- PY03 - Digitalización Mesa (ROJO)
  -- Ultimo avance: 31 marzo → 13 dias sin actualizar
  -- -------------------------------------------------------
  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_numerico, observacion)
  VALUES
    (py03, m07, '2026-02-28', 'manual', 300, 'Digitalización manual con escáner. Proceso lento'),
    (py03, m07, '2026-03-15', 'manual', 600, 'Se incorporó segundo equipo de escaneo'),
    (py03, m07, '2026-03-31', 'manual', 800, 'Ritmo insuficiente. Falta el sistema GDE para acelerar');

  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_cualitativo, observacion)
  VALUES
    (py03, m08, '2026-02-28', 'manual', 'en_diseno', 'Proveedor adjudicado, en etapa de diseño de implementación');

  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_numerico, observacion)
  VALUES
    (py03, m09, '2026-02-28', 'manual', 13, 'Mejora marginal sin sistema digital'),
    (py03, m09, '2026-03-15', 'manual', 12, 'Estancado. Sin GDE no hay mejora significativa');

  INSERT INTO avance (proyecto_id, hito_id, fecha_reporte, fuente, observacion)
  VALUES
    (py03, h08, '2026-02-28', 'manual', 'Licitación adjudicada a empresa TecnoGDE S.A.');

  -- -------------------------------------------------------
  -- PY04 - Gobierno Abierto (AMARILLO)
  -- -------------------------------------------------------
  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_numerico, observacion)
  VALUES
    (py04, m10, '2026-02-15', 'manual', 5, 'Datasets iniciales: presupuesto, compras, organigrama'),
    (py04, m10, '2026-03-15', 'manual', 8, 'Sumados datasets de obras y transporte'),
    (py04, m10, '2026-04-05', 'manual', 10, 'En proceso de curación de datasets de salud');

  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_cualitativo, observacion)
  VALUES
    (py04, m11, '2026-03-15', 'manual', 'en_implementacion', 'Portal de transparencia en desarrollo. Publicados primeros indicadores');

  -- -------------------------------------------------------
  -- PY05 - Ceremonial (VERDE)
  -- -------------------------------------------------------
  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_numerico, observacion)
  VALUES
    (py05, m12, '2026-02-15', 'manual', 40, 'Protocolos de actos oficiales actualizados'),
    (py05, m12, '2026-03-15', 'manual', 70, 'Sumados protocolos de visitas y recepciones'),
    (py05, m12, '2026-04-10', 'manual', 90, 'Solo faltan protocolos de emergencia');

  -- M13 es hito_unico: el manual fue publicado (via hito H11)
  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_numerico, observacion)
  VALUES
    (py05, m13, '2026-03-10', 'manual', 1, 'Manual digital aprobado y publicado en intranet');

  INSERT INTO avance (proyecto_id, hito_id, fecha_reporte, fuente, observacion)
  VALUES
    (py05, h11, '2026-03-10', 'manual', 'Manual aprobado por Resolución SG-042/2026');

  -- -------------------------------------------------------
  -- PY06 - Vínculo Comunitario (GRIS - SIN AVANCES)
  -- Intencionalmente vacío para probar estado "sin datos"
  -- -------------------------------------------------------

  -- -------------------------------------------------------
  -- PY07 - Optimización Procesos (AMARILLO)
  -- -------------------------------------------------------
  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_numerico, observacion)
  VALUES
    (py07, m16, '2026-02-28', 'manual', 5, 'Relevamiento de procesos de Mesa de Entradas'),
    (py07, m16, '2026-03-31', 'manual', 10, 'Relevamiento de procesos de RRHH y Compras'),
    (py07, m16, '2026-04-08', 'manual', 14, 'En curso: procesos de Despacho');

  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_cualitativo, observacion)
  VALUES
    (py07, m17, '2026-03-15', 'manual', 'en_diseno', 'Diseño de flujos automatizables para 3 procesos piloto');

  -- -------------------------------------------------------
  -- PY08 - Atención al Vecino (VERDE)
  -- -------------------------------------------------------
  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_numerico, observacion)
  VALUES
    (py08, m18, '2026-02-28', 'manual', 320, 'Centro presencial operativo. Alta demanda espontánea'),
    (py08, m18, '2026-03-31', 'manual', 400, 'Se sumó canal telefónico'),
    (py08, m18, '2026-04-10', 'manual', 450, 'Canal web en testing. Proyección excelente');

  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_numerico, observacion)
  VALUES
    (py08, m19, '2026-02-28', 'manual', 45, 'Tiempos altos por falta de personal en turno tarde'),
    (py08, m19, '2026-03-31', 'manual', 32, 'Mejora con redistribución de turnos'),
    (py08, m19, '2026-04-10', 'manual', 28, 'Cerca del objetivo. Canal web ayudará a bajar más');

  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_cualitativo, observacion)
  VALUES
    (py08, m20, '2026-03-15', 'manual', 'en_proceso', 'Primera medición con encuestas presenciales'),
    (py08, m20, '2026-04-05', 'manual', 'satisfactorio', 'Encuesta Q1: 78% satisfacción general');

  INSERT INTO avance (proyecto_id, hito_id, fecha_reporte, fuente, observacion)
  VALUES
    (py08, h13, '2026-01-15', 'manual', 'Inauguración del Centro de Atención al Vecino, Av. Salta 400');

  -- -------------------------------------------------------
  -- PY09 - Relevamiento Normativo (BORRADOR - sin avances)
  -- Intencionalmente vacío
  -- -------------------------------------------------------

  -- -------------------------------------------------------
  -- PY10 - Comunicación (ROJO)
  -- Último avance: 5 abril. Pero muy atrasado en metas.
  -- -------------------------------------------------------
  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_numerico, observacion)
  VALUES
    (py10, m22, '2026-02-28', 'manual', 8, 'Solo publicaciones esporádicas en Facebook'),
    (py10, m22, '2026-03-31', 'manual', 15, 'Se sumó Instagram. Falta estrategia consistente');

  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_numerico, observacion)
  VALUES
    (py10, m23, '2026-02-28', 'manual', 5500, 'Crecimiento orgánico mínimo'),
    (py10, m23, '2026-03-31', 'manual', 6000, 'Sin campaña de difusión activa'),
    (py10, m23, '2026-04-05', 'manual', 6200, 'Crecimiento insuficiente sin plan de medios');

  -- M24 (estrategia comunicación digital): sin avances → sin_datos

  -- -------------------------------------------------------
  -- Avance extra: simular fuente 'importacion'
  -- Un avance cargado por importación masiva
  -- -------------------------------------------------------
  INSERT INTO avance (proyecto_id, meta_id, fecha_reporte, fuente, valor_numerico, observacion, payload_original)
  VALUES (py02, m04, '2026-04-12', 'importacion', 195,
    'Dato importado desde planilla de seguimiento mensual',
    '{"archivo": "seguimiento_abril_2026.xlsx", "hoja": "Capacitacion", "fila": 12}'::jsonb);


  -- ===========================================================
  -- SECCION 7: CONSOLIDACION DE CAMPOS MATERIALIZADOS
  -- ===========================================================
  -- Actualiza los campos derivados en meta y hito para que
  -- el estado de la base sea consistente y el dashboard
  -- pueda leer directamente sin recomputar.
  --
  -- En produccion, esto lo hará un trigger o la logica de
  -- aplicacion. En el seed, se hace manualmente.

  -- ----- Metas cuantitativas -----
  UPDATE meta SET valor_actual = 85,  estado_semaforo = 'verde',    ultima_actualizacion = '2026-04-10'::timestamptz WHERE id = m01;
  UPDATE meta SET valor_actual = 12,  estado_semaforo = 'verde',    ultima_actualizacion = '2026-04-05'::timestamptz WHERE id = m02;
  UPDATE meta SET valor_actual = 195, estado_semaforo = 'amarillo',  ultima_actualizacion = '2026-04-12'::timestamptz WHERE id = m04;
  UPDATE meta SET valor_actual = 8,   estado_semaforo = 'amarillo',  ultima_actualizacion = '2026-04-10'::timestamptz WHERE id = m05;
  UPDATE meta SET valor_actual = 800, estado_semaforo = 'rojo',     ultima_actualizacion = '2026-03-31'::timestamptz WHERE id = m07;
  UPDATE meta SET valor_actual = 12,  estado_semaforo = 'rojo',     ultima_actualizacion = '2026-03-15'::timestamptz WHERE id = m09;
  UPDATE meta SET valor_actual = 10,  estado_semaforo = 'amarillo',  ultima_actualizacion = '2026-04-05'::timestamptz WHERE id = m10;
  UPDATE meta SET valor_actual = 90,  estado_semaforo = 'verde',    ultima_actualizacion = '2026-04-10'::timestamptz WHERE id = m12;
  UPDATE meta SET valor_actual = 1,   estado_semaforo = 'verde',    ultima_actualizacion = '2026-03-10'::timestamptz WHERE id = m13;
  UPDATE meta SET valor_actual = 14,  estado_semaforo = 'amarillo',  ultima_actualizacion = '2026-04-08'::timestamptz WHERE id = m16;
  UPDATE meta SET valor_actual = 450, estado_semaforo = 'verde',    ultima_actualizacion = '2026-04-10'::timestamptz WHERE id = m18;
  UPDATE meta SET valor_actual = 28,  estado_semaforo = 'verde',    ultima_actualizacion = '2026-04-10'::timestamptz WHERE id = m19;
  UPDATE meta SET valor_actual = 15,  estado_semaforo = 'rojo',     ultima_actualizacion = '2026-03-31'::timestamptz WHERE id = m22;
  UPDATE meta SET valor_actual = 6200,estado_semaforo = 'rojo',     ultima_actualizacion = '2026-04-05'::timestamptz WHERE id = m23;

  -- ----- Metas cualitativas -----
  UPDATE meta SET nivel_actual = 'implementado',     estado_semaforo = 'verde',    ultima_actualizacion = '2026-04-08'::timestamptz WHERE id = m03;
  UPDATE meta SET nivel_actual = 'en_proceso',       estado_semaforo = 'amarillo',  ultima_actualizacion = '2026-03-31'::timestamptz WHERE id = m06;
  UPDATE meta SET nivel_actual = 'en_diseno',        estado_semaforo = 'rojo',     ultima_actualizacion = '2026-02-28'::timestamptz WHERE id = m08;
  UPDATE meta SET nivel_actual = 'en_implementacion',estado_semaforo = 'amarillo',  ultima_actualizacion = '2026-03-15'::timestamptz WHERE id = m11;
  UPDATE meta SET nivel_actual = 'en_diseno',        estado_semaforo = 'amarillo',  ultima_actualizacion = '2026-03-15'::timestamptz WHERE id = m17;
  UPDATE meta SET nivel_actual = 'satisfactorio',    estado_semaforo = 'verde',    ultima_actualizacion = '2026-04-05'::timestamptz WHERE id = m20;

  -- Metas sin avances → se quedan en sin_datos (default)
  -- m14, m15 (PY06), m21 (PY09), m24 (PY10)

END;
$$;

COMMIT;

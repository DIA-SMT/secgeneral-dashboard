-- ============================================================
-- 120: Importacion completa del POA 2026
-- Proyectos, metas e hitos reales
-- ============================================================
-- Fuente: PDF POA 2026 procesado en POA_2026_PROCESAMIENTO.md
-- Decisiones validadas en MATRIZ_VALIDACION_POA.md:
--   D-01: micro-eventos agrupados en agendas con hitos
--   D-02: Banco de Ideas excluido
--   D-03: CDI Escuela de Padres = 3 metas por sede
--   D-04: Talleres Anuales Ninez = 1 meta global
--   D-05: Produccion editorial = hitos por publicacion
--   D-06: Responsable Subsec DH = null
--
-- NO se importan avances. La planificacion es estructura,
-- no ejecucion. Los avances se cargan operativamente.
-- ============================================================

BEGIN;

DO $$
DECLARE
  -- Helpers
  v_periodo uuid;
  v_unidad  uuid;
  v_py      uuid;
  v_meta    uuid;

  -- Escalas cualitativas reutilizables
  escala_implementacion jsonb := '{
    "niveles": [
      {"clave": "no_iniciado",      "label": "No iniciado",       "valor_numerico": 0},
      {"clave": "en_diseno",        "label": "En diseño",         "valor_numerico": 25},
      {"clave": "en_implementacion","label": "En implementación",  "valor_numerico": 50},
      {"clave": "implementado",     "label": "Implementado",       "valor_numerico": 75},
      {"clave": "consolidado",      "label": "Consolidado",        "valor_numerico": 100}
    ]
  }'::jsonb;

  escala_cumplimiento jsonb := '{
    "niveles": [
      {"clave": "no_iniciado",  "label": "No iniciado",   "valor_numerico": 0},
      {"clave": "en_proceso",   "label": "En proceso",    "valor_numerico": 33},
      {"clave": "avanzado",     "label": "Avanzado",      "valor_numerico": 66},
      {"clave": "cumplido",     "label": "Cumplido",      "valor_numerico": 100}
    ]
  }'::jsonb;

BEGIN

  -- Obtener periodo
  SELECT id INTO v_periodo FROM periodo WHERE anio = 2026;

  -- ================================================================
  -- DIRECCION DE ASISTENCIA PUBLICA (7 proyectos)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Asistencia Pública';

  -- AP-01: Fortalecimiento de la Guardia Medica 24 hs
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'AP-01', 'Fortalecimiento de la Guardia Médica 24 hs',
    'Mejorar las condiciones de funcionamiento de la guardia existente en el ámbito de la Asistencia Pública municipal',
    'Consolidar una guardia más eficiente, segura y con mayor capacidad de respuesta ante urgencias y emergencias',
    '2026-01-01', '2026-12-31', 'activo', 1)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, medio_verificacion, fecha_limite, orden)
  VALUES
    (v_py, 'AP-01-M1', 'Cobertura completa de turnos médicos y de enfermería', 'cuantitativo', 'meses cubiertos', 0, 12, 'mensual', 'Informe mensual de turnos emitidos vs cubiertos', '2026-12-31', 1),
    (v_py, 'AP-01-M2', 'Actualización de protocolos de urgencias y emergencias', 'hito_unico', 'unidad', 0, 1, 'puntual', 'Informe de acreditación en febrero', '2026-02-28', 2);
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, medio_verificacion, fecha_limite, orden)
  VALUES
    (v_py, 'AP-01-M3', 'Capacitaciones en emergencias y RCP para personal de guardia', 'cuantitativo', 'instancias', 0, 2, 'semestral', 'Informe cuantitativo y cualitativo post jornada', '2026-12-31', 3),
    (v_py, 'AP-01-M4', 'Mantenimiento integral del equipamiento de la guardia', 'cuantitativo', 'meses', 0, 12, 'mensual', 'Informes técnicos mensuales', '2026-12-31', 4);

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Protocolos de urgencias actualizados', '2026-02-28', true, 1),
    (v_py, 'Primera capacitación RCP realizada', '2026-01-31', false, 2),
    (v_py, 'Segunda capacitación RCP realizada', '2026-07-31', false, 3);

  -- AP-02: Reduccion del tiempo de espera en Consultorios Externos
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'AP-02', 'Reducción del tiempo de espera en Consultorios Externos',
    'Reducir el tiempo de espera en los consultorios externos, incrementando consultas e reduciendo ausentismo',
    '2026-01-01', '2026-12-31', 'activo', 2)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, medio_verificacion, fecha_limite, orden, metadata)
  VALUES
    (v_py, 'AP-02-M1', 'Reducir tiempo de espera en todas las especialidades', 'cuantitativo', 'días', 20, 17, 'trimestral', 'Medición en abril, julio y octubre', '2026-12-31', 1, '{"invertida": true}'::jsonb),
    (v_py, 'AP-02-M2', 'Incrementar consultas en especialidades básicas', 'cuantitativo', '%', 0, 15, 'trimestral', 'Informe trimestral de turnos y atención', '2026-12-31', 2, '{}'::jsonb),
    (v_py, 'AP-02-M3', 'Reducir ausentismo de pacientes al 15%', 'cuantitativo', '%', 33, 15, 'trimestral', 'Informe trimestral desde abril', '2026-12-31', 3, '{"invertida": true}'::jsonb),
    (v_py, 'AP-02-M4', 'Seguimiento del 80% de pacientes crónicos', 'cuantitativo', '%', 65, 80, 'trimestral', 'Informe trimestral cuantitativo', '2026-12-31', 4, '{}'::jsonb);

  -- AP-03: Piso de Atencion de la Mujer
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'AP-03', 'Piso de Atención de la Mujer',
    'Atención integral a la salud de la mujer con enfoque de derechos, fortaleciendo ginecología, controles adolescentes y educación en salud',
    '2026-01-01', '2026-12-31', 'activo', 3)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'AP-03-M1', 'Reducir ausentismo de pacientes que solicitaron turno en 15%', 'cuantitativo', '%', 0, 15, 'anual', '2026-12-31', 1),
    (v_py, 'AP-03-M2', 'Alcanzar 90% de controles de mujeres adolescentes completos', 'cuantitativo', '%', 0, 90, 'anual', '2026-12-31', 2),
    (v_py, 'AP-03-M3', 'Realizar al menos 4 talleres de educación y promoción en salud', 'cuantitativo', 'talleres', 0, 4, 'semestral', '2026-12-31', 3);

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Talleres abril (2 talleres)', '2026-04-30', 1),
    (v_py, 'Talleres octubre (2 talleres)', '2026-10-31', 2);

  -- AP-04: Laboratorio - Implementacion de Equipamiento de Hormonas
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'AP-04', 'Laboratorio – Implementación de Equipamiento de Hormonas',
    'Fortalecer la capacidad diagnóstica del laboratorio municipal mediante incorporación de equipamiento para estudios hormonales',
    '2026-01-01', '2026-12-31', 'activo', 4)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'AP-04-M1', 'Puesta en funcionamiento del equipamiento de hormonas', 'hito_unico', 'unidad', 0, 1, 'puntual', '2026-03-31', 1),
    (v_py, 'AP-04-M2', 'Capacitación del 100% del personal en manipulación del equipamiento', 'cuantitativo', '%', 0, 100, 'puntual', '2026-05-31', 2),
    (v_py, 'AP-04-M3', 'Inicio de realización de estudios hormonales', 'hito_unico', 'unidad', 0, 1, 'puntual', '2026-06-30', 3),
    (v_py, 'AP-04-M4', 'Implementar protocolos de control de calidad interno', 'hito_unico', 'unidad', 0, 1, 'semestral', '2026-12-31', 4);

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Puesta en marcha del equipamiento', '2026-03-31', true, 1),
    (v_py, 'Inicio de estudios hormonales', '2026-06-30', true, 2);

  -- AP-05: Traslados en Ambulancia
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'AP-05', 'Traslados en Ambulancia a Centros de Mayor Complejidad',
    'Garantizar traslados sanitarios oportunos, seguros y coordinados hacia centros de mayor complejidad',
    '2026-01-01', '2026-12-31', 'activo', 5)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden, metadata) VALUES
    (v_py, 'AP-05-M1', 'Disponibilidad operativa de ambulancias al 100%', 'cuantitativo', '%', 0, 100, 'mensual', '2026-12-31', 1, '{}'::jsonb),
    (v_py, 'AP-05-M2', 'Capacitación de choferes y personal en traslados sanitarios', 'cuantitativo', 'capacitaciones', 0, 1, 'puntual', '2026-01-31', 2, '{}'::jsonb),
    (v_py, 'AP-05-M3', 'Elaborar 2 protocolos de derivación', 'cuantitativo', 'protocolos', 0, 2, 'puntual', '2026-02-28', 3, '{}'::jsonb),
    (v_py, 'AP-05-M4', 'Reducir tiempo de respuesta de 90 a 60 minutos', 'cuantitativo', 'minutos', 90, 60, 'mensual', '2026-12-31', 4, '{"invertida": true}'::jsonb);

  -- AP-06: Hospital Verde
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'AP-06', 'Implementación de Hospital Verde',
    'Implementar el enfoque de Hospital Verde reduciendo el impacto ambiental y promoviendo prácticas sustentables',
    '2026-01-01', '2026-12-31', 'activo', 6)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'AP-06-M1', 'Diagnóstico ambiental institucional elaborado', 'cualitativo', 'puntual', '2026-02-28', 1, escala_implementacion),
    (v_py, 'AP-06-M2', 'Gestión diferenciada de residuos implementada', 'cualitativo', 'trimestral', '2026-12-31', 2, escala_implementacion),
    (v_py, 'AP-06-M3', 'Uso racional de la energía y el agua implementado', 'cualitativo', 'trimestral', '2026-12-31', 3, escala_implementacion),
    (v_py, 'AP-06-M5', 'Compra responsable de insumos incorporada', 'cualitativo', 'trimestral', '2026-12-31', 5, escala_implementacion);
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'AP-06-M4', 'Sensibilización del personal (2 capacitaciones)', 'cuantitativo', 'capacitaciones', 0, 2, 'semestral', '2026-12-31', 4);

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Presentación Informe Nº1 Emergencia Sanitaria y Ambiental ante HCD', '2026-02-28', true, 1);

  -- AP-07: Plan de Certificacion de Normas de Calidad
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'AP-07', 'Plan de Certificación de Normas de Calidad',
    'Avanzar en la certificación de normas de calidad y seguridad del paciente mediante diagnóstico, manuales, capacitación y auditorías',
    '2026-01-01', '2026-11-30', 'activo', 7)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'AP-07-M1', 'Diagnóstico de situación institucional en calidad y seguridad', 'cualitativo', 'puntual', '2026-02-28', 1, escala_implementacion),
    (v_py, 'AP-07-M2', 'Elaboración de manuales y protocolos para certificación', 'cualitativo', 'trimestral', '2026-09-30', 2, escala_implementacion);
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'AP-07-M3', 'Capacitaciones en calidad y seguridad del paciente', 'cuantitativo', 'capacitaciones', 0, 2, 'semestral', '2026-10-31', 3),
    (v_py, 'AP-07-M4', 'Auditorías internas realizadas', 'cuantitativo', 'auditorías', 0, 6, 'bimestral', '2026-11-30', 4);

  -- ================================================================
  -- DIRECCION DE CIM CEA (5 proyectos + 1 agenda)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'CIM CEA';

  -- CEA-01
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CEA-01', 'Disminuir los tiempos de espera para la generación de diagnósticos',
    'Reducir tiempos de espera para diagnósticos en el CIM CEA optimizando procesos de admisión y evaluación',
    '2026-01-01', '2026-12-31', 'activo', 1)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden, metadata) VALUES
    (v_py, 'CEA-01-M1', 'Reducir tiempo de espera para diagnósticos', 'cuantitativo', 'días', 60, 45, 'trimestral', '2026-09-30', 1, '{"invertida": true}'::jsonb),
    (v_py, 'CEA-01-M2', 'Formalizar sistema de priorización por urgencia', 'hito_unico', 'unidad', 0, 1, 'puntual', '2026-12-31', 2, '{}'::jsonb),
    (v_py, 'CEA-01-M3', 'Implementar evaluaciones diagnósticas abreviadas para menores de 24 meses', 'hito_unico', 'unidad', 0, 1, 'puntual', '2026-06-30', 3, '{}'::jsonb);

  -- CEA-02
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CEA-02', 'Acompañamiento a familias en lista de espera',
    'Generar espacios grupales de acompañamiento y orientación para familias en período de espera',
    '2026-01-01', '2026-12-31', 'activo', 2)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CEA-02-M1', 'Participación de familias en dispositivos grupales (julio)', 'cuantitativo', 'familias', 0, 30, 'semestral', '2026-07-31', 1),
    (v_py, 'CEA-02-M2', 'Participación acumulada de familias (diciembre)', 'cuantitativo', 'familias', 0, 60, 'anual', '2026-12-31', 2);

  -- CEA-03
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CEA-03', 'Presencia territorial del CIM CEA',
    'Desarrollar acciones territoriales de detección temprana y signos de alarma en CAPS y escuelas',
    '2026-01-01', '2026-12-31', 'activo', 3)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CEA-03-M1', 'Talleres mensuales en territorio vinculados a detección temprana', 'cuantitativo', 'talleres/mes', 0, 2, 'mensual', '2026-12-31', 1);

  -- CEA-04
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CEA-04', 'Intervención centrada en la familia en territorio',
    'Desarrollar intervención centrada en la familia dirigida a niños y niñas con autismo y sus entornos familiares',
    '2026-01-01', '2026-12-31', 'activo', 4)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CEA-04-M1', 'Acceder territorialmente a 150 familias de niños con autismo', 'cuantitativo', 'familias', 0, 150, 'anual', '2026-12-31', 1),
    (v_py, 'CEA-04-M2', 'Implementar planes de intervención en al menos 30 familias', 'cuantitativo', 'familias', 0, 30, 'semestral', '2026-12-31', 2);

  -- CEA-05: Talleres Verano Azul
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CEA-05', 'Talleres Verano Azul',
    'Actividades inclusivas y recreativas destinadas a personas con CEA y sus familias',
    '2026-01-05', '2026-02-27', 'activo', 5)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CEA-05-M1', 'Lograr la inscripción de 450 niños por mes', 'cuantitativo', 'niños/mes', 450, 450, 'mensual', '2026-02-28', 1);

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Inicio Talleres Verano Azul', '2026-01-05', true, 1),
    (v_py, 'Cierre Talleres Verano Azul', '2026-02-27', true, 2);

  -- CEA-AG: Agenda Anual Casa Azul (D-01: agrupacion de 13 eventos)
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden,
    metadata)
  VALUES (v_periodo, v_unidad, 'CEA-AG', 'Agenda Anual de la Casa Azul',
    'Línea de trabajo sostenida del CIM CEA orientada a atención, orientación y acompañamiento vinculados al desarrollo infantil y trastornos del neurodesarrollo, con foco en autismo',
    '2026-01-01', '2026-12-31', 'activo', 6,
    '{"decision": "D-01", "nota": "Agrupacion de proyectos 6-18 del PDF como hitos de una agenda unica"}'::jsonb)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'CEA-AG-M1', 'Cumplimiento de la Agenda Anual de la Casa Azul', 'cualitativo', 'mensual', '2026-12-31', 1, escala_cumplimiento);

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Día Mundial del Síndrome de Down', '2026-03-21', 1),
    (v_py, '1er aniversario de la Casa Azul', '2026-03-28', 2),
    (v_py, 'Mes Azul (sensibilización autismo)', '2026-04-02', 3),
    (v_py, 'Participación en la Semana de la Educación Especial', '2026-05-15', 4),
    (v_py, 'Campaña Cuidar la Salud es Incluir', '2026-06-15', 5),
    (v_py, 'Talleres Invierno Azul', '2026-07-15', 6),
    (v_py, 'Semana de la Infancia', '2026-08-15', 7),
    (v_py, 'Día de la Primavera y del Estudiante', '2026-09-21', 8),
    (v_py, 'Día Mundial de la Salud Mental', '2026-10-10', 9),
    (v_py, 'Campaña Incluir es Escuchar', '2026-10-15', 10),
    (v_py, 'Campaña más luces menos ruido', '2026-11-15', 11),
    (v_py, 'Día Internacional de las Personas con Discapacidad', '2026-12-03', 12),
    (v_py, 'Cierre institucional', '2026-12-15', 13);


  -- ================================================================
  -- DIRECCION DE TARTAMUDEZ (3 proyectos)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Tartamudez';

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'TAR-01', 'Efemérides y otros eventos',
    'Promover la visibilización, sensibilización y concientización sobre la tartamudez y las problemáticas asociadas',
    '2026-03-01', '2026-12-31', 'activo', 1)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'TAR-01-M1', 'Acciones institucionales de sensibilización por semestre', 'cuantitativo', 'acciones/semestre', 0, 4, 'semestral', '2026-12-31', 1);

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Capacitación a docentes sobre tartamudez', '2026-03-15', 1),
    (v_py, 'Actividades de promoción y sensibilización', '2026-04-15', 2),
    (v_py, 'Día del Fonoaudiólogo', '2026-05-15', 3),
    (v_py, 'Día del Terapeuta Ocupacional', '2026-09-15', 4),
    (v_py, 'Día del Psicopedagogo', '2026-09-15', 5),
    (v_py, 'Día Internacional de la Concientización sobre la Tartamudez', '2026-10-15', 6);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'TAR-02', 'Grupos de Ayuda Mutua (G.A.M.)',
    'Espacio de acompañamiento terapéutico grupal destinado a personas con tartamudez y sus familias',
    '2026-05-01', '2026-12-31', 'activo', 2)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'TAR-02-M1', 'Grupos de Ayuda Mutua mensuales realizados', 'cuantitativo', 'GAM/mes', 0, 4, 'mensual', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'TAR-03', 'Atención por Área',
    'Atención integral e interdisciplinaria de personas con tartamudez en fonoaudiología, psicopedagogía, psicología y terapia ocupacional',
    '2026-05-01', '2026-12-31', 'activo', 3)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'TAR-03-M1', 'Atención en Fonoaudiología', 'cuantitativo', 'atenciones', 803, 4200, 'mensual', '2026-12-31', 1),
    (v_py, 'TAR-03-M2', 'Atención en Psicopedagogía', 'cuantitativo', 'atenciones', 236, 1500, 'mensual', '2026-12-31', 2),
    (v_py, 'TAR-03-M3', 'Atención en Psicología', 'cuantitativo', 'atenciones', 507, 2400, 'mensual', '2026-12-31', 3),
    (v_py, 'TAR-03-M4', 'Atención en Terapia Ocupacional', 'cuantitativo', 'atenciones', 152, 1400, 'mensual', '2026-12-31', 4);


  -- ================================================================
  -- DIRECCION DE SALUD (10 proyectos)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Salud';

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'SAL-01', 'Peatonal Saludable (Mendoza y Muñecas)',
    'Promover hábitos saludables y acceso a controles básicos de salud en el espacio público',
    '2026-03-01', '2026-12-31', 'activo', 1)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'SAL-01-M1', 'Acciones mensuales entre marzo y noviembre, y dos en diciembre', 'cuantitativo', 'acciones', 0, 6, 'mensual', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'SAL-02', 'Tráiler Integral de la Mujer',
    'Garantizar acceso a controles de salud, prevención y promoción integral para mujeres en distintos puntos de la ciudad',
    '2026-03-01', '2026-12-31', 'activo', 2)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'SAL-02-M1', 'Operativos mensuales (12 mar-nov + 8 dic) superando 20% línea base', 'cuantitativo', 'operativos', 0, 20, 'mensual', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'SAL-03', 'Tráiler SMT Somos Más en Territorio',
    'Fortalecer abordaje integral de la salud mediante dispositivo móvil en distintos barrios',
    '2026-03-01', '2026-12-31', 'activo', 3)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'SAL-03-M1', 'Sostener 4 operativos mensuales y 2 adicionales en diciembre', 'cuantitativo', 'operativos/mes', 4, 4, 'mensual', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'SAL-04', 'Capacitación en RCP y uso del DEA',
    'Fortalecer capacidades de respuesta ante emergencias en la comunidad y actores institucionales',
    '2026-03-01', '2026-11-30', 'activo', 4)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'SAL-04-M1', 'Capacitaciones mensuales en RCP y DEA', 'cuantitativo', 'capacitaciones', 0, 36, 'mensual', '2026-11-30', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'SAL-05', 'Cuidamos tu Salud (comercios del centro de SMT)',
    'Promover prácticas saludables en comercios del centro mediante prevención, control y concientización',
    '2026-03-01', '2026-11-30', 'activo', 5)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'SAL-05-M1', 'Intervenciones mensuales para acceder a 144 personas', 'cuantitativo', 'intervenciones/mes', 0, 16, 'mensual', '2026-11-30', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'SAL-06', 'Reordenamiento del programa Eco Lentes',
    'Facilitar acceso a controles visuales y provisión de lentes mediante abordaje territorial sostenido',
    '2026-03-01', '2026-12-31', 'activo', 6)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'SAL-06-M1', 'Alcanzar 20 beneficiarios diarios (lun-vie) y 10 en diciembre', 'cuantitativo', 'beneficiarios/día', 0, 20, 'mensual', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'SAL-07', 'Capacitación al Personal de la Dirección de Salud',
    'Fortalecer capacidades técnicas y operativas del personal promoviendo actualización permanente',
    '2026-03-01', '2026-11-30', 'activo', 7)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'SAL-07-M1', 'Capacitaciones mensuales al personal', 'cuantitativo', 'capacitaciones', 0, 15, 'mensual', '2026-11-30', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'SAL-08', 'Capacitación coordinada con Sistema Provincial de Salud',
    'Mantener actualizado al personal de centros de atención comunitaria con novedades del SIPROSA',
    '2026-03-01', '2026-11-30', 'activo', 8)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'SAL-08-M1', 'Instancias de capacitación mensual con responsables de CAC', 'cuantitativo', 'instancias/mes', 0, 2, 'mensual', '2026-11-30', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'SAL-09', 'Programa Que te piquen las ganas de prevenir el dengue',
    'Facilitar medidas de promoción y prevención sobre dengue mediante abordaje territorial y entrega de repelentes',
    '2026-03-01', '2026-12-31', 'activo', 9)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'SAL-09-M1', 'Entrega de 50 repelentes mensuales (mar-nov) y total 450', 'cuantitativo', 'repelentes', 400, 450, 'mensual', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'SAL-10', 'Programa la salud bucal en las escuelas',
    'Detectar infecciones bucales en niños y articular acciones de promoción, prevención y atención primaria',
    '2026-03-01', '2026-12-31', 'activo', 10)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'SAL-10-M1', 'Sostener 16 operativos mensuales en ambos turnos y alcanzar 2.500 beneficiarios', 'cuantitativo', 'beneficiarios', 2147, 2500, 'mensual', '2026-12-31', 1);


  -- ================================================================
  -- DIRECCION DE EDUCACION (7 proyectos)
  -- (D-02: Banco de Ideas excluido - Ingles, Ensenanzas Maestras, Ausentismo Cero)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Educación';

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'EDU-01', 'Lanzamiento del Programa de Inclusión Escolar Municipal (PIEM)',
    'Implementar marco normativo y regulatorio en jardines y escuelas municipales garantizando igualdad de oportunidades educativas',
    '2026-02-01', '2026-12-31', 'activo', 1)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'EDU-01-M1', 'Consolidar el PIEM mediante marco normativo y estrategias de seguimiento', 'cualitativo', 'anual', '2026-12-31', 1, escala_implementacion);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Lanzamiento del PIEM', '2026-03-15', true, 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'EDU-02', 'SER DOCENTE',
    'Programa de Capacitación Docente Continua orientado a desarrollar instancias de formación gratuitas y de calidad',
    '2026-02-01', '2026-12-31', 'activo', 2)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'EDU-02-M1', 'Inscripción de docentes en jornadas formativas', 'cuantitativo', 'docentes', 1258, 2000, 'anual', '2026-12-31', 1),
    (v_py, 'EDU-02-M2', 'Espacios formativos y de intercambio concretados', 'cuantitativo', 'espacios', 8, 13, 'anual', '2026-12-31', 2);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Lanzamiento SER DOCENTE', '2026-03-15', true, 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'EDU-03', 'Fortalecimiento del DIEM',
    'Consolidar funcionamiento del Departamento Interdisciplinario Educativo Municipal mediante reorganización y sistematización',
    '2026-02-01', '2026-12-31', 'activo', 3)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'EDU-03-M1', 'Consolidar funcionamiento fortalecido del DIEM', 'cualitativo', 'semestral', '2026-12-31', 1, escala_implementacion);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'EDU-04', 'Colonia de Vacaciones "Verano en mi Querida Ciudad"',
    'Propuesta municipal para niñas y niños de 4 a 11 años durante el período estival',
    '2026-01-07', '2026-02-27', 'activo', 4)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'EDU-04-M1', 'Lograr inscripciones entre turno mañana y tarde', 'cuantitativo', 'inscriptos', 150, 250, 'puntual', '2026-02-27', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Inicio Colonia', '2026-01-07', true, 1),
    (v_py, 'Cierre Colonia', '2026-02-27', true, 2);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'EDU-05', 'Circuito de las Infancias',
    'Propuesta municipal cultural, educativa y recreativa orientada a promover el derecho al juego y la expresión',
    '2026-01-01', '2026-12-31', 'activo', 5)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'EDU-05-M1', 'Lograr 2500 participantes en el Circuito', 'cuantitativo', 'participantes', 2000, 2500, 'anual', '2026-12-31', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Inicio del Circuito', '2026-01-15', 1),
    (v_py, 'Cierre anual', '2026-12-15', 2);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'EDU-06', 'La escuela cerca de la familia',
    'Programa orientado a fortalecer el vínculo entre escuelas municipales y familias',
    '2026-01-01', '2026-12-31', 'activo', 6)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'EDU-06-M1', 'Sostener y fortalecer el programa consolidando articulación escuelas-familias', 'cualitativo', 'semestral', '2026-12-31', 1, escala_cumplimiento);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'EDU-07', 'Estudiantes Protagonistas de la Ciudad',
    'Promover la participación estudiantil en la construcción de proyectos colectivos y protagonismo de estudiantes',
    '2026-01-01', '2026-12-31', 'activo', 7)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'EDU-07-M1', 'Alcanzar participación de 10.000 estudiantes', 'cuantitativo', 'estudiantes', 7425, 10000, 'anual', '2026-12-31', 1);


  -- ================================================================
  -- DIRECCION DE NINEZ Y JUVENTUD (proyectos principales + agendas)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Niñez y Juventud';

  -- NIJ-01: Polo de las Infancias
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'NIJ-01', 'Lanzamiento del Polo de las Infancias',
    'Equipo interdisciplinario que brinda atención jurídica, psicológica y social para proteger derechos de las infancias',
    '2026-01-01', '2026-12-31', 'activo', 1)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'NIJ-01-M1', 'Asistir a 200 chicas y chicos hasta diciembre', 'cuantitativo', 'personas', 0, 200, 'anual', '2026-12-31', 1);
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'NIJ-01-M2', 'Fortalecer el funcionamiento del Polo como dispositivo municipal', 'cualitativo', 'anual', '2026-12-31', 2, escala_cumplimiento);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Lanzamiento del Polo de las Infancias', '2026-04-15', true, 1);

  -- NIJ-02: Evento Dia del Nino
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'NIJ-02', 'Evento Día del Niño',
    'Actividad municipal conmemorativa del Día del Niño con actividades recreativas y culturales',
    '2026-05-01', '2026-08-31', 'activo', 2)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'NIJ-02-M1', 'Concurrencia de 38.000 personas', 'cuantitativo', 'personas', 35000, 38000, 'puntual', '2026-08-31', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Realización del evento', '2026-08-15', true, 1);

  -- NIJ-03: Expo Juventud
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'NIJ-03', 'Evento Expo Juventud',
    'Espacio de encuentro, información y participación orientado a jóvenes y adolescentes',
    '2026-07-01', '2026-09-30', 'activo', 3)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'NIJ-03-M1', 'Recibir a 800 jóvenes', 'cuantitativo', 'jóvenes', 500, 800, 'puntual', '2026-09-30', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Realización del evento Expo Juventud', '2026-09-15', true, 1);

  -- NIJ-04: Club de la Aventura
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'NIJ-04', 'Lanzamiento Club de la Aventura',
    'Colonia de vacaciones municipal con actividades recreativas, educativas y de integración',
    '2026-01-01', '2026-02-28', 'activo', 4)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'NIJ-04-M1', 'Inscripción de 84 niños', 'cuantitativo', 'niños', 50, 84, 'puntual', '2026-02-28', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Inicio Club de la Aventura', '2025-12-22', 1),
    (v_py, 'Cierre Club de la Aventura', '2026-02-28', 2);

  -- NIJ-05: Autobus de la Aventura
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'NIJ-05', 'Lanzamiento del Autobús de la Aventura',
    'Dispositivo itinerante de recreación, cultura y aprendizaje destinado a niñas, niños y jóvenes',
    '2025-12-30', '2026-03-31', 'activo', 5)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'NIJ-05-M1', 'Alcanzar aproximadamente 3.000 niñas, niños y jóvenes', 'cuantitativo', 'personas', 0, 3000, 'puntual', '2026-03-31', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Lanzamiento', '2025-12-30', 1),
    (v_py, 'Cierre', '2026-03-31', 2);

  -- NIJ-AG: Campanas de Prevencion (D-01: agrupacion de proyectos 6-13 del PDF)
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden,
    metadata)
  VALUES (v_periodo, v_unidad, 'NIJ-AG', 'Campañas de Prevención en Espacios Públicos',
    'Estrategia municipal de sensibilización y concientización orientada a jóvenes destinada a promover el ejercicio de derechos y la prevención de situaciones de violencia, acoso y vulneración',
    '2026-03-01', '2026-12-31', 'activo', 6,
    '{"decision": "D-01", "nota": "Agrupacion de campanas preventivas (proyectos 6-13 PDF)"}'::jsonb)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'NIJ-AG-M1', 'Sostener y fortalecer la estrategia municipal de campañas de prevención', 'cualitativo', 'anual', '2026-12-31', 1, escala_cumplimiento);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Campaña prevención violencia escolar', '2026-03-15', 1),
    (v_py, 'Campaña violencia escolar en establecimientos educativos', '2026-04-15', 2),
    (v_py, 'Campaña contra el Bullying', '2026-05-15', 3),
    (v_py, 'Campaña contra el Trabajo Infantil', '2026-06-15', 4),
    (v_py, 'Campaña prevención violencia infantil', '2026-07-15', 5),
    (v_py, 'Jornada por el Día Internacional de La Niña', '2026-10-15', 6),
    (v_py, 'Campaña prevención contra el Grooming', '2026-11-15', 7),
    (v_py, 'Campaña promoción de derechos humanos para jóvenes', '2026-12-15', 8);

  -- NIJ-14: Talleres Anuales (D-04: 1 meta global de 270 asistentes)
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'NIJ-14', 'Talleres Anuales',
    'Propuesta municipal de formación y participación sostenida con talleres temáticos para jóvenes',
    '2026-04-01', '2026-06-30', 'activo', 7)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden,
    metadata) VALUES
    (v_py, 'NIJ-14-M1', 'Alcanzar 270 asistentes totales en todos los talleres', 'cuantitativo', 'asistentes', 0, 270, 'puntual', '2026-06-30', 1,
    '{"decision": "D-04", "detalle": "Belleza:50, Teatro:50, Empleo Joven:80, Artesanías:30, Pasteleros:60"}'::jsonb);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Inicio de talleres', '2026-04-01', 1),
    (v_py, 'Cierre de talleres', '2026-06-30', 2);

  -- NIJ-15: Escucha psicologicas
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'NIJ-15', 'Escuchas Psicológicas',
    'Dispositivo municipal de atención psicológica orientado a brindar escucha, contención y orientación profesional',
    '2026-01-01', '2026-12-31', 'activo', 8)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'NIJ-15-M1', 'Garantizar disponibilidad y funcionamiento sostenido del dispositivo', 'cualitativo', 'anual', '2026-12-31', 1, escala_cumplimiento);

  -- NIJ-16: A vos te paso?
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'NIJ-16', '¿A vos te pasó? – Salud mental, niñez y adolescencia',
    'Programa que combina prevención, visibilización e intervención oportuna en salud mental de niños, adolescentes y jóvenes',
    '2026-03-01', '2026-12-31', 'activo', 9)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'NIJ-16-M1', 'Realizar hasta 3 presentaciones del programa', 'cuantitativo', 'presentaciones', 2, 3, 'anual', '2026-12-31', 1);

  -- NIJ-17: Prevencion ludopatia
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'NIJ-17', 'Programa de prevención y abordaje de la ludopatía',
    'Prevenir y abordar la ludopatía en adolescentes y jóvenes mediante acciones de sensibilización y trabajo educativo',
    '2026-01-01', '2026-12-31', 'activo', 10)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'NIJ-17-M1', 'Alcanzar 2.000 adolescentes y jóvenes mediante acciones de prevención', 'cuantitativo', 'personas', 1300, 2000, 'anual', '2026-12-31', 1);

  -- NIJ-18: Consejeria Sexual
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'NIJ-18', 'Consejería Sexual – Salud sexual y reproductiva',
    'Fortalecer la autonomía de adolescentes y jóvenes mediante acceso a información sobre salud sexual y reproductiva',
    '2026-01-01', '2026-12-31', 'activo', 11)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'NIJ-18-M1', 'Alcanzar aproximadamente 16.000 personas mediante acciones de educación sexual integral', 'cuantitativo', 'personas', 1165, 16000, 'anual', '2026-12-31', 1);

  -- NIJ-19: Escuela de Padres CDI (D-03: 3 metas por sede)
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'NIJ-19', 'Escuela de Padres – Centros de Desarrollo Infantil (CDI)',
    'Fortalecer la participación y el rol de las familias en procesos de crianza mediante encuentros socioeducativos mensuales en CDI',
    '2026-03-01', '2026-11-30', 'activo', 12)
  RETURNING id INTO v_py;

  -- D-03 aprobado: 3 metas separadas por sede
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden,
    metadata) VALUES
    (v_py, 'NIJ-19-M1', 'CDI Adolfo de la Vega: sostener participación de 35 familias', 'cuantitativo', 'familias', 35, 35, 'mensual', '2026-11-30', 1,
      '{"decision": "D-03", "sede": "CDI Adolfo de la Vega"}'::jsonb),
    (v_py, 'NIJ-19-M2', 'CDI Vial III: sostener participación de 45 familias', 'cuantitativo', 'familias', 45, 45, 'mensual', '2026-11-30', 2,
      '{"decision": "D-03", "sede": "CDI Vial III"}'::jsonb),
    (v_py, 'NIJ-19-M3', 'CDI Chañaritos: incrementar participación a 45 familias', 'cuantitativo', 'familias', 20, 45, 'mensual', '2026-11-30', 3,
      '{"decision": "D-03", "sede": "CDI Chañaritos"}'::jsonb);

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Inicio del programa', '2026-03-15', 1),
    (v_py, 'Cierre del programa', '2026-11-30', 2);

  -- NIJ-20: Capacitacion Promotores de Sala
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'NIJ-20', 'Programa de Capacitación Continua para Promotores de Sala',
    'Fortalecer capacidades técnicas, pedagógicas y socioemocionales de los equipos de CDI municipales',
    '2026-02-01', '2026-10-31', 'activo', 13)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'NIJ-20-M1', 'Realización de al menos 11 instancias de capacitación', 'cuantitativo', 'instancias', 11, 11, 'mensual', '2026-10-31', 1),
    (v_py, 'NIJ-20-M2', 'Participación de la totalidad de promotores de sala de los 3 CDI', 'cuantitativo', 'promotores', 10, 10, 'anual', '2026-10-31', 2);


  -- ================================================================
  -- DIRECCION DE GENERO Y DIVERSIDAD (3 proyectos + 1 agenda)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Género y Diversidad';

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'GEN-01', 'Primera Feria Municipal de Diversidad e Inclusión',
    'Espacio público institucional de encuentro, visibilización y participación ciudadana en el marco de la Semana del Orgullo LGBTQ+',
    '2026-03-01', '2026-11-30', 'activo', 1)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'GEN-01-M1', 'Consolidar espacio público de encuentro y sensibilización en diversidad', 'cualitativo', 'anual', '2026-11-30', 1, escala_cumplimiento);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Realización de la Feria en Semana del Orgullo LGBTQ+', '2026-10-15', true, 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'GEN-02', 'Ejecución de la Ley Micaela',
    'Implementar y fortalecer capacitación obligatoria en materia de género en el ámbito municipal',
    '2026-03-01', '2026-07-31', 'activo', 2)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'GEN-02-M1', 'Capacitar a 50 agentes municipales por mes', 'cuantitativo', 'agentes/mes', 30, 50, 'mensual', '2026-07-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'GEN-03', 'Día de la Concientización sobre Discapacidad',
    'Evento anual orientado a promover inclusión, respeto y valoración de la diversidad funcional',
    '2026-03-01', '2026-07-31', 'activo', 3)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'GEN-03-M1', 'Realizar al menos un evento anual de concientización sobre discapacidad', 'cualitativo', 'anual', '2026-08-31', 1, escala_cumplimiento);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Realización del evento', '2026-07-15', true, 1);

  -- GEN-AG: Agenda Anual (D-01)
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden,
    metadata)
  VALUES (v_periodo, v_unidad, 'GEN-AG', 'Agenda Anual de Género, Diversidad e Inclusión',
    'Línea de trabajo sostenida de acciones presenciales vinculadas a fechas conmemorativas de género, diversidad e inclusión',
    '2026-03-01', '2026-12-31', 'activo', 4,
    '{"decision": "D-01", "nota": "Agrupacion de proyectos 4-16 del PDF (fechas conmemorativas)"}'::jsonb)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'GEN-AG-M1', 'Sostener agenda anual de acciones presenciales en materia de género e inclusión', 'cualitativo', 'anual', '2026-12-31', 1, escala_cumplimiento);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Día Internacional de la Mujer', '2026-03-08', 1),
    (v_py, 'Día Nacional de la Memoria por la Verdad y la Justicia', '2026-03-24', 2),
    (v_py, 'Muestra fotográfica Identidades trans', '2026-04-15', 3),
    (v_py, 'Día Internacional contra la Homofobia, Transfobia y Bifobia', '2026-05-17', 4),
    (v_py, 'Día Internacional de Acción por la Salud de las Mujeres', '2026-05-28', 5),
    (v_py, 'Conmemoración de Micaela García', '2026-06-01', 6),
    (v_py, 'Muestra por el Día de Ni Una Menos', '2026-06-03', 7),
    (v_py, 'Muestra por el Día del Orgullo LGBTIQ+', '2026-06-28', 8),
    (v_py, 'Día Mundial contra la Trata de Personas', '2026-07-30', 9),
    (v_py, 'Día Mundial de la Salud Sexual', '2026-09-04', 10),
    (v_py, 'Día Internacional contra la Explotación Sexual y la Trata', '2026-09-23', 11),
    (v_py, 'Día Internacional de la Eliminación de la Violencia contra la Mujer', '2026-11-25', 12),
    (v_py, 'Día Mundial de la Lucha contra el Sida', '2026-12-01', 13);


  -- ================================================================
  -- DIRECCION DE ADULTOS MAYORES (7 proyectos + 1 agenda)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Adultos Mayores';

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'ADM-01', 'Talleres anuales para adultos mayores',
    'Propuesta municipal de participación sostenida con espacios regulares de encuentro, actividad física, estimulación cognitiva, expresión y bienestar',
    '2026-03-01', '2026-12-31', 'activo', 1)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'ADM-01-M1', 'Lograr 400 inscriptos más en la totalidad de los 11 talleres', 'cuantitativo', 'inscriptos', 1600, 2000, 'anual', '2026-12-31', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Inicio de talleres', '2026-03-01', 1),
    (v_py, 'Cierre del ciclo anual', '2026-12-15', 2);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'ADM-02', 'Articulación con Centros de Jubilados',
    'Garantizar acceso a propuestas formativas y recreativas destinadas a personas mayores en centros de jubilados',
    '2026-03-01', '2026-12-31', 'activo', 2)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'ADM-02-M1', 'Alcanzar articulación con 50 centros de jubilados', 'cuantitativo', 'centros', 35, 50, 'semestral', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'ADM-03', 'Fortalecimiento de la Mesa de Gestión Municipal de Personas Mayores',
    'Consolidar espacio de articulación interinstitucional que promueva participación, intercambio y coordinación de acciones para personas mayores',
    '2026-03-01', '2026-12-31', 'activo', 3)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'ADM-03-M1', 'Alcanzar a 50 instituciones y organismos en la Mesa', 'cuantitativo', 'instituciones', 20, 50, 'anual', '2026-12-31', 1);
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'ADM-03-M2', 'Sostener el funcionamiento regular de la Mesa durante el año', 'cualitativo', 'anual', '2026-12-31', 2, escala_cumplimiento);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'ADM-04', 'Programa de Protección para Adultos Mayores (PROTAM)',
    'Dispositivo municipal de detección, abordaje y derivación de situaciones de maltrato hacia personas mayores',
    '2026-01-01', '2026-12-31', 'activo', 4)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'ADM-04-M1', 'Intervenir en 40 situaciones de maltrato (duplicar 2025)', 'cuantitativo', 'situaciones', 20, 40, 'anual', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'ADM-07', 'Un jubilado en tu barrio – La voz de la experiencia',
    'Instalar una iniciativa municipal orientada a promover la participación activa de personas mayores barriales',
    '2026-03-01', '2026-12-31', 'activo', 5)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'ADM-07-M1', 'Alcanzar un total de 10 jubilados referentes (1 por barrio)', 'cuantitativo', 'jubilados', 0, 10, 'anual', '2026-12-31', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Lanzamiento del programa', '2026-03-02', true, 1);

  -- ADM-AG: Calendario Anual (D-01)
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden,
    metadata)
  VALUES (v_periodo, v_unidad, 'ADM-AG', 'Calendario Anual de Actividades para Adultos Mayores',
    'Agenda anual de eventos, festividades y actividades especiales para adultos mayores, incluyendo la Semana del Jubilado',
    '2026-01-01', '2026-12-31', 'activo', 6,
    '{"decision": "D-01", "nota": "Agrupacion de Olimpiadas, Abuelazo, Acto Jubilado, Colonia verano, Carnaval, Maraton, Semana Lila, Dia Madre, Cierre"}'::jsonb)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'ADM-AG-M1', 'Cumplimiento del calendario anual de actividades', 'cualitativo', 'mensual', '2026-12-31', 1, escala_cumplimiento);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Colonia municipal de verano', '2026-01-15', 1),
    (v_py, 'Carnaval del amor', '2026-02-20', 2),
    (v_py, 'Maratón Adaptada para Adultos Mayores', '2026-05-16', 3),
    (v_py, 'Semana Lila – Lucha y Concientización del Maltrato', '2026-06-15', 4),
    (v_py, 'Apertura Semana del Jubilado', '2026-09-14', 5),
    (v_py, 'Olimpíadas de Adultos Mayores', '2026-09-15', 6),
    (v_py, 'Abuelazo 2026', '2026-09-18', 7),
    (v_py, 'Acto conmemorativo Día del Jubilado', '2026-09-18', 8),
    (v_py, 'Día de la Madre', '2026-10-30', 9),
    (v_py, 'Cierre de año y exposición de talleres', '2026-12-25', 10);


  -- ================================================================
  -- DIRECCION DE POBLACION ANIMAL (5 proyectos)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Población Animal';

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'ANI-01', 'Nuevo CEMA',
    'Puesta en funcionamiento del nuevo Centro de Esterilización Municipal Animal reemplazando al anterior no operativo',
    '2026-01-01', '2026-04-30', 'activo', 1)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'ANI-01-M1', 'Poner en funcionamiento el nuevo CEMA', 'cualitativo', 'puntual', '2026-04-30', 1, escala_implementacion);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Inauguración y puesta en funcionamiento del nuevo CEMA', '2026-04-15', true, 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'ANI-02', 'Un Vete en tu Barrio – Esterilizaciones en quirófanos móviles',
    'Fortalecer la política municipal de control ético de la población animal mediante esterilizaciones gratuitas itinerantes',
    '2026-03-01', '2026-12-31', 'activo', 2)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'ANI-02-M1', 'Realizar 600 esterilizaciones mensuales con el nuevo quirófano', 'cuantitativo', 'esterilizaciones/mes', 300, 600, 'mensual', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'ANI-03', 'Incorporación de nuevo quirófano móvil de esterilización',
    'Ampliar la capacidad operativa mediante incorporación de un segundo quirófano móvil',
    '2026-01-01', '2026-12-31', 'activo', 3)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'ANI-03-M1', 'Puesta en marcha del nuevo quirófano alcanzando total de 2', 'cuantitativo', 'quirófanos', 1, 2, 'puntual', '2026-02-28', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Puesta en funcionamiento del tráiler', '2026-02-28', true, 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'ANI-04', 'Evento Día del Animal',
    'Jornada institucional de concientización y sensibilización por el Día del Animal',
    '2026-01-01', '2026-04-30', 'activo', 4)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'ANI-04-M1', 'Realizar jornada institucional de concientización por el Día del Animal', 'cualitativo', 'puntual', '2026-04-30', 1, escala_cumplimiento);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Realización del Evento Día del Animal', '2026-04-29', true, 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'ANI-05', 'Un hogar para todos',
    'Promover la adopción responsable de perros adultos residentes del CIAM',
    '2026-01-01', '2026-12-31', 'activo', 5)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'ANI-05-M1', 'Lograr la adopción de los 12 perros adultos residentes del CIAM', 'cuantitativo', 'adopciones', 0, 12, 'anual', '2026-12-31', 1);


  -- ================================================================
  -- DIRECCION DE DOCUMENTACION ESTRATEGICA (9 proyectos + 1 agenda)
  -- (D-02: Banco de Ideas excluido. D-05: editorial por hitos)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Doc. Estratégica';

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DOC-01', 'Publicación de programas de gestión municipal pendientes',
    'Acompañar, ordenar y concretar la publicación de 6 documentos de programas municipales pendientes',
    '2026-01-01', '2026-03-31', 'activo', 1)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'DOC-01-M1', 'Publicar los 6 documentos pendientes declarados en línea de base', 'cuantitativo', 'documentos', 0, 6, 'puntual', '2026-03-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DOC-02', 'Publicación de documentos municipales',
    'Publicación de documentos sujeta a finalización de textos y aprobación por órganos correspondientes',
    '2026-01-01', '2026-06-30', 'activo', 2)
  RETURNING id INTO v_py;
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Código de Planeamiento Urbano', '2026-06-30', 1),
    (v_py, 'Informe del CES', '2026-03-31', 2),
    (v_py, 'Publicación institucional para la Dirección de Tartamudez', '2026-01-31', 3);
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'DOC-02-M1', 'Publicar los documentos municipales previstos', 'cuantitativo', 'documentos', 0, 3, 'puntual', '2026-06-30', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DOC-03', 'Publicación del Informe Anual de gestión 2026',
    'Elaborar y presentar el Informe Anual de Gestión de la Dirección de Documentación Estratégica',
    '2026-09-01', '2026-11-30', 'activo', 3)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, fecha_limite, orden) VALUES
    (v_py, 'DOC-03-M1', 'Cumplir con la entrega del informe hasta el 30 de noviembre', 'hito_unico', '2026-11-30', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Presentación del Informe Anual', '2026-11-30', true, 1);

  -- DOC-04: Produccion editorial (D-05: hitos por publicacion)
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden,
    metadata)
  VALUES (v_periodo, v_unidad, 'DOC-04', 'Producción editorial institucional y libros municipales',
    'Desarrollar y publicar libros institucionales y editoriales municipales. No se establece meta numérica cerrada (depende de demanda y aprobación).',
    '2026-01-01', '2026-12-31', 'activo', 4,
    '{"decision": "D-05", "nota": "Meta por hitos de publicacion, sin numero cerrado"}'::jsonb)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'DOC-04-M1', 'Continuidad de la línea editorial municipal con registro ISBN', 'cualitativo', 'anual', '2026-12-31', 1, escala_cumplimiento);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DOC-05', 'Publicación del libro "Del relato al dato"',
    'Acompañar y coordinar la publicación del libro institucional de la Intendenta Dra. Rossana Chahla',
    '2026-01-01', '2026-06-30', 'activo', 5)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, fecha_limite, orden) VALUES
    (v_py, 'DOC-05-M1', 'Presentar el libro hasta junio (sujeto a aprobación)', 'hito_unico', '2026-06-30', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Publicación o lanzamiento del libro', '2026-06-30', true, 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DOC-06', 'Publicaciones editoriales para infancias',
    'Producir publicaciones editoriales destinadas a infancias, con enfoque local y contenido accesible',
    '2026-01-01', '2026-06-30', 'activo', 6)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'DOC-06-M1', 'Publicar hasta 3 libros para infancias', 'cuantitativo', 'libros', 0, 3, 'puntual', '2026-06-30', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DOC-07', 'Diagramación y trámite ISBN',
    'Garantizar la correcta diagramación editorial y gestión del trámite de ISBN de publicaciones municipales',
    '2026-01-01', '2026-12-31', 'activo', 7)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'DOC-07-M1', 'Análisis comparativo de la producción editorial 2025–2026', 'cualitativo', 'anual', '2026-12-31', 1, escala_cumplimiento);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DOC-08', 'Producción de audiolibros y publicaciones en formato epub',
    'Desarrollar y consolidar contenidos editoriales en formatos digitales accesibles',
    '2026-01-01', '2026-12-31', 'activo', 8)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'DOC-08-M1', 'Alcanzar piso mínimo de 35 publicaciones en formato epub', 'cuantitativo', 'publicaciones epub', 10, 35, 'semestral', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DOC-09', 'Actualización en promoción de la lectura y bibliotecas contemporáneas',
    'Capacitación específica del equipo en promoción de la lectura y bibliotecas contemporáneas',
    '2026-06-01', '2026-07-31', 'activo', 9)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'DOC-09-M1', 'Concretar al menos 1 instancia de capacitación del equipo', 'cuantitativo', 'instancias', 0, 1, 'puntual', '2026-07-31', 1);

  -- DOC-AG: Agenda de Extension Comunitaria (D-01)
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden,
    metadata)
  VALUES (v_periodo, v_unidad, 'DOC-AG', 'Agenda de Extensión Comunitaria',
    'Agenda anual de actividades de extensión comunitaria impulsadas por la Dirección de Documentación Estratégica',
    '2026-02-01', '2026-12-31', 'activo', 10,
    '{"decision": "D-01", "nota": "Agrupacion de proyectos 10-15 del PDF (eventos de extension)"}'::jsonb)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'DOC-AG-M1', 'Cumplir con el calendario de extensión y presentar balance anual para POA 2027', 'cualitativo', 'anual', '2026-12-31', 1, escala_cumplimiento);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Inauguración de la biblioteca del refugio', '2026-02-15', 1),
    (v_py, 'Mes de la mujer (encuentros con poetas)', '2026-03-15', 2),
    (v_py, 'Día del libro (jornada en escuela municipal)', '2026-04-23', 3),
    (v_py, 'Mes del lector (jornada con niños, adolescentes y adultos)', '2026-08-15', 4),
    (v_py, 'Mes del cuidado de la mujer (charlas Escritura y salud)', '2026-10-15', 5),
    (v_py, 'Navidad en palabras compartidas', '2026-12-15', 6);


  -- ================================================================
  -- DIRECCION DE PLANIFICACION ESTRATEGICA (8 proyectos)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Planificación';

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'PLE-01', 'Discurso de Apertura de Sesiones Ordinarias',
    'Coordinar, sistematizar y comunicar los principales resultados de gestión mediante la elaboración del Discurso de Apertura',
    '2026-01-01', '2026-02-28', 'activo', 1)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, fecha_limite, orden) VALUES
    (v_py, 'PLE-01-M1', 'Coordinar y elaborar el Discurso de Apertura de Sesiones Ordinarias', 'hito_unico', '2026-03-01', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Apertura de Sesiones Ordinarias', '2026-03-01', true, 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'PLE-02', 'Informe ambiental para el Concejo Deliberante',
    'Elaboración y presentación periódica del Informe Ambiental y Sanitario al HCD',
    '2026-01-01', '2026-12-31', 'activo', 2)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'PLE-02-M1', 'Entrega del informe ambiental una semana antes de cada vencimiento trimestral', 'cuantitativo', 'entregas', 0, 4, 'trimestral', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'PLE-03', 'Sistema de planificación municipal',
    'Brindar cuerpo metodológico integral para formulación, carga, validación y seguimiento de proyectos institucionales del POA',
    '2026-01-01', '2026-12-31', 'activo', 3)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'PLE-03-M1', 'Implementación del sistema al 100% en diciembre', 'cuantitativo', '%', 0, 100, 'trimestral', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'PLE-04', 'Planificaciones Operativas Anuales (POA)',
    'Coordinar la formulación, validación, carga y seguimiento de las POA de todas las Secretarías',
    '2026-09-01', '2026-11-30', 'activo', 4)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'PLE-04-M1', '100% de Secretarías con POA 2027 formuladas y cargadas', 'cuantitativo', '%', 0, 100, 'puntual', '2026-11-30', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'PLE-05', 'Calendario Interactivo de Hitos de Gestión Municipal',
    'Calendario que reúne los hitos más relevantes de la gestión para consulta rápida de la Intendenta y el gabinete',
    '2026-01-01', '2026-12-31', 'activo', 5)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'PLE-05-M1', 'Contar con Calendario Interactivo operativo y actualizado al 100%', 'cuantitativo', '%', 0, 100, 'anual', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'PLE-06', 'Informes trimestrales de avance y resultados de políticas públicas',
    'Elaborar informes que consoliden avance y resultados de la gestión por trimestre',
    '2026-01-01', '2026-12-31', 'activo', 6)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'PLE-06-M1', 'Elaborar y presentar 4 Informes Trimestrales durante 2026', 'cuantitativo', 'informes', 0, 4, 'trimestral', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'PLE-07', 'Plan de capacitaciones',
    'Fortalecer la cultura de planificación en el municipio capacitando a directores de las diferentes áreas',
    '2026-04-01', '2026-10-31', 'activo', 7)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'PLE-07-M1', 'Lograr que 50 directores reciban al menos una capacitación', 'cuantitativo', 'directores', 0, 50, 'puntual', '2026-10-31', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Inicio del plan de capacitaciones', '2026-04-15', 1),
    (v_py, 'Finalización del plan', '2026-10-31', 2);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'PLE-08', 'Desarrollo de un Banco de Ideas para el municipio',
    'Diseñar e implementar un Banco Municipal de Ideas, Propuestas y Proyectos Estratégicos',
    '2026-01-01', '2026-12-31', 'activo', 8)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'PLE-08-M1', 'Diseñar, implementar y poner en funcionamiento 1 Banco de Ideas', 'cuantitativo', 'banco', 0, 1, 'anual', '2026-12-31', 1);


  -- ================================================================
  -- DIRECCION DE GERENCIA DE DATOS (11 proyectos)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Gerencia de Datos';

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DAT-01', 'Congreso de Datos',
    'Diseñar y realizar un Congreso de Datos como espacio estratégico de intercambio y posicionamiento en gobierno de datos',
    '2026-01-01', '2026-09-30', 'activo', 1)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'DAT-01-M1', 'Al menos 2 casos municipales de uso de datos expuestos', 'cuantitativo', 'casos', 0, 2, 'puntual', '2026-09-30', 1),
    (v_py, 'DAT-01-M2', 'Participación del 90% de los gerentes de datos', 'cuantitativo', '%', 0, 90, 'puntual', '2026-09-30', 2),
    (v_py, 'DAT-01-M3', 'Al menos 350 inscriptos totales al evento', 'cuantitativo', 'inscriptos', 0, 350, 'puntual', '2026-09-30', 3),
    (v_py, 'DAT-01-M4', 'Al menos 3 expertos externos al Municipio', 'cuantitativo', 'expertos', 0, 3, 'puntual', '2026-09-30', 4);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Realización del Congreso de Datos', '2026-09-15', true, 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DAT-02', 'Manual institucional y estratégico del uso de datos del Portal',
    'Elaborar manual que establezca criterios comunes para la gestión, uso y aprovechamiento de datos municipales',
    '2026-01-01', '2026-04-30', 'activo', 2)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, fecha_limite, orden) VALUES
    (v_py, 'DAT-02-M1', 'Presentar el Manual en el Primer Congreso Internacional de Datos', 'hito_unico', '2026-09-30', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Presentación del Manual en el Congreso', '2026-09-15', true, 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DAT-03', 'Campaña de promoción y capacitación del Portal de Datos',
    'Desarrollar campaña sistemática de promoción y capacitación del Portal de Datos interna y externamente',
    '2026-01-01', '2026-12-31', 'activo', 3)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'DAT-03-M1', 'Realizar 2 capacitaciones anuales a directores y niveles jerárquicos', 'cuantitativo', 'capacitaciones', 0, 2, 'semestral', '2026-12-31', 1),
    (v_py, 'DAT-03-M2', 'Realizar 12 participaciones anuales en Radio Ciudad', 'cuantitativo', 'participaciones', 10, 12, 'mensual', '2026-12-31', 2);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DAT-04', 'Ecosistema de Datos Abiertos – Integración colaborativa',
    'Desarrollar ecosistema colaborativo de datos abiertos con instituciones educativas, empresariales y periodísticas',
    '2026-01-01', '2026-05-31', 'activo', 4)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'DAT-04-M1', 'Concretar 2 articulaciones institucionales que deriven en nuevos sets de datos', 'cuantitativo', 'articulaciones', 0, 2, 'puntual', '2026-05-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DAT-05', 'Realización de informes trimestrales sobre eficiencia de datos',
    'Elaborar informes trimestrales sobre eficiencia de datos por Secretaría con análisis comparativos e inferencias',
    '2026-01-01', '2026-12-31', 'activo', 5)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'DAT-05-M1', 'Redactar y presentar 4 informes anuales sobre eficiencia de datos', 'cuantitativo', 'informes', 0, 4, 'trimestral', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DAT-06', 'Videos de novedades para redes y Portal de Datos',
    'Producir contenidos audiovisuales breves con novedades del Portal de Datos',
    '2026-02-01', '2026-12-31', 'activo', 6)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'DAT-06-M1', 'Publicar 2 videos mensuales en redes y Portal de Datos', 'cuantitativo', 'videos/mes', 0, 2, 'mensual', '2026-12-31', 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DAT-07', 'Actualización y mejora del Portal de Datos',
    'Implementar mejoras estructurales y funcionales en el Portal de Datos con periodicidad semestral',
    '2026-01-01', '2026-12-31', 'activo', 7)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'DAT-07-M1', 'Presentar un paquete de mejoras en junio y otro en diciembre', 'cuantitativo', 'paquetes', 0, 2, 'semestral', '2026-12-31', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Paquete de mejoras 1er semestre', '2026-06-30', 1),
    (v_py, 'Paquete de mejoras 2do semestre', '2026-12-31', 2);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DAT-08', 'Automatización de la actualización de la base de datos',
    'Automatizar el proceso de actualización periódica de los 35 tableros del Portal de Datos',
    '2026-01-01', '2026-02-28', 'activo', 8)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, fecha_limite, orden) VALUES
    (v_py, 'DAT-08-M1', 'Implementar actualización automatizada en febrero', 'hito_unico', '2026-02-28', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Implementación de la automatización', '2026-02-28', true, 1);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DAT-09', 'Calendarización de capacitaciones y reuniones con Gerentes de Datos',
    'Calendarizar y sostener esquema regular de capacitaciones técnicas y reuniones de trabajo con los Gerentes de Datos',
    '2026-02-01', '2026-12-31', 'activo', 9)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'DAT-09-M1', 'Realizar y calendarizar 11 capacitaciones/reuniones con frecuencia mensual', 'cuantitativo', 'reuniones', 0, 11, 'mensual', '2026-12-31', 1);
  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, orden) VALUES
    (v_py, 'Inicio del ciclo de capacitaciones', '2026-02-15', 1),
    (v_py, 'Cierre del ciclo', '2026-12-15', 2);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DAT-10', 'Hoja de datos relevantes – automatización y publicación periódica',
    'Optimizar y automatizar producción de información estratégica consolidando una hoja semanal pública descargable',
    '2026-01-01', '2026-12-31', 'activo', 10)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, frecuencia_medicion, fecha_limite, orden, escala_cualitativa) VALUES
    (v_py, 'DAT-10-M1', 'Implementar hoja diaria interna y hoja semanal pública desde marzo', 'cualitativo', 'mensual', '2026-12-31', 1, escala_implementacion);

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'DAT-11', 'Modificación estratégica de tableros',
    'Actualizar y rediseñar estratégicamente los tableros del Portal de Datos para mejorar visualización y monitoreo',
    '2026-01-01', '2026-12-31', 'activo', 11)
  RETURNING id INTO v_py;
  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'DAT-11-M1', 'Presentar 1 tablero estratégico por mes durante todo el año', 'cuantitativo', 'tableros/mes', 0, 1, 'mensual', '2026-12-31', 1);


END;
$$;

COMMIT;

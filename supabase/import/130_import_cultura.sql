-- ============================================================
-- 130: Importacion del POA 2026 — Subsecretaria de Cultura
-- Programas, proyectos, metas e hitos reales
-- ============================================================
-- Fuente: PDF "FINAL POA 2026_Cultura"
-- Estructura: 11 programas / 20 proyectos
--
-- Decisiones de carga:
--   D-08: Cuando un proyecto declara como responsable a la
--         Subsecretaria + multiples direcciones, se asigna a la
--         Subsecretaria de Cultura (nivel 1) como responsable
--         principal. Eso aplica a todo el Programa 2, 10.1, 10.2 y 11.
--   D-09: Lineas de base con multiples indicadores (ej. 66 funciones,
--         17751 espectadores, 36 barrios) se desagregan en metas
--         independientes para preservar trazabilidad.
--   D-10: Programa 11 figura en el PDF como "Proyecto 11.2" con titulo
--         mislabelado; se utiliza el titulo del programa "Mi Ciudad
--         en Mural" como nombre operativo.
--   D-11: Metas con rango (ej. "40 a 50 obras") se cargan con el
--         valor inferior del rango como compromiso minimo.
--   D-12: Cuando no hay linea de base ("No hay linea de base"), se
--         asume valor_linea_base = 0.
--
-- NO se importan avances. La planificacion es estructura,
-- no ejecucion. Los avances se cargan operativamente.
-- ============================================================

BEGIN;

DO $$
DECLARE
  v_periodo uuid;
  v_unidad  uuid;
  v_py      uuid;
BEGIN

  -- Obtener periodo
  SELECT id INTO v_periodo FROM periodo WHERE anio = 2026;

  -- ================================================================
  -- PROGRAMA 1: CREAR ENCUENTRO – CULTURA EN TERRITORIO
  -- (Direccion de Gestion Cultural — 3 proyectos)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Gestión Cultural';

  -- CUL-01: Teatro en los Barrios
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-01', 'Teatro en los Barrios',
    'Garantizar el acceso equitativo a propuestas teatrales de calidad en distintos barrios de San Miguel de Tucuman acercando el teatro a territorios historicamente postergados',
    'Promover el encuentro, la participacion ciudadana y el fortalecimiento del tejido social consolidando la cultura como derecho y herramienta de integracion comunitaria',
    '2026-01-01', '2026-12-31', 'activo', 1)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-01-M1', 'Realizar 70 funciones teatrales durante 2026', 'cuantitativo', 'funciones', 66, 70, 'trimestral', '2026-12-31', 1),
    (v_py, 'CUL-01-M2', 'Cubrir un minimo de 30 barrios con funciones teatrales', 'cuantitativo', 'barrios', 36, 30, 'semestral', '2026-12-31', 2);

  -- CUL-02: Red de Promotores Culturales
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-02', 'Red de Promotores Culturales',
    'Promover el ejercicio efectivo de los derechos culturales de personas, grupos y comunidades de los barrios fortaleciendo capacidades locales para el desarrollo cultural',
    'Consolidar una red activa que potencie la produccion cultural local, fomente la participacion comunitaria y contribuya a la sostenibilidad de los procesos culturales en los barrios',
    '2026-01-01', '2026-12-31', 'activo', 2)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-02-M1', 'Promotores culturales trabajando en red', 'cuantitativo', 'promotores', 28, 40, 'semestral', '2026-12-31', 1),
    (v_py, 'CUL-02-M2', 'Intervenciones culturales realizadas', 'cuantitativo', 'intervenciones', 40, 60, 'trimestral', '2026-12-31', 2),
    (v_py, 'CUL-02-M3', 'Barrios trabajando articuladamente', 'cuantitativo', 'barrios', 12, 30, 'semestral', '2026-12-31', 3);

  -- CUL-03: Vecinos Ven Cine
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-03', 'Vecinos Ven Cine',
    'Promover el acceso al cine como experiencia cultural comunitaria acercando la pantalla grande a los barrios y generando espacios de encuentro y reflexion colectiva',
    'Fortalecer el vinculo comunitario, incentivar el intercambio de miradas y ampliar el acceso a producciones audiovisuales como forma de expresion cultural',
    '2026-01-01', '2026-12-31', 'activo', 3)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-03-M1', 'Funciones de cine comunitario realizadas', 'cuantitativo', 'funciones', 32, 20, 'trimestral', '2026-12-31', 1),
    (v_py, 'CUL-03-M2', 'Sedes barriales con proyecciones', 'cuantitativo', 'sedes', 0, 10, 'semestral', '2026-12-31', 2);

  -- ================================================================
  -- PROGRAMA 2: VACACIONES CULTURALES EN LA CIUDAD
  -- (Subsecretaria de Cultura — multidireccion, 3 proyectos)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Cultura';

  -- CUL-04: Verano en la Ciudad
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-04', 'Verano en la Ciudad',
    'Ofrecer una agenda cultural diversa, accesible e inclusiva durante los meses de verano acercando talleres, espectaculos y actividades artisticas a distintos publicos',
    'Aprovechar el periodo estival para fortalecer la vida cultural de la ciudad promoviendo el uso de espacios publicos, el encuentro comunitario y el acceso a propuestas recreativas y formativas',
    '2026-01-01', '2026-02-28', 'activo', 4)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-04-M1', 'Actividades culturales realizadas durante enero y febrero', 'cuantitativo', 'actividades', 48, 41, 'mensual', '2026-02-28', 1);

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Cierre de la programacion Verano en la Ciudad 2026', '2026-02-28', true, 1);

  -- CUL-05: Invierno con Cultura
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-05', 'Invierno con Cultura',
    'Potenciar la oferta cultural de la ciudad durante el receso invernal generando una programacion amplia y diversa destinada a distintos publicos',
    'Fortalecer el acceso a actividades culturales en un periodo de alta demanda, promoviendo el turismo, la participacion ciudadana y dinamizando la agenda cultural local',
    '2026-07-01', '2026-07-31', 'activo', 5)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-05-M1', 'Actividades culturales ejecutadas durante el receso invernal', 'cuantitativo', 'actividades', 30, 40, 'puntual', '2026-07-31', 1),
    (v_py, 'CUL-05-M2', 'Personas que acceden a las actividades', 'cuantitativo', 'personas', 4497, 5000, 'puntual', '2026-07-31', 2);

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Cierre Invierno con Cultura 2026', '2026-07-31', true, 1);

  -- CUL-06: Conciertos Corales Navidenos
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-06', 'Conciertos Corales Navideños',
    'Acompanar las festividades de fin de ano a traves de la musica y el canto coral navideno y popular generando espacios de encuentro cultural en la ciudad',
    'Poner en valor el trabajo de los coros locales y promover la participacion ciudadana mediante conciertos abiertos en espacios publicos fortaleciendo las tradiciones culturales y el clima festivo',
    '2026-11-01', '2026-12-31', 'activo', 6)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-06-M1', 'Conciertos navidenos realizados en plazas', 'cuantitativo', 'conciertos', 2, 4, 'puntual', '2026-12-31', 1),
    (v_py, 'CUL-06-M2', 'Coros locales participando del ciclo', 'cuantitativo', 'coros', 4, 6, 'puntual', '2026-12-31', 2);

  -- ================================================================
  -- PROGRAMA 3: PLAN ANUAL DE TALLERES CULTURALES
  -- (Direccion de Gestion Cultural — 1 proyecto)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Gestión Cultural';

  -- CUL-07: Plan Anual de Talleres Culturales
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-07', 'Plan Anual de Talleres Culturales',
    'Fortalecer el acceso de vecinos y vecinas a los espacios culturales municipales promoviendo instancias de formacion, socializacion, disfrute y desarrollo de la creatividad a lo largo del ano',
    'Consolidar a los centros culturales como espacios abiertos, inclusivos y participativos con una oferta diversa de talleres artisticos y culturales de caracter comunitario',
    '2026-01-01', '2026-12-31', 'activo', 7)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-07-M1', 'Talleres culturales realizados durante 2026', 'cuantitativo', 'talleres', 72, 40, 'trimestral', '2026-12-31', 1),
    (v_py, 'CUL-07-M2', 'Barrios con vecinos participando de los talleres', 'cuantitativo', 'barrios', 178, 60, 'semestral', '2026-12-31', 2);

  -- ================================================================
  -- PROGRAMA 4: CULTURA, ADOLESCENCIA Y JUVENTUD (2 proyectos)
  -- ================================================================

  -- CUL-08: Mes de la Juventud (Direccion de Gestion Cultural)
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Gestión Cultural';

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-08', 'Mes de la Juventud',
    'Promover la participacion activa de las juventudes en la vida cultural de la ciudad generando espacios de expresion, encuentro y produccion artistica',
    'Visibilizar voces, talentos e identidades culturales juveniles fortaleciendo su protagonismo dentro de la agenda cultural municipal',
    '2026-09-01', '2026-09-30', 'activo', 8)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-08-M1', 'Actividades realizadas durante el Mes de la Juventud', 'cuantitativo', 'actividades', 3, 4, 'puntual', '2026-09-30', 1),
    (v_py, 'CUL-08-M2', 'Jovenes alcanzados por el ciclo', 'cuantitativo', 'jóvenes', 1233, 1500, 'puntual', '2026-09-30', 2);

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Cierre Mes de la Juventud 2026', '2026-09-30', true, 1);

  -- CUL-09: El Museo visita la Escuela (Direccion de Museos)
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Museos';

  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-09', 'El Museo Visita la Escuela',
    'Acercar el Museo de la Industria Azucarera a los estudiantes de escuelas secundarias municipales promoviendo el conocimiento y la valoracion del patrimonio historico e industrial de la provincia',
    'Generar experiencias educativas y culturales que permitan a los alumnos reconocer la importancia de la industria azucarera en la historia, la identidad y el desarrollo de Tucuman',
    '2026-03-01', '2026-12-31', 'activo', 9)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-09-M1', 'Escuelas participantes del programa', 'cuantitativo', 'escuelas', 2, 12, 'trimestral', '2026-12-31', 1),
    (v_py, 'CUL-09-M2', 'Alumnos alcanzados por las visitas', 'cuantitativo', 'alumnos', 85, 420, 'trimestral', '2026-12-31', 2);

  -- ================================================================
  -- PROGRAMA 5: PLAN CURATORIAL PARA EL PATRIMONIO ARTISTICO
  -- (Direccion de Museos — 3 proyectos)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Museos';

  -- CUL-10: Conservacion y restauracion de obras
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-10', 'Conservación y Restauración de Obras',
    'Consolidar una coleccion de arte recuperando algunas de las obras mas significativas que integran el patrimonio artistico municipal poniendo enfasis en la recuperacion, investigacion y restauracion',
    'Garantizar la preservacion de las obras con condiciones materiales adecuadas y sensibilizar a la comunidad sobre la importancia del trabajo de restauracion como bien patrimonial colectivo',
    '2026-01-01', '2026-12-31', 'activo', 10)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-10-M1', 'Obras restauradas durante 2026', 'cuantitativo', 'obras', 30, 30, 'trimestral', '2026-12-31', 1);

  -- CUL-11: Catalogacion de obras e investigacion curatorial
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-11', 'Catalogación de Obras e Investigación Curatorial',
    'Relevar de manera integral las piezas que conforman la coleccion artistica municipal, inventariarlas, catalogarlas adecuadamente y evaluar su estado de conservacion',
    'Ordenar, sistematizar y consolidar la informacion patrimonial fortaleciendo la gestion, preservacion y puesta en valor de las obras',
    '2026-01-01', '2026-12-31', 'activo', 11)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-11-M1', 'Obras investigadas, analizadas y catalogadas (rango 40-50)', 'cuantitativo', 'obras', 56, 40, 'trimestral', '2026-12-31', 1);

  -- CUL-12: Muestras de la Coleccion
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-12', 'Muestras de la Colección',
    'Exponer progresivamente las obras pertenecientes a la Coleccion proponiendo narrativas en cuerpo de obra para lograr cohesion en las diferencias',
    'Sensibilizar a traves de la difusion sobre la importancia del trabajo de recuperacion como de las obras en conjunto, educando, divulgando y promocionando la Coleccion de Arte',
    '2026-01-01', '2026-12-31', 'activo', 12)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-12-M1', 'Muestras anuales de la Coleccion (rango 2-3)', 'cuantitativo', 'muestras', 1, 2, 'semestral', '2026-12-31', 1);

  -- ================================================================
  -- PROGRAMA 6: PROMOCION DE LAS ARTES VISUALES
  -- (Direccion de Museos — Casa de la Ciudad — 1 proyecto)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Museos';

  -- CUL-13: Muestras Temporales de Artes Visuales
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-13', 'Muestras Temporales de Artes Visuales',
    'Promover y fortalecer la produccion artistica local mediante la realizacion de muestras temporales de artes visuales en el Museo Casa de la Ciudad',
    'Consolidar al museo como ambito dinamico de difusion cultural que estimule el intercambio de ideas, el desarrollo creativo y la construccion de publicos contribuyendo al fortalecimiento de la vida cultural',
    '2026-03-01', '2026-12-31', 'activo', 13)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-13-M1', 'Muestras temporales realizadas en Casa de la Ciudad', 'cuantitativo', 'muestras', 6, 9, 'trimestral', '2026-12-31', 1),
    (v_py, 'CUL-13-M2', 'Visitantes alcanzados por las muestras', 'cuantitativo', 'visitantes', 14803, 16000, 'trimestral', '2026-12-31', 2);

  -- ================================================================
  -- PROGRAMA 7: ARTES VIVAS EN MUSEOS
  -- (Direccion de Museos — 1 proyecto)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Museos';

  -- CUL-14: La musica que queremos
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-14', 'La Música que Queremos',
    'Transformar los museos municipales en espacios vivos de encuentro cultural promoviendo la musica como herramienta de participacion, identidad y construccion comunitaria',
    'Generar experiencias culturales significativas que fortalezcan el vinculo entre el publico y los espacios patrimoniales impulsando la produccion artistica local y la circulacion de musicos y proyectos musicales de la ciudad',
    '2026-01-01', '2026-12-31', 'activo', 14)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-14-M1', 'Recitales realizados en el marco del programa', 'cuantitativo', 'recitales', 12, 16, 'trimestral', '2026-12-31', 1),
    (v_py, 'CUL-14-M2', 'Espectadores alcanzados', 'cuantitativo', 'espectadores', 1032, 1800, 'trimestral', '2026-12-31', 2);

  -- ================================================================
  -- PROGRAMA 8: CONOCIENDO LA CIUDAD
  -- (Direccion de Turismo y Cultura — 1 proyecto)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Turismo y Cultura';

  -- CUL-15: Circuitos turisticos
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-15', 'Circuitos Turísticos',
    'Fortalecer la identidad cultural y patrimonial de la ciudad a traves del diseno e implementacion de recorridos turisticos que pongan en valor su historia, espacios emblematicos y expresiones culturales',
    'Acercar a vecinos y visitantes al patrimonio material e inmaterial de San Miguel de Tucuman dinamizando la actividad turistica y cultural y consolidando los circuitos como herramienta de difusion, educacion patrimonial y promocion del turismo urbano',
    '2026-01-01', '2026-12-31', 'activo', 15)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-15-M1', 'Circuitos turisticos activos durante 2026', 'cuantitativo', 'circuitos', 7, 10, 'trimestral', '2026-12-31', 1),
    (v_py, 'CUL-15-M2', 'Participantes alcanzados por los circuitos', 'cuantitativo', 'participantes', 13039, 10000, 'trimestral', '2026-12-31', 2);

  -- ================================================================
  -- PROGRAMA 9: CONOCIENDO NUESTRA HISTORIA Y CULTURA
  -- (Direccion de Turismo y Cultura — 2 proyectos)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Turismo y Cultura';

  -- CUL-16: Actividades teatralizadas
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-16', 'Actividades Teatralizadas',
    'Fortalecer la identidad cultural y patrimonial de la ciudad mediante obras teatrales que recuperan y recrean episodios, personajes y relatos vinculados a la historia local',
    'Acercar la historia y la cultura de San Miguel de Tucuman a vecinos y visitantes de manera accesible y participativa promoviendo el conocimiento, la apropiacion y la valorizacion del patrimonio cultural desde una experiencia artistica',
    '2026-01-01', '2026-12-31', 'activo', 16)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-16-M1', 'Funciones teatralizadas realizadas', 'cuantitativo', 'funciones', 3, 12, 'trimestral', '2026-12-31', 1),
    (v_py, 'CUL-16-M2', 'Espectadores alcanzados', 'cuantitativo', 'espectadores', 825, 1500, 'trimestral', '2026-12-31', 2);

  -- CUL-17: Identidad tucumana (Gastronomia y Danza)
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-17', 'Identidad Tucumana (Gastronomía y Danza)',
    'Fortalecer la identidad cultural y patrimonial de la ciudad mediante actividades publicas que ponen en valor las expresiones tradicionales de la danza folclorica y la gastronomia con identidad tucumana',
    'Promover el reconocimiento de las tradiciones locales, fomentar la participacion ciudadana y generar espacios de encuentro que revaloricen las practicas culturales como parte esencial de la identidad y la vida cultural',
    '2026-01-01', '2026-12-31', 'activo', 17)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-17-M1', 'Actividades de identidad tucumana realizadas', 'cuantitativo', 'actividades', 18, 20, 'trimestral', '2026-12-31', 1),
    (v_py, 'CUL-17-M2', 'Asistentes a las actividades', 'cuantitativo', 'asistentes', 2288, 2200, 'trimestral', '2026-12-31', 2);

  -- ================================================================
  -- PROGRAMA 10: CULTURA, MEMORIA Y DERECHOS HUMANOS
  -- (Subsecretaria de Cultura — multidireccion, 2 proyectos)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Cultura';

  -- CUL-18: Circuito de la Memoria - Historia de los trabajadores
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-18', 'Circuito de la Memoria — Historia de los Trabajadores',
    'Despertar el interes por la historia y la memoria colectiva vinculada al cierre de los ingenios azucareros y a los procesos de organizacion de los trabajadores reconociendolos como parte central de la identidad del territorio',
    'Recuperar, visibilizar y poner en valor las memorias obreras promoviendo la reflexion colectiva sobre el pasado productivo y social de la provincia y consolidando la memoria historica como componente fundamental de la cultura y los derechos humanos',
    '2026-04-01', '2026-09-30', 'activo', 18)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-18-M1', 'Salidas del circuito realizadas en 6 meses', 'cuantitativo', 'salidas', 0, 24, 'mensual', '2026-09-30', 1),
    (v_py, 'CUL-18-M2', 'Asistentes alcanzados por el circuito', 'cuantitativo', 'asistentes', 0, 600, 'mensual', '2026-09-30', 2);

  INSERT INTO hito (proyecto_id, nombre, fecha_esperada, obligatorio, orden) VALUES
    (v_py, 'Lanzamiento del Circuito de la Memoria', '2026-04-30', true, 1),
    (v_py, 'Cierre del ciclo de salidas (mes 6)', '2026-09-30', true, 2);

  -- CUL-19: Ciclo de formacion docente sobre cultura, memoria y DDHH
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-19', 'Ciclo de Formación Docente sobre Cultura, Memoria y Derechos Humanos',
    'Implementar una propuesta integral de formacion docente orientada a la creacion de dispositivos culturales y artisticos vinculados a la memoria y los derechos humanos',
    'Fortalecer las capacidades pedagogicas de docentes del area artistica mediante enfoques que articulen cultura, memoria y derechos humanos consolidando dispositivos aplicables en distintos espacios y escuelas de la ciudad',
    '2026-03-01', '2026-12-31', 'activo', 19)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-19-M1', 'Docentes capacitados durante 2026', 'cuantitativo', 'docentes', 0, 80, 'trimestral', '2026-12-31', 1),
    (v_py, 'CUL-19-M2', 'Escuelas alcanzadas por la formacion', 'cuantitativo', 'escuelas', 0, 30, 'trimestral', '2026-12-31', 2);

  -- ================================================================
  -- PROGRAMA 11: MI CIUDAD EN MURAL
  -- (Subsecretaria de Cultura — multidireccion, 1 proyecto)
  -- ================================================================
  SELECT id INTO v_unidad FROM unidad_organizacional WHERE nombre_corto = 'Cultura';

  -- CUL-20: Mi Ciudad en Mural
  INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, objetivo, fecha_inicio, fecha_fin, estado, orden)
  VALUES (v_periodo, v_unidad, 'CUL-20', 'Mi Ciudad en Mural',
    'Implementar una propuesta integral de produccion mural en la via publica articulando memoria, cultura y territorio como dispositivo artistico colectivo de la ciudad',
    'Construir colectivamente un dispositivo artistico que dialogue con las memorias locales incorporando aportes y experiencias de las comunidades educativas y consolidando herramientas culturales aplicables en distintos territorios',
    '2026-01-01', '2026-12-31', 'activo', 20)
  RETURNING id INTO v_py;

  INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, unidad_medida, valor_linea_base, valor_meta, frecuencia_medicion, fecha_limite, orden) VALUES
    (v_py, 'CUL-20-M1', 'Murales producidos durante 2026', 'cuantitativo', 'murales', 0, 50, 'trimestral', '2026-12-31', 1);

END;
$$;

COMMIT;

# Procesamiento del POA 2026 - Secretaria General
## Documento de Trabajo para Importacion a Supabase

**Fecha de procesamiento:** 13 de abril de 2026
**Fuente:** SECRETARIA GENERAL_POA 2026 (3).pdf (67 paginas)
**Periodo:** Plan Operativo Anual 2026

---

## A. Resumen Ejecutivo del Procesamiento

### Organizacion del PDF

El documento sigue una estructura jerarquica:
1. **Secretaria General** (pagina de mision, pag 4)
2. **Subsecretarias** como encabezados de nivel 1 (2 identificadas)
3. **Direcciones** como encabezados de nivel 2 (10 identificadas)
4. **Proyectos** numerados dentro de cada direccion
5. Dentro de cada proyecto: descripcion, periodo, linea de base, metas, hitos, verificacion

### Subsecretarias identificadas
1. Subsecretaria de Desarrollo Humano (pag 5-49)
2. Subsecretaria de Gestion Estrategica y Documentacion (pag 50-67)

### Direcciones identificadas

**Bajo Subsecretaria de Desarrollo Humano:**
1. Direccion de Asistencia Publica (7 proyectos, pag 5-10)
2. Direccion de CIM CEA (4 proyectos + agenda, pag 10-13)
3. Direccion de Tartamudez (3 proyectos, pag 13-15)
4. Direccion de Salud (10 proyectos, pag 15-19)
5. Direccion de Educacion (7 proyectos + banco de ideas, pag 19-26)
6. Direccion de Ninez y Juventud (20+ proyectos + campanas, pag 27-33)
7. Direccion de Genero y Diversidad (3 proyectos + agenda anual, pag 37-40)
8. Direccion de Adultos Mayores (13+ proyectos + banco de ideas, pag 41-46)
9. Direccion de Poblacion Animal (5 proyectos, pag 47-49)

**Bajo Subsecretaria de Gestion Estrategica y Documentacion:**
10. Direccion de Documentacion Estrategica (15 proyectos + tareas permanentes + banco de ideas, pag 50-58)
11. Direccion de Planificacion Estrategica (8 proyectos, pag 59-62)
12. Direccion de Gerencia de Datos (11 proyectos, pag 62-67)

### Nivel de homogeneidad: HETEROGENEO

El PDF presenta **alta heterogeneidad** entre direcciones:

| Aspecto | Patron observado |
|---|---|
| **Etiqueta de tipo** | La mayoria tiene badge CUANTITATIVO, MIXTO, CUALITATIVO y/o HITO. Algunas direcciones no los usan (algunos proyectos de la Agenda CIM CEA, eventos de Genero) |
| **Linea de base** | Varía: numeros concretos (32.490 consultas), porcentajes (33% ausentismo), textuales (guardia 24hs funcionando desde 2024), o "no aplica" |
| **Metas** | Desde metas muy precisas (reducir de 20 a 17 dias) hasta metas puramente narrativas (consolidar el programa) |
| **Hitos** | Algunos proyectos tienen hitos con fechas exactas, otros dicen "fecha a definir", otros no tienen |
| **Verificacion** | Varía: informes mensuales, trimestrales, anuales, registros, actas, o no se menciona |
| **Granularidad** | Algunas areas presentan 1-2 proyectos con muchas metas; otras presentan 15+ micro-proyectos con 1 meta cada uno |

### Principales problemas de normalizacion

1. **Eventos como proyectos:** Muchas direcciones (CIM CEA, Genero, Adultos Mayores, Ninez) listan eventos puntuales (ej: "Dia Mundial del Sindrome de Down") como "proyectos" individuales. Estos son realmente hitos dentro de una agenda anual.

2. **Banco de Ideas:** Educacion, Adultos Mayores y Documentacion Estrategica incluyen secciones de "Banco de Ideas" — propuestas exploratorias sin metas, sin plazos, sin linea de base. NO son proyectos ejecutables del POA.

3. **Tareas permanentes:** Documentacion Estrategica tiene una seccion de "Tareas adicionales permanentes" que no son proyectos sino funciones ordinarias.

4. **Metas que son actividades:** Muchas "metas" son en realidad descripciones de actividades (ej: "implementar la gestion diferenciada de residuos durante los 12 meses"). No tienen valor numerico claro.

5. **Lineas de base textuales:** ~30% de las lineas de base son narrativas (no numericas). Necesitan decision: convertir a texto en metadata o intentar extraer numero.

6. **Tipo mixto ambiguo:** Muchos proyectos marcados como MIXTO combinan una meta cuantitativa con una narrativa de consolidacion. El "tipo" real depende de la meta, no del proyecto.

7. **Fechas imprecisas:** Muchos hitos dicen "mes de X, dia a definir" o "fecha a confirmar". Se pueden normalizar como fecha de mes sin dia exacto.

---

## B. Estructura Organizacional Extraida

### Arbol jerarquico real (para tabla unidad_organizacional)

```
Secretaria General (nivel 0)
  Dr. Rodrigo Gomez Tortosa
  |
  +-- Subsecretaria de Desarrollo Humano (nivel 1)
  |     (responsable: no especificado en PDF)
  |     |
  |     +-- Dir. de Asistencia Publica (nivel 2)
  |     +-- Dir. de CIM CEA (nivel 2)
  |     +-- Dir. de Tartamudez (nivel 2)
  |     +-- Dir. de Salud (nivel 2)
  |     +-- Dir. de Educacion (nivel 2)
  |     +-- Dir. de Ninez y Juventud (nivel 2)
  |     +-- Dir. de Genero y Diversidad (nivel 2)
  |     +-- Dir. de Adultos Mayores (nivel 2)
  |     +-- Dir. de Poblacion Animal (nivel 2)
  |
  +-- Subsecretaria de Gestion Estrategica y Documentacion (nivel 1)
        Mg. Humberto Ponce de Leon
        |
        +-- Dir. de Documentacion Estrategica (nivel 2)
        +-- Dir. de Planificacion Estrategica (nivel 2)
        +-- Dir. de Gerencia de Datos (nivel 2)
```

**Nota:** La Subsecretaria de Gestion Estrategica y Documentacion tiene nombre de su responsable en pag 3. La de Desarrollo Humano no tiene nombre explicito en el PDF.

---

## C. Criterios de Normalizacion Aplicados

### C1. Que se importa como proyecto

- Todo lo que tiene etiqueta de tipo (CUANTITATIVO/MIXTO/CUALITATIVO/HITO)
- Todo lo que tiene descripcion, periodo de trabajo y al menos una meta

### C2. Que NO se importa como proyecto

- **Banco de Ideas**: se excluyen (sin metas, sin plazos). Se documenta como referencia.
- **Tareas permanentes**: se excluyen (funciones ordinarias, no proyectos POA).
- **Eventos sueltos sin meta**: eventos con solo fecha y actividad (ej: "Dia Internacional de X - Fecha: 17 mayo") se agrupan como hitos de un proyecto-agenda. No se crean como proyectos individuales.

### C3. Agrupacion de micro-eventos

Las siguientes direcciones listan muchos eventos puntuales como "proyectos" individuales. Se los agrupa en un proyecto-agenda:

- **CIM CEA Agenda Casa Azul**: Proyectos 6-18 → 1 proyecto "Agenda Anual Casa Azul" con hitos por evento
- **Genero Agenda Anual**: Proyectos 4-16 → 1 proyecto "Agenda Anual de Genero" con hitos por fecha conmemorativa
- **Adultos Mayores Calendario**: Proyectos 8-13 → 1 proyecto "Calendario Anual de Adultos Mayores" con hitos por evento
- **Documentacion Estrategica Extension**: Proyectos 10-15 → 1 proyecto "Agenda de Extension Comunitaria" con hitos por evento
- **Ninez Campanas**: Proyectos 6-13 → 1 proyecto "Campanas de Prevencion en Espacios Publicos" con hitos

### C4. Tipo de medicion

Se respeta la etiqueta del PDF cuando existe. Se clasifica por meta, no por proyecto:

| Etiqueta PDF | Tipo en BD | Criterio |
|---|---|---|
| CUANTITATIVO | cuantitativo | Tiene valor numerico: base → meta |
| CUALITATIVO | cualitativo | Escala o estado narrativo |
| MIXTO | mixto (varía por meta) | Cada meta se clasifica individualmente |
| HITO | hito_unico o hito del proyecto | Evento binario con fecha |
| Sin etiqueta | inferido | Se clasifica segun contenido |

---

## D. Dataset Estructurado: Proyectos

### Columnas de la tabla intermedia de proyectos

| Columna | Descripcion | Mapea a BD |
|---|---|---|
| id_temp | Identificador temporal (DIR-NN) | - |
| subsecretaria | Subsecretaria padre | unidad_organizacional (nivel 1) |
| direccion | Direccion responsable | unidad_organizacional (nivel 2) |
| num_pdf | Numero del proyecto en el PDF | metadata |
| nombre | Nombre del proyecto | proyecto.nombre |
| tipo_pdf | Etiqueta de tipo del PDF | informativo (el tipo real va en meta) |
| descripcion | Descripcion/objetivo (resumen) | proyecto.descripcion |
| periodo_inicio | Mes de inicio | proyecto.fecha_inicio |
| periodo_fin | Mes de fin | proyecto.fecha_fin |
| estado_sugerido | activo/borrador | proyecto.estado |

### Dataset de proyectos (total: ~70 proyectos reales + ~5 agendas agrupadas)

#### Dir. de Asistencia Publica (7 proyectos)

| id_temp | nombre | tipo_pdf | periodo | linea_base_resumen |
|---|---|---|---|---|
| AP-01 | Fortalecimiento de la Guardia Medica 24 hs | MIXTO | ene-dic | Guardia 24hs desde abr 2024 |
| AP-02 | Reduccion del tiempo de espera en Consultorios Externos | MIXTO | ene-dic | 32.490 consultas; 33% ausentismo; 20 dias espera; 65% pac. cronicos con seguimiento |
| AP-03 | Piso de Atencion de la Mujer | MIXTO | ene-dic | 12.562 atenciones gineco/psico/nutricion |
| AP-04 | Laboratorio - Implementacion de Equipamiento de Hormonas | CUANTITATIVO | ene-dic | No aplica (equipamiento nuevo) |
| AP-05 | Traslados en Ambulancia a Centros de Mayor Complejidad | MIXTO | ene-dic | Tiempo respuesta: 1h 30min |
| AP-06 | Implementacion de Hospital Verde | MIXTO | ene-dic | Datos de residuos/energia/agua en Informe Emergencia Sanitaria |
| AP-07 | Plan de Certificacion de Normas de Calidad | MIXTO | ene-nov | No aplica |

#### Dir. de CIM CEA (4 proyectos + 1 agenda)

| id_temp | nombre | tipo_pdf | periodo | linea_base_resumen |
|---|---|---|---|---|
| CEA-01 | Disminuir los tiempos de espera para la generacion de diagnosticos | CUANTITATIVO | ene-dic | 60 dias de espera |
| CEA-02 | Acompanamiento a familias en lista de espera | CUANTITATIVO | ene-dic | 150 familias en lista |
| CEA-03 | Presencia territorial del CIM CEA | CUANTITATIVO | ene-dic | No aplica |
| CEA-04 | Intervencion centrada en la familia en territorio | CUANTITATIVO | ene-dic | No aplica |
| CEA-05 | Talleres Verano Azul | CUANTI+HITO | ene-feb | 450 ninos/mes (2025) |
| CEA-AG | Agenda Anual Casa Azul (agrupacion de 13 eventos) | HITOS | ene-dic | - |

#### Dir. de Tartamudez (3 proyectos)

| id_temp | nombre | tipo_pdf | periodo | linea_base_resumen |
|---|---|---|---|---|
| TAR-01 | Efemerides y otros eventos | CUANTI+HITO | mar-dic | 10 jornadas en 2025 |
| TAR-02 | Grupos de Ayuda Mutua (G.A.M.) | MIXTO | may-dic | 43 grupos en 2025 |
| TAR-03 | Atencion por Area | CUANTITATIVO | may-dic | Fono: 803, Psicopedag: 236, Psico: 507, TO: 152 atenciones |

#### Dir. de Salud (10 proyectos)

| id_temp | nombre | tipo_pdf | periodo | linea_base_resumen |
|---|---|---|---|---|
| SAL-01 | Peatonal Saludable (Mendoza y Munecas) | CUANTITATIVO | mar-dic | 700 intervenciones en 2025 |
| SAL-02 | Trailer Integral de la Mujer | CUANTITATIVO | mar-dic | 600 controles + 410 ecografias en 2025 |
| SAL-03 | Trailer SMT Somos Mas en Territorio | CUANTITATIVO | mar-dic | 4 operativos mensuales en 2025 |
| SAL-04 | Capacitacion en RCP y uso del DEA | CUANTITATIVO | mar-nov | 20 capacitaciones en 2025 |
| SAL-05 | Cuidamos tu Salud (comercios centro SMT) | CUANTITATIVO | mar-nov | 120 trabajadores en 2025 |
| SAL-06 | Reordenamiento del programa Eco Lentes | CUANTITATIVO | mar-dic | 3.500 eco-lentes entregados en 2025 |
| SAL-07 | Capacitacion al Personal de la Dir. de Salud | CUANTITATIVO | mar-nov | 15 capacitaciones en 2025 |
| SAL-08 | Capacitacion coordinada con Sistema Provincial de Salud | CUANTITATIVO | mar-nov | 10 capacitaciones en 2025 |
| SAL-09 | Programa Que te piquen las ganas de prevenir el dengue | CUANTITATIVO | mar-dic | 400 repelentes en 2025 |
| SAL-10 | Programa la salud bucal en las escuelas | CUANTITATIVO | mar-dic | 16 intervenciones/mes, 2.147 ninos en 2025 |

#### Dir. de Educacion (7 proyectos)

| id_temp | nombre | tipo_pdf | periodo | linea_base_resumen |
|---|---|---|---|---|
| EDU-01 | Lanzamiento del PIEM (Programa de Inclusion Escolar Municipal) | CUALI+HITO | feb-dic | Experiencias de inclusion sin marco normativo unificado |
| EDU-02 | SER DOCENTE | MIXTO+HITO | feb-dic | 8 jornadas, 1.258 docentes participantes |
| EDU-03 | Fortalecimiento del DIEM | CUALITATIVO | feb-dic | Gabinetes psicopedagogicos existentes |
| EDU-04 | Colonia de Vacaciones "Verano en mi Querida Ciudad" | CUANTI+HITO | ene-feb | 150 inscriptos en 2025 |
| EDU-05 | Circuito de las Infancias | CUANTI+HITO | ene-dic | 2.000 participantes en 2025 |
| EDU-06 | La escuela cerca de la familia | CUALITATIVO | ene-dic | Programa desde 2024 |
| EDU-07 | Estudiantes Protagonistas de la Ciudad | MIXTO+HITO | ene-dic | 7.425 estudiantes en 2025 |

#### Dir. de Ninez y Juventud (8 proyectos + 1 agenda campanas + CDI)

| id_temp | nombre | tipo_pdf | periodo | linea_base_resumen |
|---|---|---|---|---|
| NIJ-01 | Lanzamiento del Polo de las Infancias | MIXTO+HITO | ene-dic | No aplica (Ord. 5436/2025) |
| NIJ-02 | Evento Dia del Nino | CUANTI+HITO | may-ago | 35.000 personas en 2025 |
| NIJ-03 | Evento Expo Juventud | MIXTO+HITO | jul-sep | 500 jovenes en 2025 |
| NIJ-04 | Lanzamiento Club de la Aventura | CUANTI+HITO | ene-feb | 50 ninos en 2025 |
| NIJ-05 | Lanzamiento del Autobus de la Aventura | CUANTI+HITO | dic2025-mar | No aplica |
| NIJ-AG | Campanas de Prevencion en Espacios Publicos (agrupacion 8 campanas) | - | mar-dic | Campanas desde 2024 |
| NIJ-14 | Talleres Anuales | CUANTI+HITO | abr-jun | - |
| NIJ-15 | Escucha psicologicas | MIXTO | ene-dic | 86 escuchas a 58 personas |
| NIJ-16 | A vos te paso? Salud mental ninez y adolescencia | MIXTO+HITO | mar-dic | 2 presentaciones, ~300 asistentes |
| NIJ-17 | Prevencion y abordaje de la ludopatia | MIXTO+HITO | ene-dic | 500 adolescentes + 800 estudiantes |
| NIJ-18 | Consejeria Sexual - Salud sexual y reproductiva | MIXTO | ene-dic | 1.165 personas en 2025 |
| NIJ-19 | Escuela de Padres - CDI | CUANTI+HITO | mar-nov | 35+45+20 familias en 3 CDI |
| NIJ-20 | Capacitacion Continua para Promotores de Sala | CUANTI+HITO | feb-oct | 11 instancias, 10 promotores, 3 coordinadores |

#### Dir. de Genero y Diversidad (3 proyectos + 1 agenda)

| id_temp | nombre | tipo_pdf | periodo | linea_base_resumen |
|---|---|---|---|---|
| GEN-01 | Primera Feria Municipal de Diversidad e Inclusion | CUALI+HITO | mar-nov | Sin antecedentes |
| GEN-02 | Ejecucion de la Ley Micaela | CUANTITATIVO | mar-jul | 30 agentes/mes en 2025 |
| GEN-03 | Dia de la Concientizacion sobre Discapacidad | MIXTO+HITO | mar-jul | Campanas previas sin evento unificado |
| GEN-AG | Agenda Anual de Genero, Diversidad e Inclusion (13 fechas conmemorativas) | HITOS | mar-dic | Agenda existente |

#### Dir. de Adultos Mayores (7 proyectos + 1 agenda + banco ideas)

| id_temp | nombre | tipo_pdf | periodo | linea_base_resumen |
|---|---|---|---|---|
| ADM-01 | Talleres anuales para adultos mayores | CUANTI+HITO | mar-dic | 1.600 inscriptos, 11 talleres, 200 promedio diario |
| ADM-02 | Articulacion con Centros de Jubilados | CUANTITATIVO | mar-dic | 35 centros articulados |
| ADM-03 | Fortalecimiento de la Mesa de Gestion Municipal de Personas Mayores | MIXTO | mar-dic | 20 instituciones |
| ADM-04 | PROTAM (Proteccion para Adultos Mayores) | CUANTITATIVO | ene-dic | 20 situaciones intervenidas en 2025 |
| ADM-05 | Abuelazo 2026 | CUANTI+HITO | sep | 4.000 participantes en 2025 |
| ADM-06 | Acto conmemorativo por el Dia del Jubilado | CUANTI+HITO | sep | 1 acto en 2025 |
| ADM-07 | Un jubilado en tu barrio - La voz de la experiencia | MIXTO+HITO | mar-dic | No aplica |
| ADM-AG | Calendario Anual de Actividades (colonia verano, carnaval, maraton, semana lila, semana jubilado, dia madre, cierre) | HITOS | ene-dic | - |

#### Dir. de Poblacion Animal (5 proyectos)

| id_temp | nombre | tipo_pdf | periodo | linea_base_resumen |
|---|---|---|---|---|
| ANI-01 | Nuevo CEMA | CUALI+HITO | ene-abr | CEMA anterior no operativo |
| ANI-02 | Un Vete en tu Barrio - Esterilizaciones en quirofanos moviles | CUANTITATIVO | mar-dic | 2 quirofanos, 300 esterilizaciones/mes |
| ANI-03 | Incorporacion de nuevo quirofano movil de esterilizacion | CUANTI+HITO | ene-dic | 1 quirofano movil |
| ANI-04 | Evento Dia del Animal | CUANTI+HITO | ene-abr | Eventos 2024/2025 |
| ANI-05 | Un hogar para todos (adopcion) | CUANTITATIVO | ene-dic | 12 perros adultos |

#### Dir. de Documentacion Estrategica (9 proyectos + 1 agenda + tareas permanentes)

| id_temp | nombre | tipo_pdf | periodo | linea_base_resumen |
|---|---|---|---|---|
| DOC-01 | Publicacion de programas de gestion municipal pendientes | CUANTI+HITO | ene-mar | 6 documentos pendientes |
| DOC-02 | Publicacion de documentos municipales | CUANTI+HITO | ene-jun | Documentos en proceso |
| DOC-03 | Publicacion del Informe Anual de gestion 2026 | CUANTI+HITO | sep-nov | - |
| DOC-04 | Produccion editorial institucional y libros municipales | CUANTI+HITO | ene-dic | 21 publicaciones ISBN en 2025 |
| DOC-05 | Publicacion del libro "Del relato al dato" | CUANTI+HITO | ene-jun | No aplica |
| DOC-06 | Publicaciones editoriales para infancias | CUANTI+HITO | ene-jun | - |
| DOC-07 | Diagramacion y tramite ISBN | CUANTITATIVO | ene-dic | 21 publicaciones ISBN |
| DOC-08 | Produccion de audiolibros y publicaciones epub | CUANTI+HITO | ene-dic | 3 audiolibros + 7 epub |
| DOC-09 | Actualizacion en promocion de la lectura y bibliotecas contemporaneas | CUANTITATIVO | jun-jul | - |
| DOC-AG | Agenda de Extension Comunitaria (inauguracion biblioteca, mes mujer, dia libro, mes lector, mes cuidado mujer, navidad) | HITOS | feb-dic | - |

#### Dir. de Planificacion Estrategica (8 proyectos)

| id_temp | nombre | tipo_pdf | periodo | linea_base_resumen |
|---|---|---|---|---|
| PLE-01 | Discurso de Apertura de Sesiones Ordinarias | CUANTI+HITO | ene-feb | 2 discursos (2024, 2025) |
| PLE-02 | Informe ambiental para el Concejo Deliberante | CUANTI+HITO | trimestral | Informes desde 2024 |
| PLE-03 | Sistema de planificacion municipal | CUANTI+HITO | ene-dic | Sin linea de base |
| PLE-04 | Planificaciones Operativas Anuales (POA) | CUANTITATIVO | sep-nov | POS Jul-Dic 2026 |
| PLE-05 | Calendario Interactivo de Hitos de Gestion Municipal | CUANTITATIVO | ene-dic | Sin linea de base |
| PLE-06 | Informes trimestrales de avance y resultados | CUANTITATIVO | ene-dic | Sin linea de base |
| PLE-07 | Plan de capacitaciones | CUANTI+HITO | abr-oct | Sin linea de base |
| PLE-08 | Desarrollo de un banco de ideas para el municipio | CUANTITATIVO | ene-dic | Sin linea de base |

#### Dir. de Gerencia de Datos (11 proyectos)

| id_temp | nombre | tipo_pdf | periodo | linea_base_resumen |
|---|---|---|---|---|
| DAT-01 | Congreso de Datos | MIXTO+HITO | ene-sep | No aplica |
| DAT-02 | Manual institucional del uso de datos del Portal | CUANTI+HITO | ene-abr | No aplica |
| DAT-03 | Campana de promocion y capacitacion del Portal de Datos | CUANTITATIVA | ene-dic | Clinicas informativas sin capacitaciones sistematicas |
| DAT-04 | Ecosistema de Datos Abiertos - Integracion colaborativa | MIXTO | ene-may | No aplica |
| DAT-05 | Realizacion de informes trimestrales sobre eficiencia de datos | CUALITATIVO | ene-dic | No aplica |
| DAT-06 | Videos de novedades para redes y Portal de Datos | CUANTITATIVO | feb-dic | No aplica |
| DAT-07 | Actualizacion y mejora del Portal de Datos | MIXTO+HITO | ene-dic | Portal con estructura de cierre 2025 |
| DAT-08 | Automatizacion de la actualizacion de la base de datos | MIXTO+HITO | ene-feb | 35 tableros actualizados manualmente |
| DAT-09 | Calendarizacion de capacitaciones y reuniones con Gerentes de Datos | CUANTI+HITO | feb-dic | Reuniones trimestrales en 2025 |
| DAT-10 | Hoja de datos relevantes - automatizacion y publicacion periodica | CUANTITATIVO | ene-dic | Hoja diaria interna, sin publicacion semanal |
| DAT-11 | Modificacion estrategica de tableros | CUANTI+HITO | ene-dic | 35 tableros activos |

---

## E. Registro de Ambiguedades y Decisiones

### E1. Decisiones de normalizacion tomadas

| Decision | Justificacion |
|---|---|
| Agrupar micro-eventos en agendas | Eventos con solo fecha y actividad no son proyectos medibles. Se agrupan en 1 proyecto-agenda con hitos |
| Excluir Banco de Ideas | Son propuestas exploratorias sin compromiso de ejecucion. Se documentan como referencia |
| Excluir Tareas Permanentes | Son funciones ordinarias, no proyectos POA |
| Respetar tipo_pdf como informativo | El tipo real se determina meta por meta al normalizar |
| Lineas de base textuales: conservar como texto | No forzar a numero cuando no existe un valor claro |
| Metas sin valor numerico: marcar como cualitativas | Cuando la meta dice "consolidar", "sostener", "fortalecer" sin numero, es cualitativa |

### E2. Casos que requieren validacion humana

| Caso | Descripcion | Accion sugerida |
|---|---|---|
| **Responsable Subsec. Desarrollo Humano** | El PDF no identifica al subsecretario. Solo nombra al Secretario General y al de Gestion Estrategica | Confirmar nombre con el area |
| **Eventos de Ninez sin meta** | Campanas preventivas (proy 6-13) solo tienen fecha y actividad. Sin meta medible | Confirmar si se miden de alguna forma |
| **Talleres Anuales Ninez (proy 14)** | Tiene metas por taller individual (belleza: 50, teatro: 50, empleo joven: 80, artesanias: 30, pasteleros: 60). Son sub-metas | Confirmar si se cargan como metas separadas o una global |
| **Dir. Educacion - Banco de Ideas** | 3 propuestas (Intensificacion Ingles, Ensenanzas Maestras, Ausentismo Cero) sin estructura de proyecto | Confirmar si se excluyen del POA o se incluyen como borrador |
| **Documentacion Estrategica - Produccion editorial sin meta cerrada (proy 4)** | Explicita: "No se establece una meta numerica cerrada" | Modelar como cualitativo? |
| **CDI / Ninez - multiples sedes** | Escuela de Padres tiene metas por CDI individual (Adolfo de la Vega: 35, Vial III: 45, Chanaritos: 20→45). Son sub-metas por sede | Decidir si se cargan 3 metas o 1 global |

### E3. Patrones detectados

| Patron | Frecuencia | Ejemplo |
|---|---|---|
| **Meta = cantidad de actividades por mes * meses** | ~40% de proyectos cuanti | "4 operativos mensuales entre marzo y noviembre" = 36 total |
| **Meta = sostener o superar linea de base + %** | ~20% | "superar en un 20% las 700 intervenciones de 2025" |
| **Meta = lograr evento + participantes** | ~15% | "concurrencia de 38.000 personas" |
| **Meta narrativa de consolidacion** | ~15% | "consolidar el funcionamiento del DIEM" |
| **Meta hito binario** | ~10% | "publicar el libro hasta junio" |
| **Verificacion por informe** | ~80% | "informe trimestral/anual/mensual" |
| **Frecuencia mensual** | ~50% | Registros mensuales |
| **Frecuencia trimestral** | ~30% | Informes trimestrales |
| **Frecuencia semestral/anual** | ~20% | Informes semestrales o anuales |

---

## F. Estadisticas del Procesamiento

| Metrica | Valor |
|---|---|
| Paginas procesadas | 67 |
| Subsecretarias identificadas | 2 |
| Direcciones identificadas | 12 |
| Proyectos individuales extraidos | ~75 |
| Agendas agrupadas creadas | 5 |
| Proyectos importables estimados | ~80 |
| Banco de Ideas (excluidos) | ~6 propuestas |
| Tareas permanentes (excluidas) | 2 bloques |
| Metas estimadas totales | ~150-180 |
| Hitos estimados totales | ~60-80 |
| Proyectos con linea de base numerica | ~45% |
| Proyectos con linea de base textual | ~25% |
| Proyectos sin linea de base | ~30% |
| Proyectos con hitos con fecha | ~40% |
| Proyectos con hitos sin fecha definida | ~25% |

---

## G. Recomendaciones para Siguiente Etapa

### G1. Pasos para la importacion

1. **Limpiar el seed actual**: Borrar los datos de prueba del seed representativo
2. **Importar unidades organizacionales**: 1 secretaria + 2 subsecretarias + 12 direcciones = 15 unidades
3. **Importar proyectos**: ~80 proyectos con nombre, descripcion, periodo, unidad, tipo_pdf en metadata
4. **Importar metas**: Descomponer cada proyecto en sus metas individuales, con tipo_medicion correcto
5. **Importar hitos**: Solo los que tienen fecha (aunque sea mes aproximado)
6. **NO importar avances**: No hay avances reales todavia (el POA es planificacion, no ejecucion)

### G2. Campos que requieren revision manual antes de cargar

- Nombres de responsables de cada unidad
- Subsecretario de Desarrollo Humano
- Fechas exactas de hitos marcados como "a definir"
- Decision sobre CDI por sede vs. meta global
- Decision sobre Talleres Anuales Ninez por taller vs. global
- Validacion de exclusion de Banco de Ideas y Tareas Permanentes

### G3. Formato sugerido para el SQL de importacion

Se recomienda un script SQL similar al seed actual pero con datos reales:
1. DO block con variables para cada unidad
2. Proyectos por direccion
3. Metas por proyecto (tipo_medicion correcto)
4. Hitos por proyecto (fecha_esperada donde exista)
5. Sin avances (se cargan operativamente despues)

---

*Documento generado a partir del procesamiento completo del PDF del POA 2026. Requiere validacion humana antes de la importacion final.*

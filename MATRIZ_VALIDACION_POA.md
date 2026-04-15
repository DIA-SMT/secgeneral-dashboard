# Matriz de Validacion Ejecutiva — POA 2026
## Decisiones pendientes antes de la importacion a Supabase

**Fecha:** 13 de abril de 2026
**Documento fuente:** POA_2026_PROCESAMIENTO.md, Seccion E
**Proposito:** Cerrar criterios de normalizacion antes de generar el SQL de importacion real.

---

## Matriz de Decisiones

| ID | Tema | Que se detecto en el PDF | Criterio provisional aplicado | Alternativas | Impacto en BD / Dashboard | Riesgo si no se valida | Recomendacion | Estado |
|---|---|---|---|---|---|---|---|---|
| **D-01** | **Agrupacion de micro-eventos en agendas** | 5 direcciones (CIM CEA, Genero, Adultos Mayores, Ninez, Documentacion) listan eventos puntuales como "proyectos" individuales. Son entre 6 y 18 eventos por direccion con solo fecha y actividad, sin meta medible propia. | Se agruparon en 1 proyecto-agenda por direccion, con cada evento como hito. Reduce ~50 micro-proyectos a 5 proyectos con hitos. | **(A)** Agrupar como se propone (5 agendas). **(B)** Importar cada evento como proyecto individual (infla el dashboard con ~50 proyectos sin progreso medible). **(C)** Excluir los eventos del POA operativo. | Cambia la cantidad total de proyectos de ~130 a ~80. Afecta el % de avance global, la vista por area y la densidad del panel ejecutivo. | Si se importan como proyectos individuales, el dashboard se llena de items sin progreso, el semaforo se distorsiona y la vision ejecutiva pierde utilidad. | **(A)** Agrupar. Es el criterio mas limpio para el dashboard y no pierde trazabilidad (los eventos quedan como hitos). | **Critico** |
| **D-02** | **Exclusion del Banco de Ideas** | Educacion (3 propuestas: Intensificacion Ingles, Ensenanzas Maestras, Ausentismo Cero), Adultos Mayores (1: Reconocimiento a Jubilados) y Documentacion Estrategica (3: Editoriales Locales, Concurso Cuentos, Rediseno Biblioteca Digital) son "bancos de ideas". No tienen metas, plazos, linea de base ni compromiso de ejecucion. | Excluidos de la importacion POA. Se documentan como referencia en el procesamiento. | **(A)** Excluir (no son proyectos ejecutables). **(B)** Importar como proyectos en estado "borrador" sin metas. **(C)** Crear una categoria "idea" en el modelo. | Si se excluyen, no aparecen en el dashboard. Si se incluyen como borrador, suman ruido visual sin posibilidad de seguimiento. | Bajo. No afectan metas ni avances. Si alguien pregunta por ellas, se puede consultar el PDF. | **(A)** Excluir. Si alguna se concreta durante el anio, se carga como proyecto nuevo. | **Recomendado** |
| **D-03** | **Metas por sede (CDI Escuela de Padres)** | El proyecto Escuela de Padres (Ninez, proy 19) define metas diferenciadas por CDI: Adolfo de la Vega (sostener 35 familias), Vial III (sostener 45), Chanaritos (incrementar de 20 a 45). Son 3 valores objetivo distintos con 3 lineas de base distintas. | Pendiente: no se tomo decision. | **(A)** Importar como 3 metas separadas (una por CDI), cada una cuantitativa. **(B)** Importar como 1 meta global (total: 125 familias entre los 3 CDI). **(C)** 1 meta global + detalle por sede en metadata JSONB. | Con 3 metas, el dashboard muestra granularidad por sede. Con 1 meta global, se pierde la visibilidad por CDI pero se simplifica el seguimiento. | Si se elige 1 meta global y despues el area reporta por sede, hay que reestructurar. Si se eligen 3 metas, el formulario de carga es mas detallado. | **(A)** 3 metas separadas. Es mas preciso, permite seguimiento real por sede, y el dashboard esta preparado para mostrarlo. La carga adicional es minima (3 filas en vez de 1). | **Critico** |
| **D-04** | **Talleres Anuales Ninez con sub-metas por taller** | El proyecto Talleres Anuales (Ninez, proy 14) desglosa 5 talleres con capacidad, linea de base y meta individuales: Belleza (50), Teatro (50), Empleo Joven (80), Artesanias (30), Pasteleros (60). Total: 270 asistentes. | Pendiente: no se tomo decision. | **(A)** 5 metas separadas (una por taller). **(B)** 1 meta global (270 asistentes totales). **(C)** 1 meta global + detalle en metadata. | Mismo impacto que D-03: granularidad vs. simplicidad. | Mismo riesgo que D-03. | **(B)** 1 meta global de 270 asistentes. A diferencia de D-03, los talleres son del mismo tipo y el area probablemente reportara un total, no por taller. El detalle puede vivir en la descripcion de la meta. | **Pendiente** |
| **D-05** | **Produccion editorial sin meta numerica cerrada** | El proyecto Produccion editorial (Documentacion, proy 4) dice textualmente: "No se establece una meta numerica cerrada, en tanto la produccion depende de la demanda efectiva y los procesos de aprobacion." | Pendiente: se sugirio modelar como cualitativo. | **(A)** Modelar como cualitativo con escala de avance (no iniciado → en produccion → publicaciones en curso → cierre anual). **(B)** Usar la linea de base (21 publicaciones ISBN en 2025) como referencia y marcar como cuantitativo abierto. **(C)** Excluir de la medicion cuantitativa y registrar solo hitos de publicacion. | Si es cualitativo, el dashboard muestra un estado narrativo. Si es cuantitativo abierto, no hay barra de progreso (sin valor meta, no hay porcentaje). | Bajo. Es un caso excepcional. Pero si se ignora, queda una meta sin posibilidad de mostrar avance en el dashboard. | **(C)** Hitos por publicacion. Cada libro publicado es un hito. La meta del proyecto es completar la agenda editorial. Es el modelo mas honesto con la naturaleza del trabajo. | **Pendiente** |
| **D-06** | **Responsable de la Subsecretaria de Desarrollo Humano** | El PDF identifica al Secretario General (Dr. Rodrigo Gomez Tortosa) y al Subsecretario de Gestion Estrategica (Mg. Humberto Ponce de Leon). No menciona al responsable de la Subsecretaria de Desarrollo Humano, que agrupa 9 de las 12 direcciones. | Se dejo el campo `responsable_nombre` vacio para esa unidad. | **(A)** Dejarlo vacio y completar despues. **(B)** Consultar al area antes de importar. | El dashboard muestra "Sin responsable" en la card de la subsecretaria mas grande. Visualmente pobre pero no critico para la estructura de datos. | Bajo. No afecta integridad de datos. Solo afecta presentacion. | **(A)** Importar sin responsable. Completar cuando se confirme. No bloquea nada. | **Recomendado** |

---

## A. Decisiones a cerrar ANTES del SQL de importacion

Estas decisiones cambian la estructura del dato y no se pueden revertir facilmente despues:

| Prioridad | ID | Tema | Por que es bloqueante |
|---|---|---|---|
| 1 | **D-01** | Agrupacion de micro-eventos | Define la cantidad real de proyectos (~80 vs ~130) y la integridad del semaforo global |
| 2 | **D-03** | Metas por sede CDI | Define si se crean 3 filas o 1 en la tabla `meta`. Afecta la granularidad del seguimiento |

**Ambas tienen recomendacion clara.** Si se aprueban las recomendaciones, se puede proceder directamente al SQL.

---

## B. Decisiones que pueden postergarse SIN bloquear la importacion inicial

Estas decisiones tienen impacto menor o pueden resolverse con un UPDATE posterior:

| ID | Tema | Por que puede esperar |
|---|---|---|
| **D-02** | Exclusion Banco de Ideas | No genera filas en la BD. Si se decide incluirlos despues, se hace un INSERT. |
| **D-04** | Talleres Anuales por taller vs. global | La recomendacion (1 meta global) es segura como default. Si el area necesita granularidad, se desglosa despues con un simple split de la meta. |
| **D-05** | Editorial sin meta cerrada | Se puede importar como proyecto con hitos y ajustar el tipo de meta despues de la primera ronda de carga de avances. |
| **D-06** | Responsable Subsec. Desarrollo Humano | Es un campo de texto editable. Se completa cuando se confirme. |

---

*Matriz generada para validacion humana. Aprobar D-01 y D-03 habilita la generacion del SQL de importacion completo.*

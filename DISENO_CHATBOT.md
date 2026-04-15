# Diseño del Asistente Conversacional
## Dashboard Ejecutivo — Secretaria General — SMT

**Version:** 1.0 — Blueprint de arquitectura  
**Fecha:** 13 de abril de 2026  
**Estado:** Pre-implementacion  
**Prerequisitos:** webapp funcionando con POA real, carga manual operativa

---

## 1. Vision General

### 1.1 Que es

Un asistente conversacional transaccional integrado dentro del dashboard de la Secretaria General. No es un chatbot generico: es una interfaz conversacional sobre un sistema de datos estructurados, con capacidad de lectura precisa y escritura controlada.

### 1.2 Que resuelve

| Problema actual | Solucion del asistente |
|---|---|
| Para saber que cargar, hay que navegar proyecto por proyecto | El asistente dice "tenes 5 metas pendientes esta semana, empecemos" |
| La carga requiere encontrar el formulario correcto | El usuario describe el avance en texto y el asistente propone la carga |
| Para consultar estado hay que navegar multiples vistas | El usuario pregunta "como esta Salud" y obtiene respuesta inmediata |
| Las areas no saben que les falta actualizar | El asistente genera listas de pendientes priorizadas por area |

### 1.3 Que NO debe hacer

- No debe escribir en la base sin confirmacion explicita del usuario
- No debe inventar datos ni extrapolar valores no reportados
- No debe operar como agente autonomo con acceso libre a la BD
- No debe responder sobre temas fuera del ambito del POA y la webapp
- No debe reemplazar el dashboard ni los formularios: los complementa
- No debe asumir la identidad del usuario ni su area sin que se lo indiquen

---

## 2. Modos Operativos

El asistente tiene internamente cinco estados, aunque el usuario experimenta una conversacion fluida unica.

### 2.1 Modo Consulta (solo lectura)

**Trigger:** el usuario hace una pregunta sobre el estado del POA.

**Comportamiento:**
- Lee de la base de datos via herramientas de consulta
- Responde con datos reales, citando proyecto/meta/hito especificos
- No propone modificaciones
- Puede mostrar listas, resúmenes, conteos

**Ejemplos:**
- "Cuantos proyectos tiene la Direccion de Salud?"
- "Que hitos se vencen en abril?"
- "Como esta el proyecto de Gobierno Abierto?"

### 2.2 Modo Pendientes (lectura + priorizacion)

**Trigger:** el usuario pregunta que debe cargar, que esta pendiente, o que le falta.

**Comportamiento:**
- Identifica el area del usuario (por contexto de pagina, seleccion previa, o pregunta explicita)
- Consulta metas sin actualizacion reciente, hitos proximos, metas con seguimiento vencido
- Ordena por prioridad (vencidos > proximos > sin reporte)
- Presenta lista accionable
- Puede ofrecer iniciar la carga guiada

**Ejemplos:**
- "Que tengo que cargar esta semana?"
- "Que metas de mi area no tienen reporte?"
- "Hay algo urgente en Gerencia de Datos?"

### 2.3 Modo Propuesta de Carga (interpretacion + armado)

**Trigger:** el usuario describe un avance en lenguaje natural.

**Comportamiento:**
1. Interpreta la intencion: que proyecto, que meta, que valor, que observacion
2. Si hay ambiguedad, pasa a modo aclaracion (2.4)
3. Si hay confianza suficiente, construye una **propuesta estructurada**
4. Presenta la propuesta al usuario para revision
5. NO escribe nada todavia

**Estructura de la propuesta:**
```
Propuesta de carga:
  Proyecto: [nombre]
  Meta: [nombre]
  Tipo: cuantitativo
  Valor reportado: 6
  Observacion: "se completaron 6 de 12 meses de cobertura"
  Fecha de reporte: 13/04/2026

  ¿Confirmas esta carga?  [Confirmar] [Corregir] [Cancelar]
```

**Ejemplos de input:**
- "Esta semana hicimos 2 talleres mas"
- "La meta de capacitacion ya llego a 45 agentes"
- "Completamos el diagnostico ambiental"

### 2.4 Modo Aclaracion (desambiguacion)

**Trigger:** la interpretacion tiene confianza baja o multiples candidatos.

**Comportamiento:**
- No propone carga
- Presenta opciones concretas para que el usuario elija
- Reduce la ambiguedad paso a paso
- Nunca adivina

**Ejemplo:**
```
Usuario: "ya terminamos lo del hospital verde"
Bot: "El proyecto Hospital Verde tiene 5 metas abiertas:
  1. Diagnostico ambiental institucional
  2. Gestion diferenciada de residuos
  3. Uso racional de energia y agua
  4. Sensibilizacion del personal
  5. Compra responsable de insumos
  ¿A cual te referis?"
```

### 2.5 Modo Confirmacion (escritura controlada)

**Trigger:** el usuario confirma una propuesta.

**Comportamiento:**
1. Ejecuta `cargarAvance()` o `completarHito()` (server actions existentes)
2. Registra la propuesta, la confirmacion y el resultado
3. Responde con confirmacion visual
4. Actualiza el estado del chat

**Post-confirmacion:**
- "Avance cargado correctamente en [meta]. ¿Queres cargar otro?"
- O si habia lista de pendientes: "Listo, pasamos al siguiente pendiente?"

---

## 3. Arquitectura Funcional

### 3.1 Diagrama de capas

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  ┌──────────┐  ┌──────────────────────────────┐ │
│  │ Dashboard │  │   Chat Drawer (widget)       │ │
│  │ Views     │  │   - input de texto           │ │
│  │ /carga    │  │   - mensajes                 │ │
│  │ /tv       │  │   - propuestas de carga      │ │
│  │           │  │   - botones confirmar/cancel  │ │
│  └──────────┘  └──────────┬───────────────────┘ │
│                            │                     │
├────────────────────────────┼─────────────────────┤
│              API ROUTE     │                     │
│         POST /api/chat     │                     │
│              │              │                     │
│    ┌─────────▼──────────┐  │                     │
│    │  Capa Conversacional│  │                     │
│    │  (Claude API)       │  │                     │
│    │  con tools definidas│  │                     │
│    └─────────┬──────────┘  │                     │
│              │              │                     │
│    ┌─────────▼──────────┐  │                     │
│    │  Tools / Functions  │  │                     │
│    │  - consultas BD     │◄─┘                     │
│    │  - propuesta carga  │                        │
│    │  - ejecutar carga   │                        │
│    └─────────┬──────────┘                        │
│              │                                    │
├──────────────┼────────────────────────────────────┤
│   SUPABASE   │                                    │
│   - queries  │ (lectura)                          │
│   - actions  │ (escritura controlada)             │
│   - logs     │ (auditoria)                        │
└──────────────┴────────────────────────────────────┘
```

### 3.2 Componentes

| Componente | Tecnologia | Funcion |
|---|---|---|
| Chat UI | React client component | Drawer lateral con input, mensajes y propuestas |
| API Route | Next.js Route Handler `/api/chat` | Recibe mensajes, invoca Claude API con tools |
| Claude API | Anthropic API con tool_use | Interpreta, consulta herramientas, genera respuestas |
| Tools layer | Funciones TypeScript server-side | Set acotado de 9 herramientas (ver seccion 4) |
| Server Actions | `cargarAvance()`, `completarHito()` existentes | Escritura real en BD, solo post-confirmacion |
| Chat store | Supabase tabla `conversacion` + `mensaje` | Persistencia de historial y auditoria |

### 3.3 Flujo de un mensaje

```
1. Usuario escribe "que le falta cargar a Salud?"
2. Frontend envia POST /api/chat { mensaje, contexto }
3. API Route invoca Claude API con:
   - system prompt con rol y reglas
   - historial de la conversacion
   - tools disponibles
4. Claude decide invocar tool: buscar_pendientes_por_unidad("Salud")
5. La tool ejecuta query en Supabase y devuelve datos
6. Claude genera respuesta natural con los datos
7. API Route devuelve respuesta al frontend
8. Frontend muestra el mensaje
```

### 3.4 Conexion con el sistema existente

| Recurso existente | Como lo usa el chatbot |
|---|---|
| `queries.ts` | Las tools de consulta reutilizan las mismas funciones |
| `actions.ts` | La tool de ejecucion de carga invoca `cargarAvance()` y `completarHito()` |
| `utils.ts` | Calculo de porcentaje, semaforo, fechas |
| Supabase client | Mismo cliente, mismas tablas |
| Tipos TypeScript | Mismos tipos de `database.ts` |

---

## 4. Herramientas del Modelo (Tools)

Set acotado de 9 herramientas. No mas.

### 4.1 Tools de consulta (solo lectura)

| Tool | Parametros | Retorna | Ejemplo de uso |
|---|---|---|---|
| `buscar_proyectos` | `unidad_id?`, `estado?`, `texto?` | Lista de proyectos con nombre, codigo, estado, unidad | "Que proyectos tiene Salud?" |
| `obtener_detalle_proyecto` | `proyecto_id` | Proyecto + metas + hitos + ultimo avance | "Como esta el proyecto de RCP?" |
| `listar_metas_pendientes` | `unidad_id?`, `dias_sin_actualizar?` | Metas sin actualizacion reciente, ordenadas por urgencia | "Que tengo que cargar?" |
| `listar_hitos_proximos` | `dias?`, `unidad_id?`, `incluir_vencidos?` | Hitos pendientes con fecha y proyecto | "Que hitos se vencen este mes?" |
| `obtener_resumen_area` | `unidad_id` | Conteo de proyectos, metas por semaforo, ultimo reporte, hitos | "Como esta Gerencia de Datos?" |

### 4.2 Tools de accion (con confirmacion)

| Tool | Parametros | Retorna | Requiere confirmacion |
|---|---|---|---|
| `proponer_carga_avance` | `meta_id`, `valor_numerico?`, `valor_cualitativo?`, `observacion?` | Propuesta estructurada con todos los campos | No (solo arma la propuesta) |
| `confirmar_carga_avance` | `propuesta_id` | Resultado de la ejecucion | SI — solo despues de que el usuario confirmo |
| `proponer_completar_hito` | `hito_id`, `observacion?` | Propuesta de marcado de hito | No (solo arma la propuesta) |
| `confirmar_completar_hito` | `propuesta_id` | Resultado de la ejecucion | SI — solo despues de confirmacion |

### 4.3 Regla fundamental de las tools de accion

```
proponer_*  → SOLO lee datos + construye propuesta → la muestra al usuario
confirmar_* → SOLO se invoca cuando el usuario dice "si", "confirmo", "dale"
           → ejecuta cargarAvance() o completarHito() existentes
           → registra en propuesta_carga el resultado
```

**Claude NUNCA puede invocar `confirmar_*` sin que exista un mensaje del usuario confirmando la propuesta en el turno inmediatamente anterior.**

Esto se refuerza en el system prompt:
```
REGLA CRITICA: nunca ejecutes confirmar_carga_avance ni confirmar_completar_hito
a menos que el usuario haya confirmado explicitamente la propuesta en su ultimo mensaje.
Si hay duda, pregunta. Si no hay confirmacion clara, no ejecutes.
```

---

## 5. Modelo de Datos Complementario

### 5.1 Tablas nuevas recomendadas

#### `conversacion` (MVP)

Cada sesion de chat. Puede estar vinculada a una unidad organizacional como contexto.

| Campo | Tipo | Descripcion |
|---|---|---|
| id | uuid PK | |
| unidad_contexto_id | uuid FK nullable | Area desde la cual se inicio el chat |
| titulo | text nullable | Auto-generado: "Consulta Salud - 13/04" |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `mensaje` (MVP)

Cada mensaje dentro de una conversacion. Inmutable (append-only).

| Campo | Tipo | Descripcion |
|---|---|---|
| id | uuid PK | |
| conversacion_id | uuid FK | |
| rol | enum: 'usuario', 'asistente', 'sistema' | Quien envio |
| contenido | text | Texto del mensaje |
| tool_calls | jsonb nullable | Tools que invoco el modelo en este turno |
| tool_results | jsonb nullable | Resultados de las tools |
| propuesta_id | uuid FK nullable | Si este mensaje contiene una propuesta |
| created_at | timestamptz | |

#### `propuesta_carga` (MVP)

Propuesta armada por el asistente antes de la confirmacion. Es el objeto intermedio clave.

| Campo | Tipo | Descripcion |
|---|---|---|
| id | uuid PK | |
| conversacion_id | uuid FK | |
| tipo | enum: 'avance', 'hito' | Que tipo de carga propone |
| proyecto_id | uuid FK | |
| meta_id | uuid FK nullable | Para avances |
| hito_id | uuid FK nullable | Para hitos |
| valor_numerico | numeric nullable | Valor propuesto |
| valor_cualitativo | text nullable | Nivel propuesto |
| observacion | text nullable | |
| confianza | enum: 'alta', 'media', 'baja' | Nivel de confianza de la interpretacion |
| estado | enum: 'pendiente', 'confirmada', 'rechazada', 'corregida' | |
| avance_generado_id | uuid FK nullable → avance | Se llena al confirmar |
| texto_usuario_original | text | Lo que dijo el usuario |
| created_at | timestamptz | |
| confirmada_at | timestamptz nullable | |

#### `transcripcion_audio` (V2 — no MVP)

| Campo | Tipo | Descripcion |
|---|---|---|
| id | uuid PK | |
| mensaje_id | uuid FK | |
| audio_url | text | Ruta en Supabase Storage |
| transcripcion | text | Texto transcrito |
| modelo_transcripcion | text | "whisper-1" etc. |
| created_at | timestamptz | |

### 5.2 Prioridad

| Tabla | Etapa | Justificacion |
|---|---|---|
| conversacion | MVP | Necesaria para mantener contexto |
| mensaje | MVP | Historial de la conversacion |
| propuesta_carga | MVP | Pieza central de la carga asistida |
| transcripcion_audio | V2 | Solo cuando se implemente audio |

---

## 6. Flujo Conversacional Detallado

### 6.1 Consulta simple

```
Usuario: "Cuantos proyectos tiene la Direccion de Salud?"

[Claude invoca: buscar_proyectos(unidad="Salud")]
[Tool retorna: 10 proyectos]

Asistente: "La Dirección de Salud tiene 10 proyectos activos en el POA 2026.
Incluyen Peatonal Saludable, Tráiler Integral de la Mujer, Capacitación en RCP,
entre otros. ¿Querés ver el detalle de alguno?"
```

### 6.2 Consulta de pendientes semanales

```
Usuario: "Que tengo que cargar esta semana? Soy de Gerencia de Datos"

[Claude invoca: listar_metas_pendientes(unidad="Gerencia de Datos", dias_sin_actualizar=14)]
[Tool retorna: 8 metas sin reporte, 2 hitos proximos]

Asistente: "Gerencia de Datos tiene 8 metas pendientes de primer reporte
y 2 hitos proximos:

Prioridad alta:
  1. Videos de novedades (meta mensual, sin reporte)
  2. Hoja de datos relevantes (meta mensual, sin reporte)
  3. Automatizacion de BD — hito vencido: febrero 2026

¿Querés empezar a cargar avances? Puedo ir guiandote meta por meta."

Usuario: "Si, dale"

Asistente: "Empecemos por 'Videos de novedades para redes y Portal de Datos'.
La meta es publicar 2 videos mensuales. ¿Cuantos videos se publicaron
hasta ahora?"

Usuario: "Publicamos 4 en total"

[Claude invoca: proponer_carga_avance(meta_id=X, valor_numerico=4, observacion="4 videos publicados")]

Asistente: "Propuesta de carga:
  📋 Proyecto: Videos de novedades para redes y Portal de Datos
  📊 Meta: Publicar 2 videos mensuales
  📈 Valor reportado: 4 videos
  📝 Observacion: 4 videos publicados

  ¿Confirmas? [Confirmar] [Corregir] [Cancelar]"

Usuario: "Confirmo"

[Claude invoca: confirmar_carga_avance(propuesta_id=Y)]

Asistente: "✓ Avance cargado. La meta paso a 'En atencion'.
¿Pasamos a la siguiente pendiente?"
```

### 6.3 Ambiguedad

```
Usuario: "Ya terminamos lo de los talleres"

[Claude invoca: buscar_proyectos(texto="talleres")]
[Tool retorna: 3 proyectos con "talleres" en el nombre:
  - Talleres anuales para adultos mayores (ADM-01)
  - Talleres Verano Azul (CEA-05)
  - Talleres Anuales de Ninez (NIJ-14)]

Asistente: "Encontre 3 proyectos relacionados con talleres:
  1. Talleres anuales para adultos mayores (Adultos Mayores)
  2. Talleres Verano Azul (CIM CEA)
  3. Talleres Anuales (Ninez y Juventud)

¿A cual te referis?"

Usuario: "Los de adultos mayores"

[Claude invoca: obtener_detalle_proyecto(proyecto_id=ADM-01)]

Asistente: "El proyecto tiene 1 meta: lograr 400 inscriptos mas
(de 1600 a 2000). ¿Cuantos inscriptos hay actualmente?"
```

### 6.4 Rechazo o correccion

```
Asistente: "Propuesta de carga:
  📊 Meta: Capacitaciones en RCP
  📈 Valor reportado: 8 capacitaciones
  ¿Confirmas?"

Usuario: "No, fueron 6, no 8"

Asistente: "Corrijo. Propuesta actualizada:
  📊 Meta: Capacitaciones en RCP
  📈 Valor reportado: 6 capacitaciones
  ¿Confirmas?"
```

---

## 7. Reglas de Precision y Seguridad

### 7.1 Reglas de escritura

| Regla | Implementacion |
|---|---|
| Nunca escribir sin confirmacion | `confirmar_*` solo se invoca tras mensaje afirmativo del usuario |
| Registrar todo | Cada propuesta queda en `propuesta_carga` con texto original |
| Identificar fuente | `avance.fuente = 'chatbot'` + `avance.payload_original` con propuesta_id |
| Auditoria completa | Propuesta → confirmacion → avance_id todo vinculado |

### 7.2 Manejo de confianza

| Nivel | Condicion | Accion |
|---|---|---|
| **Alta** | Unica meta posible, valor numerico claro | Proponer directamente |
| **Media** | Meta identificada pero valor ambiguo | Proponer + pedir revision |
| **Baja** | Multiples candidatos o valor incierto | Pedir aclaracion, NO proponer |

### 7.3 Que hacer cuando no sabe

```
Si no encuentra la meta: "No encontre una meta que coincida con eso.
¿Podes darme el nombre del proyecto o el codigo?"

Si no entiende el valor: "No estoy seguro de que valor cargar.
¿Podes decirme el numero exacto?"

Si el tema esta fuera de alcance: "Solo puedo ayudarte con consultas
y carga de avances del POA. ¿Hay algo del Plan Operativo en lo que
pueda asistirte?"
```

---

## 8. Integracion UX/UI

### 8.1 Ubicacion: Drawer lateral derecho

```
┌──────────────────────────────────────────┬─────────────┐
│           CONTENIDO PRINCIPAL            │   CHAT      │
│                                          │   DRAWER    │
│  /dashboard                              │             │
│  /proyectos                              │  [mensajes] │
│  /carga                                  │  [mensajes] │
│                                          │  [propuesta]│
│                                          │             │
│                                          │  [input___] │
└──────────────────────────────────────────┴─────────────┘
```

**Boton flotante** en esquina inferior derecha. Al clickear, abre un drawer de ~400px de ancho. No bloquea la navegacion principal.

### 8.2 Contexto de pagina

El chat hereda contexto de donde se abre:

| Pagina actual | Contexto automatico |
|---|---|
| `/dashboard` | Sin filtro de area (general) |
| `/dashboard?unidad=X` | Area X pre-seleccionada |
| `/proyectos/[id]` | Proyecto especifico como contexto |
| `/carga?dir=X` | Area X pre-seleccionada |
| `/estructura` | Sin filtro especifico |
| `/hitos` | Modo hitos preferido |

Esto se envia como metadata en cada request al API:
```json
{
  "mensaje": "que me falta cargar?",
  "contexto": {
    "pagina": "/carga",
    "unidad_id": "uuid-gerencia-datos",
    "proyecto_id": null
  }
}
```

### 8.3 Propuestas de carga en el chat

Las propuestas se muestran como cards interactivas, no como texto plano:

```
┌──────────────────────────────────────┐
│  📋 Propuesta de carga               │
│                                      │
│  Proyecto: Videos de novedades       │
│  Meta: Publicar 2 videos/mes        │
│  Valor: 4 videos                    │
│  Observación: 4 videos publicados   │
│                                      │
│  [✓ Confirmar]  [✏ Corregir]  [✕]   │
└──────────────────────────────────────┘
```

### 8.4 Indicadores de estado

| Estado | Visual |
|---|---|
| Escribiendo | Tres puntos animados |
| Consultando datos | "Buscando en el sistema..." |
| Propuesta lista | Card interactiva con botones |
| Carga exitosa | Check verde + "Avance cargado" |
| Error | Badge rojo con mensaje |

---

## 9. Estrategia de Implementacion por Etapas

### V1.0 — Chat lector (1 semana)

**Alcance:** Solo responde preguntas. No modifica datos.

**Implementar:**
- API Route `/api/chat`
- System prompt con rol y reglas
- 5 tools de lectura (buscar_proyectos, obtener_detalle, listar_pendientes, listar_hitos, resumen_area)
- UI: drawer lateral con input de texto y mensajes
- Contexto de pagina basico
- Sin persistencia de conversacion (solo memoria de sesion)

**Valor:** los usuarios ya pueden preguntar "como esta mi area", "que hitos vienen", "que tengo pendiente" sin navegar.

### V1.1 — Chat con carga asistida (1-2 semanas)

**Alcance:** Consulta + propuestas de carga con confirmacion.

**Implementar:**
- 4 tools de accion (proponer_avance, confirmar_avance, proponer_hito, confirmar_hito)
- Tabla `propuesta_carga` en Supabase
- UI de propuestas como cards interactivas en el chat
- Persistencia de conversaciones en Supabase (tabla conversacion + mensaje)
- Vinculo propuesta → avance para auditoria
- Carga guiada por pendientes

**Valor:** la Subsecretaria puede cargar avances hablando con el chat en vez de buscar formularios.

### V1.2 — Carga guiada por pendientes (1 semana)

**Alcance:** El chat puede iniciar flujos de carga proactivos.

**Implementar:**
- Flujo "empecemos por tus pendientes" que itera meta por meta
- Priorizacion inteligente (vencidos → proximos → sin reporte)
- Resumen de lo cargado al final de la sesion

**Valor:** convierte al chat en un asistente de gestion que ordena el trabajo operativo.

### V2.0 — Audio (2-3 semanas)

**Alcance:** Entrada por voz transcrita.

**Implementar:**
- Boton de microfono en el chat
- Web Speech API o Whisper para transcripcion
- Tabla `transcripcion_audio`
- Flujo: audio → texto → interpretacion → propuesta → confirmacion
- El usuario siempre ve y confirma la propuesta antes de que se guarde

**Valor:** carga sin escribir, util en contextos operativos de campo.

---

## 10. Riesgos de Diseño a Evitar

| Riesgo | Consecuencia | Mitigacion |
|---|---|---|
| **Chatbot genérico** | Responde cosas vagas, pierde credibilidad | Tools especificas, system prompt estricto, datos reales |
| **Exceso de autonomia** | Escribe datos incorrectos sin control | Confirmacion obligatoria, propuesta intermedia |
| **Mala desambiguacion** | Carga en la meta equivocada | Confianza baja → aclaracion, nunca adivinanza |
| **Falta de contexto** | El chat no sabe desde donde habla el usuario | Metadata de pagina, seleccion de area, conversacion con memoria |
| **Acoplamiento fragil** | El chatbot depende de queries internas que cambian | Tools como capa de abstraccion, no acceso directo a queries |
| **Sin trazabilidad** | No se sabe que interpreto el sistema | `propuesta_carga` guarda texto original + interpretacion + resultado |
| **Latencia excesiva** | El chat tarda mucho y frustra | Tools livianas, consultas indexadas, streaming de respuesta |
| **Audio sin texto estable** | Transcripcion con errores genera cargas erroneas | Audio es V2, primero estabilizar texto. Siempre confirmar propuesta |

---

## 11. System Prompt (borrador)

```
Sos el asistente de seguimiento del Plan Operativo Anual 2026 de la
Secretaria General de la Municipalidad de San Miguel de Tucuman.

Tu funcion es ayudar al equipo de Gestion Estrategica y a los referentes
de cada area a consultar el estado de sus proyectos, metas e hitos,
y a cargar avances de forma rapida y precisa.

REGLAS:
1. Solo respondés sobre el contenido del POA cargado en el sistema.
2. Usás las herramientas disponibles para consultar datos reales.
   Nunca inventás numeros ni estados.
3. Cuando el usuario quiere cargar un avance, SIEMPRE armás una
   propuesta estructurada y pedis confirmacion antes de ejecutar.
4. NUNCA ejecutás confirmar_carga_avance ni confirmar_completar_hito
   sin confirmacion explicita del usuario en su ultimo mensaje.
5. Si hay ambiguedad (multiples metas, valor no claro), pedis
   aclaracion antes de proponer.
6. Si no encontrás lo que busca el usuario, lo decis honestamente
   y sugeris como reformular.
7. Respondés en español rioplatense profesional, breve y directo.
8. No incluís informacion de otros periodos ni de otras secretarias
   salvo que el sistema la provea.

CONTEXTO DE ESTA CONVERSACION:
- Area del usuario: {unidad_nombre ?? "no especificada"}
- Pagina actual: {pagina}
- Proyecto actual: {proyecto_nombre ?? "ninguno"}
```

---

## 12. Recomendaciones para Pasar a Implementacion

### Orden sugerido

1. **Crear API Route** `/api/chat` con Claude API y las 5 tools de lectura
2. **Crear UI del drawer** con input, mensajes y scroll
3. **Probar solo consultas** con datos reales del POA
4. **Agregar tablas** conversacion, mensaje, propuesta_carga
5. **Agregar 4 tools de accion** con flujo de propuesta + confirmacion
6. **Agregar cards interactivas** para propuestas en el chat
7. **Probar carga guiada** con flujo de pendientes
8. **Deploy y feedback** con la Subsecretaria de Gestion Estrategica

### Dependencias tecnicas

| Componente | Dependencia |
|---|---|
| Claude API | API key de Anthropic (ANTHROPIC_API_KEY en env) |
| Streaming | Vercel AI SDK o implementacion manual de SSE |
| Supabase | Tablas nuevas (conversacion, mensaje, propuesta_carga) |
| Server Actions | Las existentes `cargarAvance()` y `completarHito()` |

### Metricas de exito

| Metrica | Objetivo V1 |
|---|---|
| Precision de consultas | >90% respuestas con datos correctos |
| Tasa de confirmacion de propuestas | >80% (baja si desambigua mal) |
| Tiempo promedio de carga por avance | <30 segundos (vs ~60 en formulario) |
| Propuestas rechazadas/corregidas | <15% |
| Conversaciones con carga exitosa | >50% de las que intentan cargar |

---

*Documento de diseño funcional y tecnico del asistente conversacional.
Sirve como blueprint para la implementacion por etapas.
Siguiente paso: implementar V1.0 (chat lector con tools de consulta).*

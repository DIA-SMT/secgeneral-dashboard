# Documento Tecnico-Funcional Inicial
## Dashboard Ejecutivo - Secretaria General
### Municipalidad de San Miguel de Tucuman

**Version:** 0.1 - Arquitectura Funcional  
**Fecha:** 13 de abril de 2026  
**Estado:** Pre-desarrollo  
**Stack:** Next.js + Tailwind CSS + Supabase + Vercel

---

## 1. Vision General del Producto

### 1.1 Proposito

Desarrollar una webapp institucional que funcione como **dashboard ejecutivo de seguimiento de la planificacion operativa anual** de la Secretaria General de la Municipalidad de San Miguel de Tucuman.

El producto tiene dos funciones fundamentales:

1. **Visualizacion ejecutiva** para el Secretario General: ver de un vistazo el estado de ejecucion de toda su planificacion, identificar alertas, avances y rezagos por dependencia, direccion y proyecto.
2. **Carga operativa simplificada** para la Subsecretaria de Gestion Estrategica: registrar avances, consolidar informacion de las areas y mantener actualizado el tablero sin friccion.

### 1.2 Principio Rector

> **"Si la carga es compleja, no se usa. Si la visualizacion no es clara, no sirve."**

La prioridad absoluta es que el Secretario General pueda tomar decisiones informadas con una mirada rapida. La segunda prioridad es que la carga de datos sea tan simple que no requiera capacitacion.

### 1.3 Alcance Inicial

La primera version se enfoca exclusivamente en:
- La estructura de planificacion operativa anual (dependencias, direcciones, proyectos, metas, hitos)
- El seguimiento de avance sobre esa planificacion
- La visualizacion ejecutiva de ese avance

No se incluyen en esta version: gestion documental, comunicaciones internas, workflows de aprobacion, ni modulos administrativos generales.

---

## 2. Actores del Sistema

### 2.1 Secretario General (Actor Principal - Solo Lectura)

| Atributo | Detalle |
|---|---|
| **Rol** | Maximo decisor de la Secretaria General |
| **Necesidad** | Ver el estado de su planificacion de forma inmediata |
| **Interaccion** | Solo visualizacion. No carga datos |
| **Dispositivos** | Escritorio, televisor en oficina, tablet, celular |
| **Frecuencia** | Consulta diaria o a demanda |
| **Expectativa** | Interfaz ejecutiva, sin ruido, con indicadores claros |

### 2.2 Subsecretaria de Gestion Estrategica (Actor Operativo Principal)

| Atributo | Detalle |
|---|---|
| **Rol** | Responsable de cargar, consolidar y mantener actualizada la planificacion |
| **Necesidad** | Registrar avances de forma rapida y simple |
| **Interaccion** | Carga de datos, edicion, consulta |
| **Dispositivos** | Escritorio principalmente, tablet ocasionalmente |
| **Frecuencia** | Diaria o semanal segun ciclo de reporte |
| **Expectativa** | Formularios simples, pocos clics, feedback inmediato |

### 2.3 Referentes de Area (Actor Futuro)

| Atributo | Detalle |
|---|---|
| **Rol** | Responsables de cada dependencia o direccion |
| **Necesidad** | Reportar avances de sus propias metas |
| **Interaccion** | Carga limitada a su ambito |
| **Estado** | No incluido en V1, pero el modelo debe contemplarlo |

### 2.4 Administrador del Sistema (Actor Tecnico)

| Atributo | Detalle |
|---|---|
| **Rol** | Configura estructura, gestiona usuarios |
| **Estado** | Minimo en V1, expandible luego |

---

## 3. Modulos Iniciales del Sistema

### 3.1 Mapa de Modulos

```
SECGENERAL DASHBOARD
|
|-- [M1] PANEL EJECUTIVO (vista Secretario)
|   |-- Vista general consolidada
|   |-- Vista por dependencia
|   |-- Vista por proyecto
|   |-- Vista por alertas/semaforo
|   |-- Vista timeline (Gantt simplificado)
|
|-- [M2] CARGA DE AVANCES (vista Gestion Estrategica)
|   |-- Selector rapido de proyecto/meta
|   |-- Formulario de avance simplificado
|   |-- Historial de cargas
|
|-- [M3] ESTRUCTURA DE PLANIFICACION (configuracion)
|   |-- ABM de dependencias
|   |-- ABM de direcciones
|   |-- ABM de proyectos
|   |-- ABM de metas e hitos
|
|-- [M4] EXPLORADOR DE METRICAS
|   |-- Porcentaje de avance por area
|   |-- Cumplimiento vs. meta
|   |-- Comparativo entre dependencias
|   |-- Tendencias temporales
|
|-- [FUTURO] CHATBOT IA
|   |-- Consultas en lenguaje natural
|   |-- Carga por audio
|   |-- Alertas inteligentes
```

### 3.2 Detalle por Modulo

#### M1 - Panel Ejecutivo

**Proposito:** Es el corazon del producto. Todo lo que se carga debe desembocar aqui de manera visualmente clara.

**Vistas:**

| Vista | Descripcion | Metrica principal |
|---|---|---|
| **General** | Dashboard consolidado con KPIs globales | % avance global, alertas activas, proyectos en riesgo |
| **Por Dependencia** | Cards o filas por cada dependencia con semaforo | % avance, cantidad metas cumplidas/total, ultimo reporte |
| **Por Proyecto** | Detalle de un proyecto con sus metas e hitos | % avance, hitos completados, proximo hito, fecha limite |
| **Semaforo** | Solo items en rojo/amarillo para atencion inmediata | Dias de atraso, impacto, responsable |
| **Timeline** | Linea de tiempo visual tipo Gantt simplificado | Hitos en eje temporal, estado por color |

#### M2 - Carga de Avances

**Proposito:** Permitir que la Subsecretaria registre avances en menos de 30 segundos por meta.

**Flujo simplificado:**
1. Seleccionar dependencia (dropdown)
2. Seleccionar proyecto (dropdown filtrado)
3. Seleccionar meta (lista visible)
4. Registrar: valor actual / observacion breve
5. Guardar

**Principio:** Un avance = un formulario de 2-3 campos. Sin pantallas intermedias.

#### M3 - Estructura de Planificacion

**Proposito:** Definir el arbol de planificacion una vez al inicio del periodo.

**Jerarquia:**
```
Secretaria General
  └── Dependencia (ej: Subsecretaria de Gestion Estrategica)
       └── Direccion (ej: Direccion de Planificacion)
            └── Proyecto (ej: Implementacion de tablero de gestion)
                 └── Meta (ej: Tener operativo el dashboard al 30/06)
                      └── Hito (ej: Definicion de arquitectura completada)
```

#### M4 - Explorador de Metricas

**Proposito:** Ofrecer cortes analiticos cuando el Secretario o la Subsecretaria necesiten profundizar.

**Metricas clave:**
- % de avance global y por area
- Cantidad cumplida vs. meta (ej: 3 de 5 hitos)
- Proximo hito pendiente con fecha
- Fecha de ultima actualizacion por area
- Cantidad de dias sin actualizacion (alerta de inactividad)
- Comparativo entre dependencias (ranking visual)

---

## 4. Flujos de Uso Principales

### 4.1 Flujo del Secretario General

```
[Abre la app] 
  → Ve panel general con % global, semaforo, alertas
  → Toca una dependencia con semaforo amarillo
  → Ve detalle de esa dependencia: proyectos, metas, estados
  → Toca un proyecto en riesgo
  → Ve hitos, fechas, ultimo avance reportado, observaciones
  → Toma decision o solicita informacion
```

**Caracteristica clave:** Drill-down progresivo. De lo general a lo especifico en 2-3 clics.

### 4.2 Flujo de la Subsecretaria de Gestion Estrategica

```
[Abre la app]
  → Va a "Carga de Avances"
  → Selecciona dependencia y proyecto
  → Ve lista de metas con ultimo estado
  → Selecciona una meta
  → Carga: valor actual + observacion breve
  → Guarda → feedback visual inmediato (check verde)
  → Repite o sale
```

**Caracteristica clave:** Carga batch posible (varias metas seguidas sin recargar pagina).

### 4.3 Flujo de Configuracion Inicial

```
[Admin/Gestion Estrategica]
  → Crea dependencias
  → Dentro de cada dependencia, crea direcciones
  → Dentro de cada direccion, crea proyectos
  → Dentro de cada proyecto, define metas con:
      - Descripcion
      - Indicador (que se mide)
      - Linea de base (valor inicial)
      - Meta objetivo (valor esperado)
      - Fecha limite
      - Hitos intermedios (opcionales)
  → Publicar planificacion → se activa el dashboard
```

### 4.4 Flujo de Visualizacion en Televisor

```
[Modo Presentacion]
  → Se accede con URL dedicada o parametro ?mode=tv
  → Interfaz fullscreen, sin navegacion
  → Rotacion automatica entre vistas cada N segundos
  → KPIs grandes, legibles a 3 metros
  → Semaforo dominante, datos minimos pero impactantes
```

---

## 5. Tipo de Informacion que se Carga

### 5.1 Datos Estructurales (se cargan una vez)

| Dato | Ejemplo | Frecuencia de cambio |
|---|---|---|
| Dependencia | Subsecretaria de Gestion Estrategica | Anual |
| Direccion | Direccion de Planificacion | Anual |
| Proyecto | Dashboard de gestion | Anual |
| Meta | Dashboard operativo al 30/06 | Anual |
| Hito | Arquitectura definida | Anual |
| Indicador | % de avance | Al crear la meta |
| Linea de base | 0% | Al crear la meta |
| Meta objetivo | 100% | Al crear la meta |
| Fecha limite | 30/06/2026 | Al crear la meta |

### 5.2 Datos de Seguimiento (se cargan periodicamente)

| Dato | Ejemplo | Frecuencia |
|---|---|---|
| Valor actual del indicador | 45% | Semanal/quincenal |
| Observacion | "Se completo la fase de diseno" | Con cada avance |
| Hito completado (si/no) | Si, el 15/04 | Cuando ocurre |
| Fecha de carga | Automatica | Automatica |
| Usuario que carga | gestion.estrategica | Automatica |

### 5.3 Principio de Minimidad

> Cada registro de avance debe tener **como maximo 3 campos manuales**: valor, observacion, y marcado de hitos. Todo lo demas debe ser automatico o preseleccionado.

---

## 6. Tipo de Informacion que se Visualiza

### 6.1 Indicadores Ejecutivos (Panel General)

| Indicador | Formato Visual |
|---|---|
| % de avance global de la Secretaria | Numero grande + barra de progreso circular |
| Proyectos en verde / amarillo / rojo | Semaforo con conteo |
| Areas sin actualizacion reciente | Badge de alerta |
| Proximo hito critico | Card con countdown |
| Cantidad de metas cumplidas vs total | Fraccion tipo "12/28" |

### 6.2 Indicadores por Dependencia

| Indicador | Formato Visual |
|---|---|
| % de avance de la dependencia | Barra de progreso |
| Cantidad de proyectos y su estado | Pills de color |
| Ultimo reporte | Fecha relativa ("hace 3 dias") |
| Responsable | Nombre visible |

### 6.3 Indicadores por Proyecto

| Indicador | Formato Visual |
|---|---|
| % de avance | Barra + numero |
| Hitos completados / total | Stepper visual o checklist |
| Proximo hito + fecha | Card destacada |
| Historial de avances | Mini timeline vertical |
| Fecha limite | Con color segun proximidad |

### 6.4 Sistema de Semaforo

| Color | Condicion |
|---|---|
| **Verde** | Avance >= 80% del esperado para la fecha actual |
| **Amarillo** | Avance entre 50% y 79% del esperado |
| **Rojo** | Avance < 50% del esperado, o sin actualizacion > 15 dias |
| **Gris** | Sin datos cargados |

> Los umbrales deben ser configurables en el futuro, pero estos son defaults razonables para arrancar.

---

## 7. Principios UX/UI

### 7.1 Estetica: Futurista-Institucional

**Concepto visual:** Interfaz oscura con acentos de color institucional. Limpia, con espaciado generoso, tipografia moderna. Sensacion de "centro de control" gubernamental, no de planilla Excel.

**Referencia de tono:** Dashboard de SpaceX o Bloomberg Terminal, pero simplificado y con identidad municipal.

| Elemento | Especificacion |
|---|---|
| **Tipografia** | Poppins (todas las variantes) |
| **Fondo principal** | Oscuro: #0A0E1A (azul muy oscuro, casi negro) |
| **Fondo de cards** | #111827 (gris oscuro) con borde sutil |
| **Color primario** | #2563EB (azul institucional, compatible con SMT) |
| **Color secundario** | #06B6D4 (cyan, acento futurista) |
| **Exito / Verde** | #10B981 |
| **Alerta / Amarillo** | #F59E0B |
| **Critico / Rojo** | #EF4444 |
| **Texto principal** | #F9FAFB (blanco suave) |
| **Texto secundario** | #9CA3AF (gris medio) |
| **Bordes** | #1F2937 |

### 7.2 Principios de Diseno

1. **Densidad informativa controlada:** Mucha informacion, pero organizada en capas. La primera capa es simple; el detalle aparece al hacer drill-down.

2. **Jerarquia visual clara:** Los numeros mas importantes son los mas grandes. Los semaforos son el primer elemento que se ve.

3. **Zero learning curve para visualizacion:** El Secretario no deberia necesitar que le expliquen nada. Los colores, iconos y tamanios deben comunicar por si solos.

4. **Carga con feedback inmediato:** Cada accion de carga debe tener confirmacion visual instantanea (animacion de check, toast de exito, actualizacion en tiempo real del indicador).

5. **Consistencia total:** Mismos patrones de cards, mismos colores de semaforo, misma disposicion en todas las vistas.

### 7.3 Responsive y Multi-dispositivo

| Dispositivo | Resolucion referencia | Adaptacion |
|---|---|---|
| **Escritorio** | 1920x1080 | Layout completo, sidebar + contenido |
| **Televisor** | 1920x1080 / 4K | Modo presentacion fullscreen, font-size aumentado, sin controles |
| **Tablet** | 1024x768 | Layout apilado, cards en grid 2 columnas |
| **Celular** | 375x812 | Layout vertical, cards apiladas, navegacion inferior |

**Modo TV:** Accesible via `?mode=tv` o ruta dedicada `/tv`. Rota automaticamente entre vistas. Sin interaccion requerida. Optimizado para legibilidad a distancia.

---

## 8. Criterios de Simplicidad para la Carga

### 8.1 Reglas de Oro

1. **Maximo 3 campos por formulario de avance.** Mas que eso genera abandono.
2. **Dropdowns pre-filtrados.** Al seleccionar dependencia, solo se muestran sus proyectos.
3. **Valores por defecto inteligentes.** El ultimo valor cargado aparece como referencia.
4. **Sin paginas intermedias.** Seleccionar + cargar en la misma vista.
5. **Guardado sin boton de confirmacion doble.** Un clic en "Guardar" basta.
6. **Feedback visual inmediato.** El indicador se actualiza en pantalla al guardar.
7. **Carga batch natural.** Despues de guardar una meta, la siguiente aparece lista.

### 8.2 Anti-patrones a Evitar

| Anti-patron | Riesgo |
|---|---|
| Formularios largos con muchos campos obligatorios | Abandono total de la herramienta |
| Navegacion profunda para llegar al formulario | Frustracion y perdida de tiempo |
| Falta de feedback al guardar | Inseguridad, carga duplicada |
| Obligar a cargar archivos adjuntos | Friccion innecesaria en V1 |
| Requerir justificacion escrita larga | Nadie lo va a hacer |

---

## 9. Criterios de Visualizacion Ejecutiva

### 9.1 Que Debe Verse en 5 Segundos

Al abrir el dashboard, el Secretario debe poder responder estas preguntas sin hacer clic:

1. **"Como estamos en general?"** → % de avance global grande y visible
2. **"Hay algo critico?"** → Contador de alertas rojas prominente
3. **"Que area esta atrasada?"** → Semaforo por dependencia visible en primera pantalla
4. **"Cuando fue la ultima actualizacion?"** → Timestamp visible

### 9.2 Que Debe Verse en 30 Segundos (1-2 clics)

5. **"Que pasa con esta area especifica?"** → Detalle de dependencia
6. **"Que proyecto esta en rojo?"** → Lista filtrada por semaforo
7. **"Cual es el proximo hito?"** → Timeline o card de proximo hito
8. **"Cuanto llevan de esta meta?"** → Barra de progreso con numeros

### 9.3 Que Debe Verse en 2 Minutos (exploracion)

9. Comparativo entre dependencias
10. Tendencia de avance en el tiempo
11. Historial de cargas de un proyecto
12. Detalle de observaciones

---

## 10. Preparacion para Chatbot con IA

### 10.1 Vision Futura

El sistema debe estar preparado para integrar un asistente de IA que permita:

- **Consultas en lenguaje natural:** "Como esta la Direccion de Planificacion?" → respuesta con datos reales
- **Carga por voz:** "Actualizar la meta de capacitacion al 60%" → se registra el avance
- **Alertas inteligentes:** "Hay 3 proyectos que no se actualizan hace 20 dias"
- **Resumenes ejecutivos:** "Dame un resumen del estado general para la reunion del lunes"

### 10.2 Implicaciones Arquitectonicas Actuales

Para habilitar esto en el futuro, el diseno actual debe contemplar:

| Requisito | Implementacion |
|---|---|
| Datos bien estructurados | Modelo de datos normalizado con nombres claros |
| API consultable | Supabase ya provee API REST automatica |
| Historial de cambios | Tabla de logs de avances con timestamps |
| Metadata descriptiva | Cada entidad con nombre legible y descripcion |
| Endpoints de resumen | Views de base de datos que consoliden KPIs |

### 10.3 Tecnologia Sugerida para el Chatbot

- **Motor:** Claude API (Anthropic) o similar
- **Interfaz:** Widget flotante dentro del dashboard
- **Integracion:** Function calling con consultas a Supabase
- **Carga por audio:** Web Speech API → texto → procesamiento por IA → escritura en BD

> No se implementa en V1, pero la arquitectura de datos no debe impedir su integracion futura.

---

## 11. Escalabilidad Futura

### 11.1 Expansiones Contempladas

| Fase | Funcionalidad | Dependencia |
|---|---|---|
| V1.1 | Roles y permisos (RLS en Supabase) | Modelo de datos estable |
| V1.2 | Carga descentralizada por referentes de area | Sistema de roles |
| V2.0 | Chatbot IA con consultas y carga | API REST + modelo limpio |
| V2.1 | Notificaciones (email/push) de alertas | Supabase Edge Functions |
| V2.2 | Reportes PDF exportables | Datos consolidados + template |
| V3.0 | Extension a otras Secretarias | Multi-tenancy o multi-schema |

### 11.2 Decisiones que Facilitan la Escala

1. **Modelo de datos con IDs UUID** (no auto-increment) para facilitar sincronizacion
2. **Soft deletes** (campo `deleted_at`) en vez de borrado fisico
3. **Timestamps automaticos** (`created_at`, `updated_at`) en toda tabla
4. **Campo `periodo`** en la planificacion para soportar multiples anos
5. **Campo `estado`** estandarizado como enum, no texto libre

---

## 12. Riesgos de Diseno a Evitar

| Riesgo | Consecuencia | Mitigacion |
|---|---|---|
| Hacer la carga compleja | Nadie la usa y el dashboard queda vacio | Formularios de max 3 campos, pruebas de usabilidad tempranas |
| Sobredisenar permisos en V1 | Retrasar el lanzamiento sin necesidad | Roles simples al inicio, RLS detallado en V1.1 |
| Dashboard con demasiada info en primera vista | El Secretario se pierde | Capas de informacion: resumen → detalle → metricas |
| No contemplar modo TV | Se pierde un caso de uso clave para visibilidad | Disenar desde el inicio con breakpoint TV |
| Modelo de datos rigido | Costoso de modificar cuando aparecen nuevas necesidades | Usar JSON/JSONB para metadata extensible en campos opcionales |
| Depender de carga perfecta | Si falta un dato, se rompe la visualizacion | Defaults y estados "sin datos" con diseno gracioso (gris, mensajes claros) |
| Ignorar la experiencia mobile | El Secretario quiere ver desde el celular | Mobile-first en componentes criticos de visualizacion |
| No registrar historial de cambios | Se pierde la trazabilidad | Log de avances inmutable desde dia 1 |

---

## 13. Recomendaciones para Proximos Pasos

### Paso 1: Modelo de Datos
Disenar el schema de Supabase con las siguientes tablas core:
- `dependencias`
- `direcciones`
- `proyectos`
- `metas`
- `hitos`
- `avances` (log inmutable)
- `usuarios` (vinculado a Supabase Auth)
- `periodos`

### Paso 2: Seed Data
Cargar datos reales o realistas de la planificacion actual para tener contenido desde el primer prototipo.

### Paso 3: Scaffolding del Frontend
- Next.js App Router
- Tailwind con tema oscuro custom
- Layout base con sidebar + contenido
- Componentes base: Card, ProgressBar, Semaforo, KPIBox

### Paso 4: Panel Ejecutivo (MVP)
Construir primero la vista del Secretario con datos estaticos, luego conectar a Supabase.

### Paso 5: Modulo de Carga
Una vez que el panel funcione, construir la carga simple para alimentarlo.

### Paso 6: Deploy y Feedback
Subir a Vercel, mostrar al Secretario, iterar.

---

## Anexo: Identidad Visual de Referencia

**Sitio institucional:** https://smt.gob.ar/  
**Paleta derivada:** Azul institucional como primario, complementado con cyan futurista  
**Tipografia:** Poppins (Google Fonts)  
**Modo:** Dark theme como default (estetica futurista), con posibilidad de light theme futuro  
**Logo:** Se integrara el escudo o logotipo de la Secretaria General si se provee

---

*Documento elaborado como base para el desarrollo del dashboard ejecutivo de la Secretaria General. Sujeto a revision y aprobacion antes de pasar a la fase de modelado de datos y arquitectura tecnica.*

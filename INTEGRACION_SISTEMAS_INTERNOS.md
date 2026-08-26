# Integración con los sistemas internos de las direcciones

**Fecha:** 26 de agosto de 2026
**Responde a:** la pregunta de la página 38 de `Modificaciones PLANIA.docx`
**Pregunta textual:** *"Hay direcciones que ya tienen otras bases de datos internas. ¿Hay posibilidad de entrelazar los datos de esos sistemas con este?"*

---

## Respuesta corta

Sí, se puede. Hay cuatro formas de hacerlo, de un par de días a un par de semanas
de trabajo por sistema, y no hace falta que sea todo o nada: se puede integrar
una dirección y dejar el resto como está.

La parte técnica es la fácil. La difícil es decidir **qué se quiere lograr**,
porque "entrelazar" puede significar tres cosas bastante distintas y de eso
depende si conviene el esfuerzo.

---

## 1. Qué puede significar "entrelazar"

**(a) Que el indicador del POA se actualice solo.**
El sistema de la dirección ya tiene el número —cantidad de inspecciones, de
atenciones, de expedientes resueltos— y PlanIA lo toma de ahí en vez de que
alguien lo transcriba a mano. Es lo que resuelve un problema real: saca la doble
carga y el desfasaje entre lo que dice un sistema y lo que dice el otro.

**(b) Que PlanIA muestre un enlace al dato de origen.**
El indicador se sigue cargando a mano, pero al lado queda el vínculo al
expediente, al legajo o al tablero del otro sistema, para poder verificarlo.
Cuesta muy poco y sirve para auditar, pero no ahorra trabajo.

**(c) Que los dos sistemas compartan la base de datos.**
Una sola base para todo. Es lo que suena más ordenado y casi nunca conviene: ata
los dos sistemas entre sí, y a partir de ahí un cambio en cualquiera de los dos
puede romper el otro.

De los tres, el que justifica desarrollo es el **(a)**. El resto del documento es
sobre cómo hacerlo.

---

## 2. Cuánto ahorraría, en concreto

Conviene medirlo antes de decidir, porque el ahorro está muy desparejo. Hoy hay
**1896 indicadores** repartidos en **52 unidades**. La mediana es de **21
indicadores por unidad**, pero las que más tienen están lejos del promedio:

| Unidad | Indicadores a mantener |
|---|---|
| Dirección de Parque 9 de Julio | 117 |
| Dirección de Salud | 91 |
| Dirección de Vía Pública | 74 |
| Dirección de Salud Ambiental | 73 |
| Secretaría de Ambiente y Desarrollo Sustentable | 69 |

Una integración que le saque a la Dirección de Salud el trabajo de transcribir 91
valores por período se paga sola. La misma integración para una dirección con 3
indicadores no se paga nunca. Sobre esto vuelve la recomendación del final.

---

## 3. Las cuatro formas de hacerlo

Ordenadas de menos a más esfuerzo.

### A. Exportación periódica por archivo

La dirección exporta de su sistema una planilla (CSV o Excel) con una fila por
indicador: código, valor y fecha. Esa planilla se importa a PlanIA.

| | |
|---|---|
| **Qué necesita del otro lado** | Que el sistema pueda exportar a Excel o CSV. Nada más. |
| **Esfuerzo** | Bajo. 2 a 3 días la primera vez; después es correr el import. |
| **Frecuencia** | La que se acuerde. No es en tiempo real. |
| **Riesgo** | Si alguien mueve o renombra una columna, el import se rompe. Y sigue habiendo un paso manual: alguien tiene que exportar y subir. |
| **Cuándo conviene** | Cuando el sistema de la dirección no tiene quien lo programe, pero sí puede exportar. |

Es el mismo mecanismo con el que ya se cargó el POA 2026, así que la maquinaria
está hecha y probada (`supabase/import/`).

### B. El otro sistema le manda el dato a PlanIA — *recomendada*

PlanIA expone un punto de entrada y una credencial por dirección. El sistema de
la dirección, cuando actualiza su dato, se lo manda.

| | |
|---|---|
| **Qué necesita del otro lado** | Alguien que pueda programar en ese sistema una llamada HTTP. Es poco código. |
| **Esfuerzo** | Bajo del lado de PlanIA (un endpoint y un token por dirección, se hace una vez y sirve para todas). Medio del otro lado. |
| **Frecuencia** | La que quiera cada sistema. Puede ser inmediato. |
| **Riesgo** | Bajo. Si el otro sistema deja de mandar, el indicador simplemente queda desactualizado y se ve en el semáforo. |
| **Cuándo conviene** | Cuando son varias direcciones con sistemas distintos. |

**Por qué esta es la recomendada:** PlanIA define **un** contrato y cada sistema
se adapta a él. La alternativa —que PlanIA aprenda a hablar con diez sistemas
distintos— multiplica el trabajo por diez y hace que cada cambio en cualquiera de
ellos sea un problema nuestro.

### C. PlanIA le pide el dato al otro sistema

Al revés que la B: el sistema de la dirección expone una consulta y PlanIA la
llama sola, cada tanto.

| | |
|---|---|
| **Qué necesita del otro lado** | Que el sistema tenga (o pueda tener) una API consultable, más credenciales de lectura. |
| **Esfuerzo** | Medio. Cerca de una semana por sistema, porque hay que escribir un adaptador para cada uno. |
| **Frecuencia** | Automática. Ya hay un proceso programado andando (GitHub Actions) que se puede reutilizar. |
| **Riesgo** | Medio. Cada sistema es un adaptador propio a mantener. |
| **Cuándo conviene** | Cuando la dirección no puede tocar su sistema para que empuje el dato, pero sí tiene una API para consultarlo. |

### D. Conexión directa a la base del otro sistema — *no recomendada*

Técnicamente es posible leer directamente la base del otro sistema desde PlanIA.

| | |
|---|---|
| **Esfuerzo** | Aparentemente bajo, y ahí está la trampa. |
| **Riesgo** | **Alto.** Ata PlanIA al esquema interno del otro sistema: el día que allá renombren una tabla, acá se rompe algo, sin aviso. Además obliga a abrir la base a la red. |
| **Cuándo conviene** | Casos muy puntuales, con una base estable y un acuerdo explícito de que no se toca sin avisar. |

---

## 4. Lo que ya está listo del lado de PlanIA

Nada de esto hay que construirlo:

- **Clave para cruzar los datos.** Cada indicador tiene su propio código.
  Hoy **1128 de los 1896** lo tienen cargado, y son todos distintos, así que
  sirve como identificador. A los **768 restantes** habría que asignarles uno
  antes de poder automatizar sobre ellos.
- **Lugar para guardar el identificador del otro sistema.** Indicadores, metas,
  proyectos y unidades tienen un campo libre (`metadata`) donde anotar con qué
  registro del sistema externo se corresponde cada uno, sin tocar la estructura
  de la base.
- **Trazabilidad.** El Historial de Carga registra cada actualización con autor y
  fecha, y no se puede editar. Una carga automática queda auditada igual que una
  manual: se ve qué cambió, cuándo y por qué vía, y se puede volver atrás.
- **Permisos acotados.** Se le puede dar a cada dirección una credencial que solo
  escriba sobre sus propios indicadores. Si esa credencial se filtra, no sirve
  para tocar el POA de nadie más.
- **Proceso programado.** Ya hay uno corriendo dos veces por día, que se
  reutiliza para las sincronizaciones periódicas.

Lo que **no** depende de nosotros: que cada sistema pueda exportar o exponer su
dato. Ahí es donde la respuesta deja de ser técnica y pasa a ser una gestión con
cada dirección.

---

## 5. Lo que necesitamos saber de cada dirección

No se puede presupuestar en abstracto. Por cada dirección con sistema propio,
cinco preguntas:

1. **¿Qué sistema es y quién lo mantiene?** Concretamente: ¿hay alguien que pueda
   programarle algo, o es un sistema cerrado que nadie puede tocar? Esta sola
   respuesta descarta la mitad de las opciones.
2. **¿Qué indicador del POA sale de ahí?** No "los datos de la dirección", sino
   cuáles de sus indicadores concretos. Si no se puede señalar el indicador, no
   hay nada que integrar todavía.
3. **¿Puede exportar a Excel, o tiene alguna consulta que se pueda llamar desde
   afuera?**
4. **¿Cada cuánto cambia ese dato?** Un dato que se actualiza una vez por mes no
   necesita nada automático.
5. **¿Ese dato incluye información de personas?** Ver la advertencia del punto 7.

---

## 6. Recomendación

**Empezar por una dirección, no por todas.**

Una integración genérica que sirva para cualquier sistema es más caro y más
frágil que cuatro integraciones concretas, y se termina construyendo sobre
supuestos que ninguna dirección cumple.

Lo concreto:

1. Elegir **una** dirección que cumpla las tres condiciones: muchos indicadores
   (de las de la tabla del punto 2), sistema propio, y alguien que pueda tocar
   ese sistema.
2. Hacerla con la **opción B**, que es la que después escala.
3. Medir cuánto trabajo ahorró de verdad, con el área usándola un período
   completo.
4. Recién entonces decidir si se replica, y a cuáles.

Si ninguna dirección cumple las tres condiciones, la respuesta honesta es que
todavía no conviene: se hace la **opción A** con la que más indicadores tenga y
se deja el resto como está.

---

## 7. Una advertencia sobre datos personales

Hoy PlanIA guarda **indicadores agregados**: cantidades, porcentajes, montos. No
guarda registros de personas.

Varios de los sistemas que podrían integrarse manejan otra cosa. Salud, Salud
Ambiental o las áreas de asistencia trabajan con datos de personas, algunos
sensibles.

La distinción importa y conviene fijarla ahora, antes de la primera integración:

- Traer **el número ya calculado** ("3.412 atenciones en el período") no cambia
  nada de lo que PlanIA custodia hoy.
- Traer **los registros** para calcularlo acá sí lo cambia: PlanIA pasaría a
  guardar datos personales, con todo lo que eso implica en resguardos, permisos y
  responsabilidad.

**La recomendación es que el cálculo quede siempre del lado del sistema de
origen, y que a PlanIA llegue solamente el resultado.** Es más simple, más
barato, y deja a PlanIA siendo lo que es: un sistema de seguimiento de la
planificación, no un repositorio de datos de gestión.

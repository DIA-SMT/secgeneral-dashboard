import type { Tool } from "@anthropic-ai/sdk/resources/messages";

export const chatTools: Tool[] = [
  {
    name: "buscar_proyectos",
    description:
      "Busca proyectos del POA por unidad organizacional, texto o estado de seguimiento. Usa esto cuando el usuario pregunta por proyectos de un área, busca uno por nombre, o quiere saber cuáles no tienen reportes.",
    input_schema: {
      type: "object" as const,
      properties: {
        unidad_id: {
          type: "string",
          description: "UUID de la unidad organizacional. Obtenerlo de listar_unidades si solo se conoce el nombre.",
        },
        texto: {
          type: "string",
          description: "Texto libre para buscar en nombre o código del proyecto.",
        },
        solo_sin_seguimiento: {
          type: "boolean",
          description: "Si es true, solo devuelve proyectos sin ningún avance cargado.",
        },
      },
    },
  },
  {
    name: "obtener_detalle_proyecto",
    description:
      "Obtiene el detalle completo de un proyecto: datos generales, todas sus metas con estado y valores, y todos sus hitos. Usa esto cuando el usuario pregunta por un proyecto específico.",
    input_schema: {
      type: "object" as const,
      properties: {
        proyecto_id: {
          type: "string",
          description: "UUID del proyecto.",
        },
      },
      required: ["proyecto_id"],
    },
  },
  {
    name: "listar_metas_pendientes",
    description:
      "Lista metas que necesitan actualización, ordenadas por urgencia. Incluye metas sin primer reporte y metas con reporte desactualizado. Usa esto cuando el usuario pregunta qué tiene que cargar, qué le falta, o qué está pendiente.",
    input_schema: {
      type: "object" as const,
      properties: {
        unidad_id: {
          type: "string",
          description: "UUID de la unidad organizacional para filtrar.",
        },
        dias_sin_actualizar: {
          type: "number",
          description: "Cantidad de días sin reporte para considerar pendiente. Default: 14.",
        },
      },
    },
  },
  {
    name: "listar_hitos_proximos",
    description:
      "Lista hitos pendientes: próximos a vencer y/o ya vencidos. Usa esto cuando el usuario pregunta por hitos, fechas, vencimientos o agenda.",
    input_schema: {
      type: "object" as const,
      properties: {
        dias: {
          type: "number",
          description: "Ventana en días hacia adelante. Default: 30.",
        },
        unidad_id: {
          type: "string",
          description: "UUID de la unidad para filtrar.",
        },
        incluir_vencidos: {
          type: "boolean",
          description: "Si es true, incluye hitos con fecha ya pasada que no fueron completados.",
        },
      },
    },
  },
  {
    name: "obtener_resumen_area",
    description:
      "Obtiene un resumen ejecutivo de una unidad organizacional: cantidad de proyectos, distribución de semáforos, metas sin reporte, hitos. Usa esto para consultas de estado general de un área o para el modo ejecutivo.",
    input_schema: {
      type: "object" as const,
      properties: {
        unidad_id: {
          type: "string",
          description: "UUID de la unidad organizacional.",
        },
      },
      required: ["unidad_id"],
    },
  },
  {
    name: "listar_unidades",
    description:
      "Lista todas las unidades organizacionales (secretaría, subsecretarías, direcciones) con su ID. Usa esto para identificar el UUID de un área cuando el usuario la menciona por nombre.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  // --- Tools de acción V1.1 ---
  {
    name: "proponer_carga_avance",
    description:
      "Arma una propuesta de carga de avance sobre una meta. NO ejecuta la carga: solo prepara la propuesta para que el usuario la revise y confirme. Usa esto cuando el usuario describe un avance que quiere cargar.",
    input_schema: {
      type: "object" as const,
      properties: {
        meta_id: {
          type: "string",
          description: "UUID de la meta sobre la que se carga el avance.",
        },
        valor_numerico: {
          type: "number",
          description: "Valor numérico del avance (para metas cuantitativas).",
        },
        valor_cualitativo: {
          type: "string",
          description: "Nivel cualitativo del avance (para metas cualitativas).",
        },
        observacion: {
          type: "string",
          description: "Observación o comentario sobre el avance.",
        },
      },
      required: ["meta_id"],
    },
  },
  {
    name: "confirmar_carga_avance",
    description:
      "Ejecuta una propuesta de carga de avance previamente armada. SOLO invocar cuando el usuario confirmó explícitamente la propuesta en su último mensaje. Si no hay confirmación clara, NO usar esta tool.",
    input_schema: {
      type: "object" as const,
      properties: {
        propuesta_id: {
          type: "string",
          description: "UUID de la propuesta a confirmar.",
        },
      },
      required: ["propuesta_id"],
    },
  },
  {
    name: "proponer_completar_hito",
    description:
      "Arma una propuesta para marcar un hito como completado. NO ejecuta el cambio: solo prepara la propuesta para revisión del usuario.",
    input_schema: {
      type: "object" as const,
      properties: {
        hito_id: {
          type: "string",
          description: "UUID del hito a completar.",
        },
        observacion: {
          type: "string",
          description: "Observación o comentario sobre la completitud del hito.",
        },
      },
      required: ["hito_id"],
    },
  },
  {
    name: "confirmar_completar_hito",
    description:
      "Ejecuta la completitud de un hito previamente propuesta. SOLO invocar cuando el usuario confirmó explícitamente. Si no hay confirmación clara, NO usar esta tool.",
    input_schema: {
      type: "object" as const,
      properties: {
        propuesta_id: {
          type: "string",
          description: "UUID de la propuesta a confirmar.",
        },
      },
      required: ["propuesta_id"],
    },
  },
  {
    name: "cancelar_propuesta",
    description:
      "Cancela una propuesta de carga pendiente. Usar cuando el usuario rechaza o cancela una propuesta.",
    input_schema: {
      type: "object" as const,
      properties: {
        propuesta_id: {
          type: "string",
          description: "UUID de la propuesta a cancelar.",
        },
      },
      required: ["propuesta_id"],
    },
  },

  // --- Tools de Indicadores (V2) ---
  {
    name: "obtener_indicadores_de_meta",
    description:
      "Lista los indicadores medibles de una meta específica con sus valores actuales, objetivos y semáforo. Usar cuando el usuario pregunta por los indicadores de una meta, o necesita ver el detalle de medición.",
    input_schema: {
      type: "object" as const,
      properties: {
        meta_id: { type: "string", description: "UUID de la meta." },
      },
      required: ["meta_id"],
    },
  },
  {
    name: "actualizar_indicador",
    description:
      "Actualiza el valor actual de un indicador. Esta es una acción directa (no requiere propuesta intermedia) pero conviene confirmar brevemente con el usuario antes de invocarla. Solo Directores de la unidad y admin_funcional pueden usarla.",
    input_schema: {
      type: "object" as const,
      properties: {
        indicador_id: { type: "string", description: "UUID del indicador." },
        valor_actual: { type: "number", description: "Nuevo valor numérico del indicador." },
      },
      required: ["indicador_id", "valor_actual"],
    },
  },

  // --- Tools de Validación (V2) ---
  {
    name: "listar_avances_pendientes_validacion",
    description:
      "Lista los avances con estado_validacion='pendiente' en el scope del usuario. Útil para Subsecretarios que necesitan ver qué cargas tienen que validar.",
    input_schema: {
      type: "object" as const,
      properties: {
        unidad_id: {
          type: "string",
          description: "UUID de la subsecretaría o dirección para filtrar (opcional).",
        },
      },
    },
  },
  {
    name: "validar_avance_chat",
    description:
      "Marca un avance como validado. Solo Subsecretarios o admin_funcional. Confirmar acción con el usuario antes de invocar.",
    input_schema: {
      type: "object" as const,
      properties: {
        avance_id: { type: "string", description: "UUID del avance a validar." },
      },
      required: ["avance_id"],
    },
  },
  {
    name: "observar_avance_chat",
    description:
      "Marca un avance como observado (rechazado) con un motivo. El Director debe corregirlo después. Solo Subsecretarios o admin_funcional. El motivo es obligatorio.",
    input_schema: {
      type: "object" as const,
      properties: {
        avance_id: { type: "string", description: "UUID del avance a observar." },
        motivo: { type: "string", description: "Texto del motivo de la observación (obligatorio)." },
      },
      required: ["avance_id", "motivo"],
    },
  },

  // --- Tools de Agenda Semanal (V2) ---
  {
    name: "obtener_agenda_semana",
    description:
      "Obtiene la agenda semanal de una unidad para una semana específica (lunes a domingo). Si no se pasa fecha_lunes, devuelve la semana actual.",
    input_schema: {
      type: "object" as const,
      properties: {
        unidad_id: { type: "string", description: "UUID de la unidad organizacional." },
        fecha_lunes: {
          type: "string",
          description: "Fecha del lunes de la semana (formato YYYY-MM-DD). Opcional: default es la semana actual.",
        },
      },
      required: ["unidad_id"],
    },
  },
  {
    name: "proponer_actividad_agenda",
    description:
      "Arma una propuesta para agregar una actividad a la agenda semanal de una unidad. NO ejecuta el cambio: prepara la propuesta para confirmación del usuario.",
    input_schema: {
      type: "object" as const,
      properties: {
        unidad_id: { type: "string", description: "UUID de la unidad." },
        dia_semana: {
          type: "number",
          description: "Día de la semana (1=Lunes, 2=Martes, ... 7=Domingo).",
        },
        actividad: { type: "string", description: "Descripción de la actividad." },
        lugar: { type: "string", description: "Lugar donde se realiza (opcional)." },
        horario: {
          type: "string",
          description: 'Horario como texto libre ("08:00", "09:00 a 12:00", "24hs"). Opcional.',
        },
        fecha_lunes: {
          type: "string",
          description: "Fecha del lunes de la semana objetivo (YYYY-MM-DD). Default: semana actual.",
        },
      },
      required: ["unidad_id", "dia_semana", "actividad"],
    },
  },
  {
    name: "confirmar_actividad_agenda",
    description:
      "Ejecuta la propuesta de actividad de agenda previamente armada. SOLO invocar tras confirmación explícita del usuario.",
    input_schema: {
      type: "object" as const,
      properties: {
        propuesta_id: { type: "string", description: "UUID de la propuesta a confirmar." },
      },
      required: ["propuesta_id"],
    },
  },
];

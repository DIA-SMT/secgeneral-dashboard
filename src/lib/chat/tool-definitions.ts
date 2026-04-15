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
];

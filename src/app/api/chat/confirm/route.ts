import { NextRequest, NextResponse } from "next/server";
import * as tools from "@/lib/chat/tools";

export async function POST(req: NextRequest) {
  try {
    const { propuesta_id, action } = (await req.json()) as {
      propuesta_id: string;
      action: "confirmar_avance" | "confirmar_hito" | "cancelar";
    };

    if (!propuesta_id || !action) {
      return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });
    }

    let result: unknown;

    switch (action) {
      case "confirmar_avance":
        result = await tools.confirmarCargaAvance({ propuesta_id });
        break;
      case "confirmar_hito":
        result = await tools.confirmarCompletarHito({ propuesta_id });
        break;
      case "cancelar":
        result = await tools.cancelarPropuesta({ propuesta_id });
        break;
      default:
        return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

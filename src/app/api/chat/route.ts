import { NextRequest, NextResponse } from "next/server";
import { chatTools } from "@/lib/chat/tool-definitions";
import { buildSystemPrompt, type ChatContext } from "@/lib/chat/system-prompt";
import * as tools from "@/lib/chat/tools";

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = "anthropic/claude-sonnet-4.6";

// Tool executor
async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    // --- Lectura ---
    case "buscar_proyectos":
      return tools.buscarProyectos(input as Parameters<typeof tools.buscarProyectos>[0]);
    case "obtener_detalle_proyecto":
      return tools.obtenerDetalleProyecto(input as Parameters<typeof tools.obtenerDetalleProyecto>[0]);
    case "listar_metas_pendientes":
      return tools.listarMetasPendientes(input as Parameters<typeof tools.listarMetasPendientes>[0]);
    case "listar_hitos_proximos":
      return tools.listarHitosProximos(input as Parameters<typeof tools.listarHitosProximos>[0]);
    case "obtener_resumen_area":
      return tools.obtenerResumenArea(input as Parameters<typeof tools.obtenerResumenArea>[0]);
    case "listar_unidades":
      return tools.listarUnidades();
    // --- Acción V1.1 ---
    case "proponer_carga_avance":
      return tools.proponerCargaAvance(input as Parameters<typeof tools.proponerCargaAvance>[0]);
    case "confirmar_carga_avance":
      return tools.confirmarCargaAvance(input as Parameters<typeof tools.confirmarCargaAvance>[0]);
    case "proponer_completar_hito":
      return tools.proponerCompletarHito(input as Parameters<typeof tools.proponerCompletarHito>[0]);
    case "confirmar_completar_hito":
      return tools.confirmarCompletarHito(input as Parameters<typeof tools.confirmarCompletarHito>[0]);
    case "cancelar_propuesta":
      return tools.cancelarPropuesta(input as Parameters<typeof tools.cancelarPropuesta>[0]);
    default:
      return { error: `Tool desconocida: ${name}` };
  }
}

// Convert our tools to OpenAI function format for OpenRouter
function toolsToOpenAI() {
  return chatTools.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));
}

interface OpenRouterMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
}

async function callOpenRouter(messages: OpenRouterMessage[]) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENROUTER_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: toolsToOpenAI(),
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages: userMessages, context } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
      context: ChatContext;
    };

    const systemPrompt = buildSystemPrompt(context);

    // Build OpenRouter messages
    const orMessages: OpenRouterMessage[] = [
      { role: "system", content: systemPrompt },
      ...userMessages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];

    let data = await callOpenRouter(orMessages);
    let iterations = 0;
    const proposals: { propuesta_id: string; tipo: string; [k: string]: unknown }[] = [];

    // Tool use loop
    while (data.choices?.[0]?.finish_reason === "tool_calls" && iterations < 5) {
      iterations++;
      const choice = data.choices[0];
      const toolCalls = choice.message?.tool_calls ?? [];

      // Add assistant message with tool calls
      orMessages.push({
        role: "assistant",
        content: choice.message?.content ?? "",
        tool_calls: toolCalls,
      });

      for (const tc of toolCalls) {
        try {
          const input = JSON.parse(tc.function.arguments);
          const result = await executeTool(tc.function.name, input);

          // Track proposals for frontend rendering
          const r = result as Record<string, unknown>;
          if (r.propuesta_id && (tc.function.name === "proponer_carga_avance" || tc.function.name === "proponer_completar_hito")) {
            proposals.push(r as typeof proposals[number]);
          }

          orMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        } catch (err) {
          orMessages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ error: String(err) }),
          });
        }
      }

      data = await callOpenRouter(orMessages);
    }

    const text = data.choices?.[0]?.message?.content ?? "No pude generar una respuesta.";

    return NextResponse.json({
      response: text,
      proposals: proposals.length > 0 ? proposals : undefined,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const msg = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

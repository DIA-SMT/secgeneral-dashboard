"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { borrarAlerta } from "@/lib/actions";
import { formatFecha } from "@/lib/utils";

export interface AlertaEnviada {
  id: string;
  titulo: string;
  cuerpo: string;
  importante: boolean;
  vigente_hasta: string | null;
  created_at: string;
  creado_por_nombre: string | null;
  destinatarios: number;
  leidas: number;
}

export function AlertasEnviadas({ alertas }: { alertas: AlertaEnviada[] }) {
  const router = useRouter();
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (alertas.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-8 text-center">
        <p className="text-sm text-muted">Todavía no se envió ningún aviso.</p>
      </div>
    );
  }

  const borrar = (id: string) => {
    startTransition(async () => {
      await borrarAlerta(id);
      setConfirmando(null);
      router.refresh();
    });
  };

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      {alertas.map((a) => {
        const vencida = !!a.vigente_hasta && a.vigente_hasta < hoy;
        const pct = a.destinatarios > 0 ? Math.round((a.leidas / a.destinatarios) * 100) : 0;
        return (
          <div
            key={a.id}
            className={`rounded-xl border border-border bg-surface p-4 ${vencida ? "opacity-60" : ""}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {a.importante && <span className="text-warning mr-1">⚠️</span>}
                  {a.titulo}
                </p>
                <p className="text-xs text-muted mt-1 whitespace-pre-line break-words">
                  {a.cuerpo}
                </p>
              </div>
              {confirmando === a.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => borrar(a.id)}
                    disabled={isPending}
                    className="text-xs text-danger font-semibold hover:text-danger/80 disabled:opacity-50"
                  >
                    Sí, borrar
                  </button>
                  <button
                    onClick={() => setConfirmando(null)}
                    className="text-xs text-muted hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmando(a.id)}
                  className="text-xs text-danger hover:text-danger/80 shrink-0"
                >
                  Borrar
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[10px] text-muted">
              <span>{formatFecha(a.created_at)}</span>
              {a.creado_por_nombre && <span>· {a.creado_por_nombre}</span>}
              <span>
                · Leído por {a.leidas} de {a.destinatarios} ({pct}%)
              </span>
              {a.vigente_hasta && (
                <span className={vencida ? "text-muted/70" : ""}>
                  · {vencida ? "Ya no se muestra" : `Se muestra hasta ${formatFecha(a.vigente_hasta)}`}
                </span>
              )}
            </div>

            <div className="mt-2 h-1 rounded-full bg-border overflow-hidden">
              <div className="h-full bg-success transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

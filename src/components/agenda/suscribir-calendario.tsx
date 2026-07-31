"use client";

import { useEffect, useState } from "react";

interface Props {
  unidadId: string;
  unidadNombre: string;
  /** Token de la URL secreta. null => el feed no está configurado en el server. */
  token: string | null;
}

/**
 * "Suscribirse en Google Calendar" (30.07): muestra la URL secreta del feed
 * iCalendar de la unidad para pegarla en Google Calendar. Es de solo lectura;
 * lo que se cargue en PlanIA aparece en el calendario personal, no al revés.
 */
export function SuscribirCalendario({ unidadId, unidadNombre, token }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  // La URL absoluta depende del host desde el que se entre, así que solo se
  // puede armar en el cliente. Se calcula al abrir el panel (en el handler, no
  // en un efecto) para no arrastrar diferencias entre server y cliente.
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 2000);
    return () => clearTimeout(t);
  }, [copiado]);

  if (!token) return null;

  const alternar = () => {
    setUrl(`${window.location.origin}/api/agenda/${unidadId}/calendario.ics?token=${token}`);
    setAbierto((v) => !v);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <button
        onClick={alternar}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-hover transition-colors"
      >
        <span className="flex items-center gap-2">
          <span className="text-base">🔗</span>
          <span className="text-sm font-medium text-foreground">
            Suscribirse en Google Calendar
          </span>
        </span>
        <span className="text-muted text-xs">{abierto ? "▲" : "▼"}</span>
      </button>

      {abierto && (
        <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
          <p className="text-xs text-muted leading-relaxed">
            Esta es la dirección privada del calendario de{" "}
            <span className="text-foreground font-medium">{unidadNombre}</span> y sus
            dependencias. Sirve para verlo desde el celular junto al resto de tus
            calendarios. Es de <span className="text-foreground">solo lectura</span>: lo que
            se carga en PlanIA aparece en Google, pero lo que agregues en Google no vuelve acá.
          </p>

          <div className="flex items-center gap-2">
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 text-[11px] font-mono bg-background border border-border rounded-lg px-2 py-1.5 text-muted"
            />
            <button
              onClick={copiar}
              className="shrink-0 text-xs text-primary border border-primary/30 bg-primary/10 hover:bg-primary/20 rounded-lg px-3 py-1.5"
            >
              {copiado ? "✓ Copiado" : "Copiar"}
            </button>
          </div>

          <ol className="text-xs text-muted space-y-1 list-decimal list-inside">
            <li>Copiá la dirección de arriba.</li>
            <li>
              En Google Calendar (desde la computadora), a la izquierda: <span className="text-foreground">Otros calendarios</span> → <span className="text-foreground">+</span> → <span className="text-foreground">Desde URL</span>.
            </li>
            <li>Pegala y agregá el calendario.</li>
          </ol>

          <p className="text-[11px] text-warning/90 bg-warning/5 border border-warning/20 rounded-lg px-3 py-2">
            No la compartas: cualquiera con esta dirección puede ver la agenda sin
            entrar al sistema. Google actualiza los calendarios externos cada varias
            horas, así que los cambios no se ven al instante.
          </p>
        </div>
      )}
    </div>
  );
}

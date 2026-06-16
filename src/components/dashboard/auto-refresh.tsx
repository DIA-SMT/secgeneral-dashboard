"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  /** Intervalo de refresco en segundos (default 60) */
  intervalSegundos?: number;
}

/**
 * Refresca los Server Components de la página llamando a router.refresh()
 * cada N segundos, para reflejar avances cargados por otras áreas sin que
 * el usuario tenga que recargar manualmente.
 *
 * Pausa el refresco cuando la pestaña no está visible (ahorra requests) y
 * lo dispara una vez al volver a enfocar la pestaña.
 */
export function AutoRefresh({ intervalSegundos = 60 }: Props) {
  const router = useRouter();
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date>(new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const refrescar = () => {
      if (document.visibilityState === "visible") {
        router.refresh();
        setUltimaActualizacion(new Date());
      }
    };

    timerRef.current = setInterval(refrescar, intervalSegundos * 1000);

    const onVisible = () => {
      if (document.visibilityState === "visible") refrescar();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalSegundos]);

  return (
    <span className="text-[10px] text-muted/60 inline-flex items-center gap-1" title="Los datos se actualizan automáticamente">
      <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
      Actualización automática · {ultimaActualizacion.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}

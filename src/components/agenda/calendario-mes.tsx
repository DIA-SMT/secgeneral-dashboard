"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function lunesDe(fecha: Date): string {
  const d = new Date(fecha);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

interface Props {
  semanaActual: string; // YYYY-MM-DD (lunes seleccionado)
}

export function CalendarioMes({ semanaActual }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [abierto, setAbierto] = useState(false);

  const lunesSel = new Date(semanaActual + "T00:00:00");
  const [mesVista, setMesVista] = useState(() => new Date(lunesSel.getFullYear(), lunesSel.getMonth(), 1));

  const irASemana = (fecha: Date) => {
    const lunes = lunesDe(fecha);
    const params = new URLSearchParams(searchParams.toString());
    params.set("semana", lunes);
    router.push(`/agenda?${params.toString()}`, { scroll: false });
    setAbierto(false);
  };

  // Construir grilla del mes
  const primerDia = new Date(mesVista.getFullYear(), mesVista.getMonth(), 1);
  const offset = (primerDia.getDay() + 6) % 7; // lunes=0
  const diasEnMes = new Date(mesVista.getFullYear(), mesVista.getMonth() + 1, 0).getDate();
  const celdas: (Date | null)[] = [];
  for (let i = 0; i < offset; i++) celdas.push(null);
  for (let d = 1; d <= diasEnMes; d++) celdas.push(new Date(mesVista.getFullYear(), mesVista.getMonth(), d));

  const hoy = new Date();
  const hoyStr = hoy.toISOString().slice(0, 10);
  const lunesSelStr = lunesDe(lunesSel);

  const mismaSemana = (fecha: Date) => lunesDe(fecha) === lunesSelStr;

  return (
    <div className="relative">
      <button
        onClick={() => setAbierto((v) => !v)}
        className="text-xs text-foreground border border-border rounded-lg px-3 py-1.5 hover:border-primary/40 inline-flex items-center gap-1.5"
      >
        📅 {lunesSel.toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric" })}
        <span className="text-muted">▾</span>
      </button>

      {abierto && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setAbierto(false)} />
          <div className="absolute right-0 z-40 mt-2 w-72 rounded-xl border border-border bg-surface shadow-lg p-3">
            {/* Header navegación de mes */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setMesVista(new Date(mesVista.getFullYear(), mesVista.getMonth() - 1, 1))}
                className="text-muted hover:text-foreground px-2"
              >
                ‹
              </button>
              <span className="text-sm font-semibold text-foreground">
                {MESES[mesVista.getMonth()]} {mesVista.getFullYear()}
              </span>
              <button
                onClick={() => setMesVista(new Date(mesVista.getFullYear(), mesVista.getMonth() + 1, 1))}
                className="text-muted hover:text-foreground px-2"
              >
                ›
              </button>
            </div>

            {/* Encabezado de días */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DIAS.map((d) => (
                <div key={d} className="text-[9px] text-muted text-center font-medium">{d}</div>
              ))}
            </div>

            {/* Días */}
            <div className="grid grid-cols-7 gap-1">
              {celdas.map((fecha, i) => {
                if (!fecha) return <div key={i} />;
                const fechaStr = fecha.toISOString().slice(0, 10);
                const esHoy = fechaStr === hoyStr;
                const enSemanaSel = mismaSemana(fecha);
                return (
                  <button
                    key={i}
                    onClick={() => irASemana(fecha)}
                    className={`h-8 rounded text-xs transition-colors ${
                      enSemanaSel
                        ? "bg-primary/20 text-primary font-semibold"
                        : "hover:bg-surface-hover text-foreground"
                    } ${esHoy ? "ring-1 ring-primary" : ""}`}
                  >
                    {fecha.getDate()}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => irASemana(new Date())}
              className="w-full mt-3 text-xs text-primary hover:text-primary-light border-t border-border pt-2"
            >
              Ir a la semana actual
            </button>
          </div>
        </>
      )}
    </div>
  );
}

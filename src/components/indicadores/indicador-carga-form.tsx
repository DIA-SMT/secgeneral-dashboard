"use client";

import { useState, useTransition } from "react";
import { actualizarIndicador } from "@/lib/actions";

interface Props {
  indicadorId: string;
  proyectoId: string;
  valorActual: number | null;
  valorActualTexto?: string | null;
  valorObjetivo: number | null;
  valorObjetivoTexto?: string | null;
  unidadMedida: string | null;
  observacion?: string | null;
  puedeCargar: boolean;
}

type Modo = "numerico" | "texto";

export function IndicadorCargaForm({
  indicadorId,
  proyectoId,
  valorActual,
  valorActualTexto,
  valorObjetivo,
  valorObjetivoTexto,
  unidadMedida,
  observacion: obsInicial,
  puedeCargar,
}: Props) {
  const [open, setOpen] = useState(false);
  const [modo, setModo] = useState<Modo>(
    valorActualTexto != null || valorObjetivoTexto != null ? "texto" : "numerico"
  );
  const [valorNum, setValorNum] = useState(valorActual?.toString() ?? "");
  const [valorTxt, setValorTxt] = useState(valorActualTexto ?? "");
  const [objNum, setObjNum] = useState(valorObjetivo?.toString() ?? "");
  const [objTxt, setObjTxt] = useState(valorObjetivoTexto ?? "");
  const [unidad, setUnidad] = useState(unidadMedida ?? "");
  const [obs, setObs] = useState(obsInicial ?? "");
  const [estadoTexto, setEstadoTexto] = useState<"verde" | "amarillo" | "rojo">("amarillo");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const submit = () => {
    setError(null);
    setSaved(false);

    if (modo === "numerico") {
      const valorTrim = valorNum.trim();
      const objTrim = objNum.trim();
      if (valorTrim === "" && objTrim === "") {
        setError("Ingresá un valor actual y/o un objetivo.");
        return;
      }
      // Campo vacío ⇒ null (no 0). Un 0 espurio marcaría el indicador como
      // "en ejecución" y lo contaría como avance aunque no haya dato cargado.
      const num = valorTrim === "" ? null : Number(valorTrim);
      if (num != null && !isFinite(num)) {
        setError("Ingresá un número válido (sin signo %).");
        return;
      }
      startTransition(async () => {
        const r = await actualizarIndicador({
          indicador_id: indicadorId,
          valor_actual: num,
          valor_actual_texto: null,
          valor_objetivo: objTrim !== "" && isFinite(Number(objTrim)) ? Number(objTrim) : null,
          valor_objetivo_texto: null,
          unidad_medida: unidad || null,
          observacion: obs || null,
          proyecto_id: proyectoId,
        });
        if (r.success) {
          setSaved(true);
          setTimeout(() => setOpen(false), 1000);
        } else {
          setError(r.error ?? "Error");
        }
      });
    } else {
      if (!valorTxt.trim()) {
        setError("Ingresá un valor (ej. Sí, No, Realizado).");
        return;
      }
      startTransition(async () => {
        const r = await actualizarIndicador({
          indicador_id: indicadorId,
          valor_actual: null,
          valor_actual_texto: valorTxt.trim(),
          // Si no escribieron un objetivo textual, NO se mandan estos campos:
          // mandarlos en null borraba el objetivo numérico que ya tenía cargado
          // el indicador y dejaba el avance sin contra qué medirse (03.08).
          ...(objTxt.trim()
            ? { valor_objetivo: null, valor_objetivo_texto: objTxt.trim() }
            : {}),
          unidad_medida: unidad || null,
          observacion: obs || null,
          estado_semaforo_override: estadoTexto,
          proyecto_id: proyectoId,
        });
        if (r.success) {
          setSaved(true);
          setTimeout(() => setOpen(false), 1000);
        } else {
          setError(r.error ?? "Error");
        }
      });
    }
  };

  if (!puedeCargar) {
    return (
      <p className="text-xs text-muted italic">
        Solo el Director de esta unidad o un Admin Funcional puede cargar este indicador.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-sm bg-primary/20 text-primary border border-primary/30 rounded-lg px-4 py-2 hover:bg-primary/30 transition-colors"
      >
        ✎ Cargar / actualizar valor
      </button>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-background border border-border rounded-lg">
      {/* Tipo de valor */}
      <div>
        <p className="text-xs text-muted uppercase tracking-wider mb-1.5">Tipo de valor</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setModo("numerico")}
            className={`text-xs px-3 py-1 rounded border ${
              modo === "numerico"
                ? "bg-primary/20 text-primary border-primary/30"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            🔢 Numérico
          </button>
          <button
            type="button"
            onClick={() => setModo("texto")}
            className={`text-xs px-3 py-1 rounded border ${
              modo === "texto"
                ? "bg-primary/20 text-primary border-primary/30"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            🔤 Texto (Sí/No, Realizado)
          </button>
        </div>
      </div>

      {/* Valor */}
      {modo === "numerico" ? (
        <div>
          <label className="text-xs text-muted uppercase tracking-wider">
            Valor actual {unidad && <span>({unidad})</span>}
          </label>
          <input
            type="number"
            step="any"
            value={valorNum}
            onChange={(e) => setValorNum(e.target.value)}
            autoFocus
            placeholder={objNum !== "" ? `Objetivo: ${objNum}` : "Ej: 45"}
            className="mt-1 w-full text-sm bg-surface border border-border rounded px-3 py-2 text-foreground"
          />
          <p className="text-[10px] text-muted mt-1">
            Para porcentajes ingresá el número sin el signo % (ej. 45 = 45%).
          </p>
          <label className="text-xs text-muted uppercase tracking-wider mt-3 block">
            Objetivo / meta a alcanzar {unidad && <span>({unidad})</span>}
          </label>
          <input
            type="number"
            step="any"
            value={objNum}
            onChange={(e) => setObjNum(e.target.value)}
            placeholder="Ej: 100 (valor a alcanzar)"
            className="mt-1 w-full text-sm bg-surface border border-border rounded px-3 py-2 text-foreground"
          />
          <p className="text-[10px] text-muted mt-1">
            El semáforo se calcula como valor actual ÷ objetivo. Si lo dejás vacío, queda en ejecución.
          </p>
        </div>
      ) : (
        <>
          <div>
            <label className="text-xs text-muted uppercase tracking-wider">Valor actual (texto)</label>
            <input
              type="text"
              value={valorTxt}
              onChange={(e) => setValorTxt(e.target.value)}
              autoFocus
              placeholder='Ej: "Sí", "No", "Realizado", "En curso"'
              className="mt-1 w-full text-sm bg-surface border border-border rounded px-3 py-2 text-foreground"
            />
            <label className="text-xs text-muted uppercase tracking-wider mt-3 block">
              Objetivo (texto, opcional)
            </label>
            <input
              type="text"
              value={objTxt}
              onChange={(e) => setObjTxt(e.target.value)}
              placeholder='Ej: "Actividad realizada", "Sí"'
              className="mt-1 w-full text-sm bg-surface border border-border rounded px-3 py-2 text-foreground"
            />
          </div>
          <div>
            <label className="text-xs text-muted uppercase tracking-wider">Estado del avance</label>
            <div className="flex gap-1 mt-1">
              <button
                type="button"
                onClick={() => setEstadoTexto("verde")}
                className={`text-xs px-3 py-1 rounded border ${
                  estadoTexto === "verde"
                    ? "bg-success/20 text-success border-success/30"
                    : "border-border text-muted"
                }`}
              >
                🟢 Finalizado
              </button>
              <button
                type="button"
                onClick={() => setEstadoTexto("amarillo")}
                className={`text-xs px-3 py-1 rounded border ${
                  estadoTexto === "amarillo"
                    ? "bg-warning/20 text-warning border-warning/30"
                    : "border-border text-muted"
                }`}
              >
                🟡 En ejecución
              </button>
              <button
                type="button"
                onClick={() => setEstadoTexto("rojo")}
                className={`text-xs px-3 py-1 rounded border ${
                  estadoTexto === "rojo"
                    ? "bg-info/20 text-info border-info/30"
                    : "border-border text-muted"
                }`}
              >
                🔵 No iniciado
              </button>
            </div>
          </div>
        </>
      )}

      {/* Unidad de medida (solo numérico) */}
      {modo === "numerico" && (
        <div>
          <label className="text-xs text-muted uppercase tracking-wider">
            Unidad de medida (opcional)
          </label>
          <input
            type="text"
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
            placeholder="Ej: %, días, personas, atenciones, capacitaciones"
            className="mt-1 w-full text-sm bg-surface border border-border rounded px-3 py-2 text-foreground"
          />
        </div>
      )}

      {/* Observación */}
      <div>
        <label className="text-xs text-muted uppercase tracking-wider">Observación (opcional)</label>
        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          rows={2}
          placeholder="Nota sobre el avance reportado..."
          className="mt-1 w-full text-sm bg-surface border border-border rounded px-3 py-2 text-foreground"
        />
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      {saved && <p className="text-xs text-success">✓ Guardado correctamente</p>}

      <div className="flex gap-2 pt-1">
        <button
          onClick={submit}
          disabled={isPending}
          className="text-sm bg-primary text-white rounded px-4 py-1.5 hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="text-sm text-muted hover:text-foreground"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

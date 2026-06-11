"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { crearFichaPrisma, editarFichaPrisma } from "@/lib/actions";
import type { FichaPrisma } from "@/types/database";

interface Props {
  direccionNombre: string;
  secretariaNombre?: string | null;
  ficha?: FichaPrisma; // si viene, es edición
}

const CAMPOS: { key: keyof FormState; letra: string; label: string; help: string; rows: number }[] = [
  { key: "programa", letra: "P", label: "Programa / Proyecto", help: "Nombre del programa o proyecto planificado para 2027.", rows: 2 },
  { key: "relevancia", letra: "R", label: "Relevancia (descripción y objetivo)", help: "Por qué es importante. Descripción y objetivo del proyecto.", rows: 4 },
  { key: "indicador", letra: "I", label: "Indicador", help: "Cómo se va a medir el avance/cumplimiento.", rows: 2 },
  { key: "secretaria", letra: "S", label: "Secretaría", help: "Secretaría a la que pertenece.", rows: 1 },
  { key: "meta_anual", letra: "M", label: "Meta anual", help: "Meta concreta a alcanzar durante 2027.", rows: 2 },
  { key: "ancla", letra: "A", label: "Ancla (línea de base)", help: "Punto de partida / valor actual de referencia.", rows: 2 },
];

interface FormState {
  codigo: string;
  programa: string;
  relevancia: string;
  indicador: string;
  secretaria: string;
  meta_anual: string;
  ancla: string;
}

export function FichaForm({ direccionNombre, secretariaNombre, ficha }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const esEdicion = !!ficha;

  const [form, setForm] = useState<FormState>({
    codigo: ficha?.codigo ?? "",
    programa: ficha?.programa ?? "",
    relevancia: ficha?.relevancia ?? "",
    indicador: ficha?.indicador ?? "",
    secretaria: ficha?.secretaria ?? secretariaNombre ?? "",
    meta_anual: ficha?.meta_anual ?? "",
    ancla: ficha?.ancla ?? "",
  });

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    setError(null);
    if (!form.programa.trim()) {
      setError("El campo Programa / Proyecto es obligatorio.");
      return;
    }
    startTransition(async () => {
      const payload = {
        codigo: form.codigo || null,
        programa: form.programa,
        relevancia: form.relevancia || null,
        indicador: form.indicador || null,
        secretaria: form.secretaria || null,
        meta_anual: form.meta_anual || null,
        ancla: form.ancla || null,
      };
      const r = esEdicion
        ? await editarFichaPrisma(ficha!.id, payload)
        : await crearFichaPrisma(payload);
      if (r.success) {
        router.push("/poa-2027/mis-fichas");
      } else {
        setError(r.error ?? "Error al guardar");
      }
    });
  };

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Cabecera tipo ficha */}
      <div className="bg-primary/10 border-b border-border p-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted uppercase tracking-wider w-24">Dirección:</span>
          <span className="text-sm font-semibold text-foreground">{direccionNombre}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted uppercase tracking-wider w-24">Código:</span>
          <input
            type="text"
            value={form.codigo}
            onChange={(e) => set("codigo", e.target.value)}
            placeholder="Código identificador (opcional)"
            className="flex-1 text-sm bg-background border border-border rounded px-2 py-1 text-foreground"
          />
        </div>
      </div>

      {/* Campos PRISMA */}
      <div className="divide-y divide-border">
        {CAMPOS.map((campo) => (
          <div key={campo.key} className="flex flex-col sm:flex-row gap-3 p-4">
            <div className="sm:w-48 shrink-0">
              <div className="flex items-center gap-2">
                <span className="h-7 w-7 rounded bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
                  {campo.letra}
                </span>
                <span className="text-sm font-semibold text-foreground">{campo.label}</span>
              </div>
              <p className="text-[10px] text-muted mt-1 sm:ml-9">{campo.help}</p>
            </div>
            <div className="flex-1">
              {campo.rows === 1 ? (
                <input
                  type="text"
                  value={form[campo.key]}
                  onChange={(e) => set(campo.key, e.target.value)}
                  className="w-full text-sm bg-background border border-border rounded px-3 py-2 text-foreground"
                />
              ) : (
                <textarea
                  value={form[campo.key]}
                  onChange={(e) => set(campo.key, e.target.value)}
                  rows={campo.rows}
                  className="w-full text-sm bg-background border border-border rounded px-3 py-2 text-foreground"
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-sm text-danger px-4 pt-3">{error}</p>}

      <div className="flex gap-2 p-4 border-t border-border bg-border/10">
        <button
          onClick={submit}
          disabled={isPending}
          className="text-sm bg-primary text-white rounded-lg px-5 py-2 hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear ficha"}
        </button>
        <button
          onClick={() => router.push("/poa-2027/mis-fichas")}
          className="text-sm text-muted hover:text-foreground border border-border rounded-lg px-5 py-2"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

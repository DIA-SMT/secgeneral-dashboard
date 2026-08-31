"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  proponerImputacion,
  confirmarImputacion,
  rechazarImputacion,
  quitarImputacion,
  excluirDelPlanRector,
  readmitirEnPlanRector,
} from "@/lib/actions-plan-rector";
import { SelectorNodo } from "./nodo-rector";
import type { ImputacionProyecto } from "@/lib/plan-rector-comun";

interface Props {
  proyectoId: string;
  imputaciones: ImputacionProyecto[];
  excluido: { motivo: string } | null;
  nodos: { id: string; tipo: string; ruta: string }[];
  /** Puede proponer: quien carga el POA de la unidad del proyecto. */
  puedeProponer: boolean;
  /** Puede confirmar, rechazar y declarar fuera del plan: admin_funcional. */
  esAdmin: boolean;
}

/**
 * Tarjeta "Plan Rector" en la ficha del proyecto.
 *
 * Es donde se produce el dato que el Excel del cliente no trajo. Cada dirección
 * imputa sus propios proyectos —es la única que sabe qué hace el proyecto que en
 * el sistema se llama sólo "Comunicación"— y Planificación confirma.
 */
export function ImputacionCard({
  proyectoId,
  imputaciones,
  excluido,
  nodos,
  puedeProponer,
  esAdmin,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [nodoId, setNodoId] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [motivoExclusion, setMotivoExclusion] = useState("");
  const [excluyendo, setExcluyendo] = useState(false);

  const correr = (fn: () => Promise<{ success: boolean; error?: string }>, alTerminar?: () => void) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (r.success) {
        alTerminar?.();
        router.refresh();
      } else {
        setError(r.error ?? "No se pudo completar la acción");
      }
    });
  };

  const confirmadas = imputaciones.filter((i) => i.estado === "confirmado");
  const propuestas = imputaciones.filter((i) => i.estado === "propuesto");
  const rechazadas = imputaciones.filter((i) => i.estado === "rechazado");

  return (
    <section className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-foreground">Plan Rector</h2>
        <Link href="/plan-rector" className="text-[11px] text-primary hover:underline shrink-0">
          Ver el plan
        </Link>
      </div>

      {excluido ? (
        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2">
          <p className="text-xs font-semibold text-warning">Declarado fuera del Plan Rector</p>
          <p className="text-sm text-foreground/90">{excluido.motivo}</p>
          {esAdmin && (
            <button
              onClick={() => correr(() => readmitirEnPlanRector({ proyecto_id: proyectoId }))}
              disabled={isPending}
              className="text-[11px] text-muted hover:text-foreground underline disabled:opacity-50"
            >
              Deshacer: volver a dejarlo pendiente
            </button>
          )}
        </div>
      ) : (
        <>
          {confirmadas.length === 0 && propuestas.length === 0 && (
            <p className="text-xs text-muted">
              Este proyecto todavía no está imputado a ningún eje del Plan Rector.
            </p>
          )}

          {confirmadas.length > 0 && (
            <ul className="space-y-1.5">
              {confirmadas.map((i) => (
                <li
                  key={i.id}
                  className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 flex items-start gap-2"
                >
                  <span className="text-success text-xs mt-0.5 shrink-0">✓</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">{i.ruta}</p>
                    {i.principal && (
                      <p className="text-[10px] text-success font-semibold uppercase tracking-wider mt-0.5">
                        Vínculo principal · es el que cuenta para los totales
                      </p>
                    )}
                  </div>
                  {esAdmin && !i.principal && (
                    <button
                      onClick={() => correr(() => confirmarImputacion({ vinculo_id: i.id, principal: true }))}
                      disabled={isPending}
                      className="text-[11px] text-primary hover:underline shrink-0 disabled:opacity-50"
                      title="Marcarlo como el vínculo que cuenta para los totales"
                    >
                      Hacer principal
                    </button>
                  )}
                  {esAdmin && (
                    <button
                      onClick={() => correr(() => quitarImputacion({ vinculo_id: i.id }))}
                      disabled={isPending}
                      className="text-[11px] text-danger hover:underline shrink-0 disabled:opacity-50"
                    >
                      Quitar
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {propuestas.length > 0 && (
            <ul className="space-y-1.5">
              {propuestas.map((i) => (
                <li
                  key={i.id}
                  className="rounded-lg border border-border bg-background px-3 py-2 space-y-1.5"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-muted text-xs mt-0.5 shrink-0">◌</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{i.ruta}</p>
                      <p className="text-[10px] text-muted uppercase tracking-wider mt-0.5">
                        Propuesto · falta que lo confirme Planificación
                      </p>
                      {i.justificacion && (
                        <p className="text-xs text-muted mt-1">{i.justificacion}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 pl-6">
                    {esAdmin && (
                      <>
                        <button
                          onClick={() =>
                            correr(() =>
                              confirmarImputacion({
                                vinculo_id: i.id,
                                principal: confirmadas.length === 0,
                              })
                            )
                          }
                          disabled={isPending}
                          className="text-[11px] text-success hover:underline disabled:opacity-50"
                        >
                          Confirmar{confirmadas.length === 0 ? " como principal" : ""}
                        </button>
                        <button
                          onClick={() => {
                            const motivo = window.prompt("¿Por qué se rechaza esta imputación?");
                            if (motivo?.trim()) {
                              correr(() => rechazarImputacion({ vinculo_id: i.id, motivo }));
                            }
                          }}
                          disabled={isPending}
                          className="text-[11px] text-danger hover:underline disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                    {!esAdmin && puedeProponer && (
                      <button
                        onClick={() => correr(() => quitarImputacion({ vinculo_id: i.id }))}
                        disabled={isPending}
                        className="text-[11px] text-muted hover:text-foreground underline disabled:opacity-50"
                      >
                        Retirar mi propuesta
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {rechazadas.length > 0 && (
            <details className="text-xs">
              <summary className="text-muted cursor-pointer">
                {rechazadas.length} imputación{rechazadas.length === 1 ? "" : "es"} rechazada
                {rechazadas.length === 1 ? "" : "s"}
              </summary>
              <ul className="mt-1.5 space-y-1 pl-3">
                {rechazadas.map((i) => (
                  <li key={i.id} className="text-muted">
                    <span className="line-through">{i.ruta}</span>
                    {i.justificacion && <span> — {i.justificacion}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {puedeProponer && !abierto && (
            <button
              onClick={() => setAbierto(true)}
              className="text-xs text-primary hover:underline"
            >
              + Imputar a un eje del Plan Rector
            </button>
          )}

          {puedeProponer && abierto && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <SelectorNodo nodos={nodos} value={nodoId} onChange={setNodoId} disabled={isPending} />
              <textarea
                value={justificacion}
                onChange={(e) => setJustificacion(e.target.value)}
                placeholder="Por qué este proyecto aporta a ese eje (opcional, pero ayuda a quien confirma)"
                rows={2}
                className="w-full text-sm bg-background border border-border rounded px-3 py-2"
              />
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    correr(
                      () =>
                        proponerImputacion({
                          proyecto_id: proyectoId,
                          nodo_id: nodoId,
                          justificacion,
                        }),
                      () => {
                        setNodoId("");
                        setJustificacion("");
                        setAbierto(false);
                      }
                    )
                  }
                  disabled={isPending || !nodoId}
                  className="text-sm bg-primary text-white rounded-lg px-4 py-1.5 hover:bg-primary/90 disabled:opacity-50"
                >
                  {esAdmin ? "Proponer" : "Proponer para revisión"}
                </button>
                <button
                  onClick={() => { setAbierto(false); setError(null); }}
                  disabled={isPending}
                  className="text-sm text-muted hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {esAdmin && !excluyendo && confirmadas.length === 0 && (
            <button
              onClick={() => setExcluyendo(true)}
              className="text-[11px] text-muted hover:text-foreground underline"
            >
              Este proyecto no corresponde al Plan Rector
            </button>
          )}

          {esAdmin && excluyendo && (
            <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2">
              <p className="text-xs text-foreground/90">
                Queda registrado como resuelto y no entra en ningún porcentaje.
              </p>
              <input
                value={motivoExclusion}
                onChange={(e) => setMotivoExclusion(e.target.value)}
                placeholder="Motivo (obligatorio): gestión interna, compra propia, efeméride…"
                className="w-full text-sm bg-background border border-border rounded px-3 py-2"
              />
              <div className="flex gap-3">
                <button
                  onClick={() =>
                    correr(
                      () => excluirDelPlanRector({ proyecto_id: proyectoId, motivo: motivoExclusion }),
                      () => { setMotivoExclusion(""); setExcluyendo(false); }
                    )
                  }
                  disabled={isPending || !motivoExclusion.trim()}
                  className="text-sm bg-warning text-white rounded-lg px-4 py-1.5 hover:bg-warning/90 disabled:opacity-50"
                >
                  Declarar fuera del plan
                </button>
                <button
                  onClick={() => { setExcluyendo(false); setError(null); }}
                  disabled={isPending}
                  className="text-sm text-muted hover:text-foreground"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </section>
  );
}

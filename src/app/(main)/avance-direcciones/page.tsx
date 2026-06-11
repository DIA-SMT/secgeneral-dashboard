import { getPeriodoActivo, getProyectos, getUnidades, getIndicadores } from "@/lib/queries";
import { BackButton } from "@/components/layout/back-button";
import Link from "next/link";
import type { Indicador, UnidadOrganizacional } from "@/types/database";

export const revalidate = 0;

interface IndicadorEnDireccion {
  ind: Indicador;
  unidad_id: string;
}

interface ResumenDireccion {
  unidad: UnidadOrganizacional;
  secretaria: UnidadOrganizacional | null;
  totalIndicadores: number;
  conValor: number;
  promedioPct: number; // 0-100
  semaforo: { verde: number; amarillo: number; rojo: number; sin_datos: number };
}

function calcPct(valor: number, objetivo: number): number {
  if (objetivo === 0) return valor >= objetivo ? 100 : 0;
  const raw = (valor / objetivo) * 100;
  return Math.max(0, Math.min(100, raw));
}

export default async function AvanceDireccionesPage() {
  const [periodo, proyectos, unidades, indicadores] = await Promise.all([
    getPeriodoActivo(),
    getProyectos((await getPeriodoActivo()).id),
    getUnidades(),
    getIndicadores(),
  ]);

  const proyectoUnidad = new Map(proyectos.map((p) => [p.id, p.unidad_id]));
  const unidadById = new Map(unidades.map((u) => [u.id, u]));

  // Encontrar ancestro Secretaría
  const findSecretaria = (unidadId: string): UnidadOrganizacional | null => {
    let cur: UnidadOrganizacional | null = unidadById.get(unidadId) ?? null;
    while (cur && cur.parent_id) cur = unidadById.get(cur.parent_id) ?? null;
    return cur;
  };

  // Mapear indicador → unidad
  type IndicadorConRel = Indicador & { meta?: { proyecto?: { id: string; unidad_id: string } } };
  const indicadoresConUnidad: IndicadorEnDireccion[] = [];
  for (const i of indicadores as IndicadorConRel[]) {
    const pyId = i.meta?.proyecto?.id;
    if (!pyId) continue;
    const unidadId = proyectoUnidad.get(pyId);
    if (!unidadId) continue;
    indicadoresConUnidad.push({ ind: i as Indicador, unidad_id: unidadId });
  }

  // Agrupar por dirección
  const porUnidad = new Map<string, Indicador[]>();
  for (const { ind, unidad_id } of indicadoresConUnidad) {
    (porUnidad.get(unidad_id) ?? porUnidad.set(unidad_id, []).get(unidad_id)!).push(ind);
  }

  // Calcular resumen por dirección
  const resumenes: ResumenDireccion[] = [];
  for (const [unidadId, inds] of porUnidad.entries()) {
    const unidad = unidadById.get(unidadId);
    if (!unidad) continue;
    const conValorNumerico = inds.filter(
      (i) => i.valor_actual != null && i.valor_objetivo != null
    );
    const conValorTexto = inds.filter(
      (i) => i.valor_actual_texto && i.valor_actual_texto.trim() !== ""
    );
    const totalIndicadores = inds.length;
    const conValor = conValorNumerico.length + conValorTexto.length;

    let suma = 0;
    let cnt = 0;
    for (const i of conValorNumerico) {
      const pct = calcPct(i.valor_actual!, i.valor_objetivo!);
      suma += pct;
      cnt++;
    }
    // Avances textuales: cada uno aporta según su semáforo
    for (const i of conValorTexto) {
      const pctTxt =
        i.estado_semaforo === "verde"
          ? 100
          : i.estado_semaforo === "amarillo"
          ? 50
          : i.estado_semaforo === "rojo"
          ? 10
          : 0;
      suma += pctTxt;
      cnt++;
    }
    const promedio = cnt > 0 ? Math.round(suma / cnt) : 0;

    const semaforo = { verde: 0, amarillo: 0, rojo: 0, sin_datos: 0 };
    for (const i of inds) {
      const e =
        i.estado_semaforo === "verde"
          ? "verde"
          : i.estado_semaforo === "amarillo"
          ? "amarillo"
          : i.estado_semaforo === "rojo"
          ? "rojo"
          : "sin_datos";
      semaforo[e as keyof typeof semaforo]++;
    }

    resumenes.push({
      unidad,
      secretaria: findSecretaria(unidadId),
      totalIndicadores,
      conValor,
      promedioPct: promedio,
      semaforo,
    });
  }

  // Ordenar por % de avance desc
  resumenes.sort((a, b) => b.promedioPct - a.promedioPct);

  // Agrupar por Secretaría
  const porSecretaria = new Map<string, ResumenDireccion[]>();
  for (const r of resumenes) {
    if (!r.secretaria) continue;
    (porSecretaria.get(r.secretaria.id) ?? porSecretaria.set(r.secretaria.id, []).get(r.secretaria.id)!).push(r);
  }

  // Promedio por secretaría
  const promedioPorSec = new Map<string, number>();
  for (const [secId, lista] of porSecretaria.entries()) {
    const conDatos = lista.filter((l) => l.conValor > 0);
    const avg =
      conDatos.length > 0 ? Math.round(conDatos.reduce((a, b) => a + b.promedioPct, 0) / conDatos.length) : 0;
    promedioPorSec.set(secId, avg);
  }

  const secretarias = Array.from(porSecretaria.keys())
    .map((id) => unidadById.get(id))
    .filter((u): u is UnidadOrganizacional => !!u)
    .sort((a, b) => (a.nombre_corto ?? a.nombre).localeCompare(b.nombre_corto ?? b.nombre));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <BackButton fallback="/dashboard" />
      </div>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Avance por Dirección</h1>
        <p className="text-sm text-muted mt-1">
          Grado de avance de la POA de cada dirección calculado a partir de sus indicadores · {periodo.nombre}
        </p>
      </div>

      {resumenes.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">Sin indicadores cargados todavía</p>
        </div>
      ) : (
        <div className="space-y-8">
          {secretarias.map((sec) => {
            const lista = porSecretaria.get(sec.id) ?? [];
            const promSec = promedioPorSec.get(sec.id) ?? 0;
            return (
              <section key={sec.id}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                      {sec.nombre_corto?.[0] ?? sec.nombre[0]}
                    </div>
                    <h2 className="text-sm font-bold text-foreground">{sec.nombre}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted uppercase tracking-wider">Avance promedio</p>
                    <p className="text-lg font-bold text-foreground">{promSec}%</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {lista
                    .sort((a, b) => b.promedioPct - a.promedioPct)
                    .map((r) => (
                      <DireccionRow key={r.unidad.id} resumen={r} />
                    ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DireccionRow({ resumen }: { resumen: ResumenDireccion }) {
  const pct = resumen.promedioPct;
  const barColor =
    pct >= 80 ? "bg-success" : pct >= 50 ? "bg-warning" : pct > 0 ? "bg-danger" : "bg-muted/30";

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <Link
          href={`/proyectos?dir=${resumen.unidad.id}`}
          className="text-sm font-semibold text-foreground hover:text-primary line-clamp-1 flex-1 min-w-0"
        >
          {resumen.unidad.nombre_corto ?? resumen.unidad.nombre}
        </Link>
        <span className="text-xs text-muted shrink-0">
          {resumen.conValor}/{resumen.totalIndicadores} indicadores con datos
        </span>
        <span className="text-lg font-bold text-foreground shrink-0 w-12 text-right">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-border/30 overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all`}
          style={{ width: `${Math.max(2, pct)}%` }}
        />
      </div>
      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted">
        {resumen.semaforo.verde > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> {resumen.semaforo.verde} finalizados
          </span>
        )}
        {resumen.semaforo.amarillo > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" /> {resumen.semaforo.amarillo} en ejecución
          </span>
        )}
        {resumen.semaforo.rojo > 0 && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-danger" /> {resumen.semaforo.rojo} no iniciados
          </span>
        )}
        {resumen.semaforo.sin_datos > 0 && (
          <span className="flex items-center gap-1 opacity-60">
            <span className="h-1.5 w-1.5 rounded-full bg-muted/50" /> {resumen.semaforo.sin_datos} sin datos
          </span>
        )}
      </div>
    </div>
  );
}

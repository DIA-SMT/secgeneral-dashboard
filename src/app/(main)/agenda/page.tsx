import {
  getUnidades,
  getAgendasSemana,
  getEventosAgenda,
  lunesIso,
  sumarDias,
  type EventoAgenda,
} from "@/lib/queries";
import { getPerfilActual } from "@/lib/auth";
import { coincideBusqueda, esRolGlobal, normalizarBusqueda } from "@/lib/utils";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarioToolbar, type VistaCalendario } from "@/components/agenda/calendario-toolbar";
import { CalendarioVista } from "@/components/agenda/calendario-vista";
import { SuscribirCalendario } from "@/components/agenda/suscribir-calendario";
import { tokenDeUnidad } from "@/lib/ics";
import type { AgendaSemana, UnidadOrganizacional } from "@/types/database";

export const revalidate = 0;

interface Props {
  searchParams: Promise<{
    vista?: string;
    fecha?: string;
    sec?: string;
    sub?: string;
    dir?: string;
    q?: string;
    // Compatibilidad con los links viejos (?semana=YYYY-MM-DD)
    semana?: string;
  }>;
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const esIso = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

export default async function AgendaPage({ searchParams }: Props) {
  const params = await searchParams;

  const hoy = new Date().toISOString().slice(0, 10);
  const vista: VistaCalendario =
    params.vista === "semana" || params.vista === "dia" ? params.vista : "mes";
  const fecha = esIso(params.fecha) ? params.fecha : esIso(params.semana) ? params.semana : hoy;

  // -------------------------------------------------------
  // Rango de días que se muestra según la vista
  // -------------------------------------------------------
  let desde: string;
  let hasta: string;
  let titulo: string;
  let anterior: string;
  let siguiente: string;
  const mesReferencia = Number(fecha.slice(5, 7)) - 1;

  if (vista === "dia") {
    desde = fecha;
    hasta = fecha;
    anterior = sumarDias(fecha, -1);
    siguiente = sumarDias(fecha, 1);
    titulo = new Date(fecha + "T00:00:00").toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } else if (vista === "semana") {
    desde = lunesIso(fecha);
    hasta = sumarDias(desde, 6);
    anterior = sumarDias(desde, -7);
    siguiente = sumarDias(desde, 7);
    titulo = `${Number(desde.slice(8, 10))} – ${Number(hasta.slice(8, 10))} de ${
      MESES[Number(hasta.slice(5, 7)) - 1]
    } ${hasta.slice(0, 4)}`;
  } else {
    const primero = `${fecha.slice(0, 7)}-01`;
    const diasDelMes = new Date(
      Number(fecha.slice(0, 4)),
      Number(fecha.slice(5, 7)),
      0
    ).getDate();
    const ultimo = `${fecha.slice(0, 7)}-${String(diasDelMes).padStart(2, "0")}`;
    desde = lunesIso(primero); // la grilla arranca el lunes de la 1ª semana
    hasta = sumarDias(lunesIso(ultimo), 6); // y termina el domingo de la última
    anterior = sumarDias(primero, -1);
    siguiente = sumarDias(ultimo, 1);
    titulo = `${MESES[mesReferencia]} ${fecha.slice(0, 4)}`;
  }

  const dias: string[] = [];
  for (let d = desde; d <= hasta; d = sumarDias(d, 1)) dias.push(d);

  // -------------------------------------------------------
  // Datos
  // -------------------------------------------------------
  const semanaFoco = lunesIso(fecha); // semana de la lista de fichas de abajo
  const [unidades, eventosRango, agendas, perfil] = await Promise.all([
    getUnidades(),
    getEventosAgenda(desde, hasta),
    getAgendasSemana(semanaFoco),
    getPerfilActual(),
  ]);
  const esGlobal = esRolGlobal(perfil?.rol);

  const sortByName = (a: UnidadOrganizacional, b: UnidadOrganizacional) =>
    (a.nombre_corto ?? a.nombre).localeCompare(b.nombre_corto ?? b.nombre);

  const unidadById = new Map(unidades.map((u) => [u.id, u]));
  const childrenByParent = new Map<string | null, UnidadOrganizacional[]>();
  for (const u of unidades) {
    const key = u.parent_id;
    (childrenByParent.get(key) ?? childrenByParent.set(key, []).get(key)!).push(u);
  }

  // Todas las direcciones (nivel >= 2) descendientes de una unidad
  const direccionesDe = (unidadId: string): UnidadOrganizacional[] => {
    const out: UnidadOrganizacional[] = [];
    const walk = (id: string) => {
      for (const child of childrenByParent.get(id) ?? []) {
        if (child.nivel >= 2) out.push(child);
        walk(child.id);
      }
    };
    walk(unidadId);
    return out.sort(sortByName);
  };

  // Subárbol completo (incluye la propia unidad)
  const subarbol = (unidadId: string): Set<string> => {
    const out = new Set<string>([unidadId]);
    const walk = (id: string) => {
      for (const child of childrenByParent.get(id) ?? []) {
        out.add(child.id);
        walk(child.id);
      }
    };
    walk(unidadId);
    return out;
  };

  // -------------------------------------------------------
  // Filtros: ámbito del usuario + secretaría/subsecretaría/dirección + texto
  // -------------------------------------------------------
  // Quien no tiene acceso global solo ve su árbol; el filtro no puede sacarlo de ahí.
  const ambitoUsuario = !esGlobal && perfil?.unidad_id ? subarbol(perfil.unidad_id) : null;

  const filtroUnidad = params.dir || params.sub || params.sec || null;
  const ambitoFiltro = filtroUnidad ? subarbol(filtroUnidad) : null;

  const unidadVisible = (unidadId: string) =>
    (!ambitoUsuario || ambitoUsuario.has(unidadId)) &&
    (!ambitoFiltro || ambitoFiltro.has(unidadId));

  const termino = normalizarBusqueda(params.q ?? "");
  const coincide = (e: EventoAgenda) =>
    !termino ||
    coincideBusqueda(e.actividad, termino) ||
    coincideBusqueda(e.lugar, termino) ||
    coincideBusqueda(e.observacion, termino) ||
    coincideBusqueda(e.unidad_nombre, termino);

  const eventos = eventosRango.filter((e) => unidadVisible(e.unidad_id) && coincide(e));

  // Color estable por unidad dentro de la vista actual.
  const indicePorUnidad: Record<string, number> = {};
  for (const id of [...new Set(eventos.map((e) => e.unidad_id))].sort()) {
    indicePorUnidad[id] = Object.keys(indicePorUnidad).length;
  }

  // Feed .ics: el del ámbito filtrado, o el del área propia si no es global.
  const unidadSuscripcion = filtroUnidad ?? (!esGlobal ? perfil?.unidad_id ?? null : null);

  // Unidades que puede elegir en los filtros (acotadas a su ámbito)
  const unidadesFiltro = ambitoUsuario
    ? unidades.filter((u) => ambitoUsuario.has(u.id))
    : unidades;

  // -------------------------------------------------------
  // Fichas de la semana (carga de agendas), respetando los mismos filtros
  // -------------------------------------------------------
  const agendasPorUnidad = new Map<string, AgendaSemana>();
  for (const a of agendas) agendasPorUnidad.set(a.unidad_id, a);

  const FichaCard = ({ unidad }: { unidad: UnidadOrganizacional }) => {
    const agenda = agendasPorUnidad.get(unidad.id);
    return (
      <Link
        href={`/agenda/${unidad.id}/${semanaFoco}`}
        className={`block rounded-xl border p-4 hover:border-primary/40 transition-colors ${
          agenda ? "border-success/30 bg-success/5" : "border-border bg-surface"
        }`}
      >
        <p className="text-sm font-semibold text-foreground line-clamp-1">
          {unidad.nombre_corto ?? unidad.nombre}
        </p>
        <p className="text-[10px] text-muted mt-1">
          {agenda
            ? agenda.formato_libre
              ? "Formato libre cargado"
              : `${(agenda as { actividades?: unknown[] }).actividades?.length ?? 0} actividades`
            : "Sin agenda cargada"}
        </p>
      </Link>
    );
  };

  // Direcciones a listar abajo: todas las del ámbito visible.
  const raizFichas = filtroUnidad ?? (ambitoUsuario ? perfil!.unidad_id! : null);
  let direccionesFichas: UnidadOrganizacional[];
  if (raizFichas) {
    const raiz = unidadById.get(raizFichas);
    direccionesFichas =
      raiz && raiz.nivel >= 2 ? [raiz, ...direccionesDe(raizFichas)] : direccionesDe(raizFichas);
  } else {
    direccionesFichas = unidades.filter((u) => u.nivel >= 2).sort(sortByName);
  }

  const semanaLegible = `${Number(semanaFoco.slice(8, 10))} de ${
    MESES[Number(semanaFoco.slice(5, 7)) - 1]
  }`;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <p className="text-sm text-muted mt-1">
            Calendario de actividades de todas las direcciones
          </p>
        </div>
        <Link
          href={`/agenda/cargar?semana=${semanaFoco}`}
          className="text-xs text-primary border border-primary/30 bg-primary/10 hover:bg-primary/20 rounded-lg px-3 py-1.5 self-start"
        >
          + Cargar agenda
        </Link>
      </div>

      <Suspense>
        <CalendarioToolbar
          vista={vista}
          fecha={fecha}
          titulo={titulo}
          unidades={unidadesFiltro}
          sec={params.sec ?? null}
          sub={params.sub ?? null}
          dir={params.dir ?? null}
          q={params.q ?? ""}
          anterior={anterior}
          siguiente={siguiente}
          hoy={hoy}
        />
      </Suspense>

      <CalendarioVista
        vista={vista}
        dias={dias}
        eventos={eventos}
        mesReferencia={mesReferencia}
        hoy={hoy}
        indicePorUnidad={indicePorUnidad}
      />

      {/* Leyenda: qué unidad es cada color */}
      {Object.keys(indicePorUnidad).length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {Object.entries(indicePorUnidad).map(([unidadId, i]) => (
            <span key={unidadId} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
              <span
                className={`h-2 w-2 rounded-full ${
                  ["bg-primary", "bg-success", "bg-accent", "bg-warning", "bg-info"][i % 5]
                }`}
              />
              {unidadById.get(unidadId)?.nombre_corto ??
                unidadById.get(unidadId)?.nombre ??
                "—"}
            </span>
          ))}
        </div>
      )}

      {/* Suscripción al feed del ámbito elegido (o del área propia) */}
      {unidadSuscripcion && (
        <SuscribirCalendario
          unidadId={unidadSuscripcion}
          unidadNombre={
            unidadById.get(unidadSuscripcion)?.nombre_corto ??
            unidadById.get(unidadSuscripcion)?.nombre ??
            "esta área"
          }
          token={tokenDeUnidad(unidadSuscripcion)}
        />
      )}

      {/* Carga de agendas por dirección, para la semana en foco */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-3 border-b border-border pb-2">
          <h2 className="text-sm font-semibold text-foreground">
            Agendas de la semana del {semanaLegible}
          </h2>
          <span className="text-xs text-muted">{direccionesFichas.length} direcciones</span>
        </div>
        {direccionesFichas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {direccionesFichas.map((u) => (
              <FichaCard key={u.id} unidad={u} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No hay direcciones para este filtro.</p>
        )}
      </section>
    </div>
  );
}

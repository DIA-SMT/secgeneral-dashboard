import { getPeriodoActivo, getProyectos, getUnidades, getIndicadores, getMetasDelPeriodo } from "@/lib/queries";
import { getPerfilActual, getScopeUnidades } from "@/lib/auth";
import {
  calcularAvancePorIndicadores,
  coincideBusqueda,
  perfilVeTodo,
  normalizarBusqueda,
  subtreeUnidades,
} from "@/lib/utils";
import type { Meta, UnidadOrganizacional, Indicador } from "@/types/database";
import { ProyectosSearch } from "./search";
import { PoaTree, type PoaIndicador, type PoaMeta, type PoaProyecto } from "@/components/poa/poa-tree";
import { NuevoProyectoForm } from "@/components/poa/nuevo-proyecto-form";
import { Suspense } from "react";

export const revalidate = 0;

interface Props {
  searchParams: Promise<{ q?: string; dir?: string; estado?: string }>;
}

export default async function ProyectosPage({ searchParams }: Props) {
  const params = await searchParams;
  const [periodo, proyectos, unidades, indicadores] = await Promise.all([
    getPeriodoActivo(),
    getProyectos((await getPeriodoActivo()).id),
    getUnidades(),
    getIndicadores(),
  ]);

  const todasMetas = await getMetasDelPeriodo(periodo.id);

  // Perfil + scope para saber si el usuario puede cargar avances
  const perfil = await getPerfilActual();
  const rolesCarga = ["director", "subsecretario", "secretario", "coordinador", "admin_funcional"];
  const puedeCargarBase = !!perfil && rolesCarga.includes(perfil.rol);
  const scopeUnidadesUsuario =
    puedeCargarBase && perfil ? new Set(await getScopeUnidades(perfil)) : null;

  // Mapas
  const metasPorPy = new Map<string, Meta[]>();
  for (const m of (todasMetas ?? []) as Meta[]) {
    (metasPorPy.get(m.proyecto_id) ?? metasPorPy.set(m.proyecto_id, []).get(m.proyecto_id)!).push(m);
  }
  const indPorMeta = new Map<string, Indicador[]>();
  for (const i of indicadores) {
    (indPorMeta.get(i.meta_id) ?? indPorMeta.set(i.meta_id, []).get(i.meta_id)!).push(i);
  }
  const unidadById = new Map(unidades.map((u) => [u.id, u]));
  const childrenByParent = new Map<string | null, UnidadOrganizacional[]>();
  for (const u of unidades) {
    const key = u.parent_id;
    (childrenByParent.get(key) ?? childrenByParent.set(key, []).get(key)!).push(u);
  }

  // Filtrado
  let proyectosFiltrados = proyectos;
  if (params.q) {
    // Búsqueda sin distinguir mayúsculas, tildes ni puntuación (28.07)
    const q = normalizarBusqueda(params.q);
    proyectosFiltrados = proyectosFiltrados.filter(
      (p) =>
        coincideBusqueda(p.nombre, q) ||
        coincideBusqueda(p.codigo, q) ||
        coincideBusqueda(p.unidad?.nombre_corto, q) ||
        coincideBusqueda(p.unidad?.nombre, q)
    );
  }
  if (params.dir) {
    const descendientes = (id: string): string[] => {
      const directos = (childrenByParent.get(id) ?? []).map((u) => u.id);
      return [id, ...directos.flatMap((d) => descendientes(d))];
    };
    const dirIds = new Set(descendientes(params.dir));
    proyectosFiltrados = proyectosFiltrados.filter((p) => dirIds.has(p.unidad_id));
  }
  if (params.estado && params.estado !== "todos") {
    proyectosFiltrados = proyectosFiltrados.filter((p) => {
      const metas = metasPorPy.get(p.id) ?? [];
      const inds = metas.flatMap((m) => indPorMeta.get(m.id) ?? []);
      const { estado } = calcularAvancePorIndicadores(inds);
      return estado === params.estado;
    });
  }

  // Construir el árbol Sec → (Sub) → Dir → Proyectos
  const sortByName = (a: UnidadOrganizacional, b: UnidadOrganizacional) =>
    (a.nombre_corto ?? a.nombre).localeCompare(b.nombre_corto ?? b.nombre);

  // Para el desplegable de "Nuevo proyecto": secretaría → subsecretarías →
  // direcciones, y alfabético dentro de cada nivel.
  const sortByNivelNombre = (a: UnidadOrganizacional, b: UnidadOrganizacional) =>
    a.nivel - b.nivel || sortByName(a, b);

  const proyectosPorUnidad = new Map<string, typeof proyectosFiltrados>();
  for (const py of proyectosFiltrados) {
    (proyectosPorUnidad.get(py.unidad_id) ?? proyectosPorUnidad.set(py.unidad_id, []).get(py.unidad_id)!).push(py);
  }

  const secretarias = unidades.filter((u) => u.nivel === 0).sort(sortByName);

  function toPoaProyectos(unidadIds: string[]): PoaProyecto[] {
    const result: PoaProyecto[] = [];
    for (const uId of unidadIds) {
      for (const py of (proyectosPorUnidad.get(uId) ?? []).sort((a, b) =>
        a.nombre.localeCompare(b.nombre)
      )) {
        const metas = (metasPorPy.get(py.id) ?? []).map<PoaMeta>((m) => ({
          id: m.id,
          codigo: m.codigo,
          nombre: m.nombre,
          estado_semaforo: m.estado_semaforo,
          ultima_actualizacion: m.ultima_actualizacion,
          indicadores: (indPorMeta.get(m.id) ?? []).map<PoaIndicador>((i) => ({
            id: i.id,
            codigo: i.codigo,
            nombre: i.nombre,
            valor_actual: i.valor_actual,
            valor_actual_texto: i.valor_actual_texto,
            valor_objetivo: i.valor_objetivo,
            valor_objetivo_texto: i.valor_objetivo_texto,
            unidad_medida: i.unidad_medida,
            estado_semaforo: i.estado_semaforo,
          })),
        }));
        // Avance del proyecto basado en SUS indicadores
        const todosIndPy = metas.flatMap((m) => m.indicadores);
        const avInd = calcularAvancePorIndicadores(todosIndPy);
        result.push({
          id: py.id,
          codigo: py.codigo,
          nombre: py.nombre,
          unidad_id: py.unidad_id,
          unidad_nombre: unidadById.get(py.unidad_id)?.nombre_corto ?? unidadById.get(py.unidad_id)?.nombre ?? null,
          metas,
          porcentaje: avInd.porcentaje ?? 0,
          estado: avInd.estado,
          tieneSeguimiento: avInd.conDatos > 0,
          puedeCargar: !!scopeUnidadesUsuario && scopeUnidadesUsuario.has(py.unidad_id),
        });
      }
    }
    return result;
  }

  // Construye un nodo de dirección incluyendo sus subdirecciones (nivel 3)
  const toDireccion = (d: UnidadOrganizacional) => {
    const subdirs = (childrenByParent.get(d.id) ?? []).filter((u) => u.nivel >= 3).sort(sortByName);
    return {
      unidad: d,
      proyectos: toPoaProyectos([d.id]),
      subdirecciones: subdirs.map((sd) => ({ unidad: sd, proyectos: toPoaProyectos([sd.id]) })),
    };
  };

  // Build sec → (sub → dir → subdir → py) o (dir → py)
  const arbol = secretarias.map((sec) => {
    const subs = (childrenByParent.get(sec.id) ?? []).filter((u) => u.nivel === 1).sort(sortByName);
    const dirsDirectas = (childrenByParent.get(sec.id) ?? []).filter((u) => u.nivel === 2).sort(sortByName);
    return {
      unidad: sec,
      proyectosDirectos: toPoaProyectos([sec.id]),
      subs: subs.map((sub) => {
        const dirs = (childrenByParent.get(sub.id) ?? []).filter((u) => u.nivel === 2).sort(sortByName);
        return {
          unidad: sub,
          proyectosDirectos: toPoaProyectos([sub.id]),
          dirs: dirs.map(toDireccion),
        };
      }),
      dirsDirectas: dirsDirectas.map(toDireccion),
    };
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">POA Operativo</h1>
          <p className="text-sm text-muted mt-1">
            {periodo.nombre} — {proyectosFiltrados.length} de {proyectos.length} proyectos · {indicadores.length} indicadores
          </p>
        </div>
        <Suspense>
          <ProyectosSearch
            unidades={
              perfilVeTodo(perfil) ? unidades : subtreeUnidades(unidades, perfil?.unidad_id ?? null)
            }
          />
        </Suspense>
      </div>

      {puedeCargarBase && perfil && (
        <div className="flex justify-end">
          <NuevoProyectoForm
            esAdmin={perfil.rol !== "director"}
            unidadNombre={
              perfil.rol === "director"
                ? unidadById.get(perfil.unidad_id ?? "")?.nombre ?? null
                : null
            }
            direcciones={
              perfil.rol === "admin_funcional"
                ? unidades
                    .filter((u) => u.nivel >= 0)
                    .sort(sortByNivelNombre)
                : perfil.rol === "secretario" || perfil.rol === "subsecretario"
                ? unidades
                    .filter((u) => u.nivel >= 0 && scopeUnidadesUsuario?.has(u.id))
                    .sort(sortByNivelNombre)
                : []
            }
          />
        </div>
      )}

      <PoaTree
        arbol={arbol}
        autoExpand={
          !perfilVeTodo(perfil) ||
          !!(params.dir || params.q || (params.estado && params.estado !== "todos"))
        }
      />
    </div>
  );
}

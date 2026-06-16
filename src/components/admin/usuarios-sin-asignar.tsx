"use client";

import { useState, useTransition } from "react";
import { crearPerfilParaUsuario } from "@/lib/actions";
import type { UnidadOrganizacional, RolUsuario } from "@/types/database";
import type { AuthUserOrphan } from "@/app/(main)/admin/usuarios/page";

const ROLES: { value: RolUsuario; label: string; nivel?: number }[] = [
  { value: "intendenta", label: "Intendenta" },
  { value: "secretario", label: "Secretario", nivel: 0 },
  { value: "subsecretario", label: "Subsecretario", nivel: 1 },
  { value: "director", label: "Director", nivel: 2 },
  { value: "admin_funcional", label: "Admin funcional (Planif. Estratégica)" },
  { value: "admin_tecnico", label: "Admin técnico (Sistemas)" },
];

interface Props {
  usuarios: AuthUserOrphan[];
  unidades: UnidadOrganizacional[];
}

export function UsuariosSinAsignar({ usuarios, unidades }: Props) {
  return (
    <div className="rounded-xl border border-warning/30 bg-warning/5 overflow-hidden">
      <div className="p-4 border-b border-warning/20">
        <h2 className="text-sm font-semibold text-warning">
          ⚠️ Usuarios sin asignar ({usuarios.length})
        </h2>
        <p className="text-xs text-muted mt-1">
          Estos usuarios fueron creados en Supabase Auth pero todavía no tienen rol ni unidad
          asignados. Hasta que les asignes un perfil, no pueden ingresar al sistema.
        </p>
      </div>
      <div className="divide-y divide-warning/15">
        {usuarios.map((u) => (
          <SinAsignarRow key={u.user_id} usuario={u} unidades={unidades} />
        ))}
      </div>
    </div>
  );
}

function SinAsignarRow({
  usuario,
  unidades,
}: {
  usuario: AuthUserOrphan;
  unidades: UnidadOrganizacional[];
}) {
  const [nombre, setNombre] = useState(usuario.nombre);
  const [rol, setRol] = useState<RolUsuario>("director");
  const [unidadId, setUnidadId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const requierUnidad = rol === "secretario" || rol === "subsecretario" || rol === "director";
  const nivelEsperado = rol === "secretario" ? 0 : rol === "subsecretario" ? 1 : 2;
  const unidadesParaRol = requierUnidad
    ? unidades
        .filter((u) => u.nivel === nivelEsperado)
        .sort((a, b) =>
          (a.nombre_corto ?? a.nombre).localeCompare(b.nombre_corto ?? b.nombre)
        )
    : [];

  const asignar = () => {
    setError(null);
    if (requierUnidad && !unidadId) {
      setError("Este rol requiere unidad");
      return;
    }
    startTransition(async () => {
      const r = await crearPerfilParaUsuario({
        user_id: usuario.user_id,
        email: usuario.email,
        nombre,
        rol,
        unidad_id: requierUnidad ? unidadId : null,
      });
      if (!r.success) setError(r.error ?? "Error");
    });
  };

  return (
    <div className="p-3">
      <p className="text-xs font-medium text-foreground break-all mb-2">{usuario.email}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 items-end">
        <div>
          <label className="text-[10px] text-muted uppercase tracking-wider">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre completo"
            className="w-full text-xs bg-background border border-border rounded px-2 py-1.5 mt-0.5"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted uppercase tracking-wider">Rol</label>
          <select
            value={rol}
            onChange={(e) => {
              const v = e.target.value as RolUsuario;
              setRol(v);
              if (!["secretario", "subsecretario", "director"].includes(v)) setUnidadId(null);
            }}
            className="w-full text-xs bg-background border border-border rounded px-2 py-1.5 mt-0.5"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-muted uppercase tracking-wider">Unidad</label>
          {requierUnidad ? (
            <select
              value={unidadId ?? ""}
              onChange={(e) => setUnidadId(e.target.value || null)}
              className="w-full text-xs bg-background border border-border rounded px-2 py-1.5 mt-0.5"
            >
              <option value="">Seleccionar...</option>
              {unidadesParaRol.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre_corto ?? u.nombre}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-muted py-1.5 mt-0.5">Acceso global</p>
          )}
        </div>
        <div>
          <button
            onClick={asignar}
            disabled={isPending}
            className="w-full text-xs bg-primary text-white rounded px-3 py-1.5 hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? "Asignando..." : "Asignar"}
          </button>
        </div>
      </div>
      {error && <p className="text-[10px] text-danger mt-1">{error}</p>}
    </div>
  );
}

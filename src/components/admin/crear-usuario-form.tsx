"use client";

import { useState, useTransition } from "react";
import { crearUsuarioAuth } from "@/lib/actions";

export function CrearUsuarioForm() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const submit = () => {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const r = await crearUsuarioAuth({ email, password });
      if (r.success) {
        setOk(`Usuario ${email.trim().toLowerCase()} creado. Asignale rol y área abajo.`);
        setEmail("");
        setPassword("");
      } else {
        setError(r.error ?? "Error al crear el usuario");
      }
    });
  };

  if (!open) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Crear nuevo usuario</p>
          <p className="text-xs text-muted mt-0.5">
            Dá de alta un usuario con email y contraseña. Después le asignás rol y área.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="text-sm bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary/90 shrink-0"
        >
          + Nuevo usuario
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <p className="text-sm font-semibold text-foreground">Crear nuevo usuario</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] text-muted uppercase tracking-wider">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@ejemplo.com"
            autoFocus
            className="w-full text-sm bg-background border border-border rounded px-3 py-2 mt-0.5"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted uppercase tracking-wider">Contraseña</label>
          <input
            type="text"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full text-sm bg-background border border-border rounded px-3 py-2 mt-0.5"
          />
          <p className="text-[10px] text-muted mt-1">
            Contraseña visible para que se la puedas comunicar al usuario. Que la cambie luego.
          </p>
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
      {ok && <p className="text-xs text-success">✓ {ok}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={submit}
          disabled={isPending || !email || password.length < 6}
          className="text-sm bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? "Creando..." : "Crear usuario"}
        </button>
        <button
          onClick={() => {
            setOpen(false);
            setError(null);
            setOk(null);
          }}
          className="text-sm text-muted hover:text-foreground"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}

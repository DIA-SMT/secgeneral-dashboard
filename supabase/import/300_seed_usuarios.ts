/**
 * 300_seed_usuarios.ts
 *
 * Crea usuarios iniciales en auth.users + perfil_usuario a partir de:
 *   - Hoja1 del Excel POA 2026 (1 Director por dirección con responsable)
 *   - Lista hardcoded de admins y Secretarios/Subsecretarios (a editar antes de correr)
 *
 * Genera un CSV con email + password temporal para distribuir manualmente.
 *
 * Pre-requisitos:
 *   - Migración 010_rbac.sql aplicada
 *   - Migración 009 + script 200 corridos (las direcciones existen en DB)
 *   - SUPABASE_SERVICE_ROLE_KEY en .env.local (necesario para crear usuarios en auth.users)
 *
 * Uso:
 *   npx tsx supabase/import/300_seed_usuarios.ts
 *   → genera supabase/import/usuarios-credenciales.csv (NO COMMITTEAR)
 */

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { Client } from "pg";

// ---- Cargar .env.local ----
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8").replace(/^﻿/, "");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !process.env[key]) process.env[key] = value;
  }
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DB_URL = process.env.SUPABASE_DB_URL!;
const XLSX_PATH =
  process.argv[2] ?? "C:\\Users\\LBonilla-DIA\\Downloads\\poa 26 - indicadores.xlsx";

if (!SERVICE_KEY) {
  console.error(
    "❌ Falta SUPABASE_SERVICE_ROLE_KEY en .env.local. " +
      "Obtenerla en: Supabase Dashboard → Settings → API → service_role (secret)."
  );
  process.exit(1);
}

// ---- Helpers ----
function emailDesdeNombre(nombre: string): string {
  // "Dr. Alejandro Bonari" → "alejandro.bonari@smt.gob.ar"
  const limpio = nombre
    .replace(/^(Dr\.?|Dra\.?|Lic\.?|Ing\.?|Sr\.?|Sra\.?|Srta\.?|Mg\.?|Prof\.?)\s+/i, "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/);
  const local = limpio.slice(0, 2).join(".");
  return `${local}@smt.gob.ar`;
}

function passwordTemporal(): string {
  return crypto.randomBytes(6).toString("base64").replace(/[+/=]/g, "x");
}

// ---- Admins y Secretarios/Subsecretarios (EDITAR ANTES DE CORRER) ----
type SeedManual = {
  email: string;
  nombre: string;
  rol: "intendenta" | "secretario" | "subsecretario" | "admin_funcional" | "admin_tecnico";
  unidad_codigo?: string; // SEC01, SUB... etc, para resolver unidad_id por code
};
const MANUALES: SeedManual[] = [
  // EJEMPLOS — completar con datos reales
  // { email: "admin.tecnico@smt.gob.ar", nombre: "Admin Técnico", rol: "admin_tecnico" },
  // { email: "admin.funcional@smt.gob.ar", nombre: "Admin Funcional", rol: "admin_funcional" },
  // { email: "intendenta@smt.gob.ar", nombre: "Intendenta", rol: "intendenta" },
  // { email: "sec.general@smt.gob.ar", nombre: "Sec. General", rol: "secretario", unidad_codigo: "SEC01" },
];

async function main() {
  const admin = createClient(SUPA_URL, SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const db = new Client({ connectionString: DB_URL });
  await db.connect();

  // Resolver unidades por código
  const { rows: unidadesRows } = await db.query<{ id: string; codigo: string }>(
    `SELECT id, codigo FROM unidad_organizacional WHERE codigo IS NOT NULL`
  );
  const unidadByCodigo = new Map(unidadesRows.map((u) => [u.codigo, u.id]));

  // ---- Construir lista de usuarios a crear ----
  const wb = XLSX.readFile(XLSX_PATH);
  const h1 = XLSX.utils.sheet_to_json<Record<string, string | null>>(
    wb.Sheets["Hoja1"],
    { defval: null, raw: false }
  );

  type Pendiente = {
    email: string;
    password: string;
    nombre: string;
    rol: SeedManual["rol"] | "director";
    unidad_id: string | null;
  };
  const pendientes: Pendiente[] = [];

  // Manuales primero
  for (const m of MANUALES) {
    pendientes.push({
      email: m.email,
      password: passwordTemporal(),
      nombre: m.nombre,
      rol: m.rol,
      unidad_id: m.unidad_codigo ? unidadByCodigo.get(m.unidad_codigo) ?? null : null,
    });
  }

  // Directores desde Hoja1
  const emailsUsados = new Set(pendientes.map((p) => p.email));
  for (const r of h1) {
    const dirRaw = (r["id_direccion"] as string | null) ?? "";
    const dirCode = dirRaw.toString().match(/(DIR\d+)/i)?.[1].toUpperCase();
    const responsable = (r["nombre_responsable"] as string | null)?.trim();
    if (!dirCode || !responsable) continue;
    const unidadId = unidadByCodigo.get(dirCode);
    if (!unidadId) continue;
    let email = emailDesdeNombre(responsable);
    // Evitar duplicados de email
    let suffix = 2;
    while (emailsUsados.has(email)) {
      const base = email.split("@")[0];
      email = `${base}${suffix}@smt.gob.ar`;
      suffix++;
    }
    emailsUsados.add(email);
    pendientes.push({
      email,
      password: passwordTemporal(),
      nombre: responsable,
      rol: "director",
      unidad_id: unidadId,
    });
  }

  console.log(`📋 ${pendientes.length} usuarios a crear`);

  const credsRows: string[] = ["email,password,nombre,rol,unidad_id"];
  let creados = 0;
  let saltados = 0;

  for (const p of pendientes) {
    try {
      const { data, error } = await admin.auth.admin.createUser({
        email: p.email,
        password: p.password,
        email_confirm: true,
        user_metadata: { nombre: p.nombre, rol: p.rol },
      });
      if (error) {
        if (error.message.includes("already registered")) {
          console.warn(`  ⚠️  ${p.email} ya existe, saltando`);
          saltados++;
          continue;
        }
        throw error;
      }
      const userId = data.user.id;
      await db.query(
        `INSERT INTO perfil_usuario (user_id, email, nombre, rol, unidad_id, activo)
         VALUES ($1, $2, $3, $4, $5, true)
         ON CONFLICT (user_id) DO UPDATE
           SET email = EXCLUDED.email, nombre = EXCLUDED.nombre,
               rol = EXCLUDED.rol, unidad_id = EXCLUDED.unidad_id, activo = true`,
        [userId, p.email, p.nombre, p.rol, p.unidad_id]
      );
      creados++;
      credsRows.push(
        `${p.email},${p.password},"${p.nombre}",${p.rol},${p.unidad_id ?? ""}`
      );
      console.log(`  ✓ ${p.email} (${p.rol})`);
    } catch (err) {
      console.error(`  ❌ ${p.email}: ${(err as Error).message}`);
    }
  }

  const csvPath = path.join(process.cwd(), "supabase", "import", "usuarios-credenciales.csv");
  fs.writeFileSync(csvPath, credsRows.join("\n"), "utf8");
  console.log(`\n📊 Resumen: ${creados} creados, ${saltados} saltados`);
  console.log(`📄 Credenciales generadas en: ${csvPath}`);
  console.log("⚠️  NO COMMITEAR ese archivo. Distribuir y borrarlo.");

  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

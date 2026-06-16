/**
 * Crea usuarios en Supabase Auth con contraseña temporal "123456".
 * NO les asigna perfil/rol/unidad — eso se hace luego desde /admin/usuarios.
 *
 * Uso:
 *   npx tsx supabase/import/301_crear_usuarios.ts
 *
 * Requiere en .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && !process.env[key]) process.env[key] = value;
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !SERVICE_KEY) {
  console.error("Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const PASSWORD = "123456";

// Correos normalizados (sin espacios, en minúscula, typos corregidos)
const EMAILS_RAW = [
  "alejandro_bonari@yahoo.com.ar",
  "isabelamateperez@gmail.com",
  "vanecastro1112@gmail.com",
  "drleramirez@gmail.com",
  "dir.poblacionanimal.smt@gmail.com",
  "karina_faccioli@yahoo.com.ar",
  "peraltaac90@gmail.com",
  "lic.laurajtrejo@gmail.com",
  "lmaaries77@yahoo.com.ar",
  "dipes.smt@gmail.com",
  "marcelo.dulci.dgd@gmail.com",
  "silvanaf.smt@gmail.com",
  "lcolmenares@gmail.com",
  "b.medinats@gmail.com",
  "mariabelenpereyracolombano@gmail.com",
  "emilianober.alonso@gmail.com",
  "ceciliaguerra00@gmail.com",
  "laumorasala@gmail.com",
  "jerosaenz@gmail.com",
  "patococconi@gmail.com",
  "silviahortt@gmail.com",
  "pablo.turismosmt@gmail.com",
  "ceremonial@smt.gob.ar",
  "eventos@smt.gob.ar",
  "loreradrizzani78@gmail.com",
  "oliveranacarolina@gmail.com",
  "luchochlain@hotmail.com",
];

const emails = Array.from(
  new Set(EMAILS_RAW.map((e) => e.replace(/\s+/g, "").toLowerCase()).filter(Boolean))
);

async function main() {
  const sb = createClient(URL!, SERVICE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Traer usuarios existentes para no duplicar
  const existentes = new Set<string>();
  let page = 1;
  while (true) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) {
      console.error("Error listando usuarios:", error.message);
      break;
    }
    for (const u of data.users) if (u.email) existentes.add(u.email.toLowerCase());
    if (data.users.length < 1000) break;
    page++;
  }

  let creados = 0;
  let saltados = 0;
  let fallidos = 0;

  for (const email of emails) {
    if (existentes.has(email)) {
      console.log(`⏭️  ya existe: ${email}`);
      saltados++;
      continue;
    }
    const { error } = await sb.auth.admin.createUser({
      email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) {
      console.error(`❌ ${email}: ${error.message}`);
      fallidos++;
    } else {
      console.log(`✅ creado: ${email}`);
      creados++;
    }
  }

  console.log("\n📊 RESUMEN:");
  console.log(`  Total correos:   ${emails.length}`);
  console.log(`  Creados:         ${creados}`);
  console.log(`  Ya existían:     ${saltados}`);
  console.log(`  Fallidos:        ${fallidos}`);
  console.log(`\n  Contraseña temporal para todos: ${PASSWORD}`);
  console.log("  Asigná rol y área desde /admin/usuarios → sección 'Usuarios sin asignar'.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Reasigna la unidad de los proyectos de Ambiente (SEC07) según el Excel
 * "POA26 - AmbYDes - indicadores". Algunos proyectos que estaban bajo
 * Bromatología (DIR46) dependen directamente de la Secretaría (SEC07).
 *
 * Solo hace UPDATE de proyecto.unidad_id. No toca metas/indicadores/avances.
 * Idempotente.
 *
 * Uso: npx tsx supabase/import/401_reasignar_ambiente.ts ["ruta\\excel.xlsx"]
 */
import { Client } from "pg";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8").replace(/^﻿/, "");
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("="); if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (k && !process.env[k]) process.env[k] = v;
  }
}

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) { console.error("Falta SUPABASE_DB_URL"); process.exit(1); }
const xlsxPath = process.argv[2] || "C:/Users/LBonilla-DIA/Downloads/POA26 - AmbYDes - indicadores .xlsx";

const codeOf = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  const d = raw.match(/DIR\d+/i); if (d) return d[0].toUpperCase();
  const s = raw.match(/SEC\d+/i); if (s) return s[0].toUpperCase();
  return null;
};

async function main() {
  const wb = XLSX.readFile(xlsxPath);
  const rows = XLSX.utils.sheet_to_json<Record<string, string | null>>(wb.Sheets["Hoja 1"], { defval: null, raw: false });

  let cur: string | null = null;
  const wanted = new Map<string, string>(); // PRY -> codigo unidad
  for (const r of rows) {
    const dc = codeOf(r["id_direccion"] as string | null);
    if (dc) cur = dc;
    const py = r["id_proyecto"] as string | null;
    if (py && cur) wanted.set(py.trim(), cur);
  }

  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  try {
    await db.query("BEGIN");
    // Mapa codigo unidad -> id
    const ures = await db.query<{ id: string; codigo: string }>(
      "SELECT id, codigo FROM unidad_organizacional WHERE codigo = ANY($1)",
      [[...new Set(wanted.values())]]
    );
    const unidadId = new Map(ures.rows.map((r) => [r.codigo, r.id]));

    let cambios = 0, saltados = 0, noExiste = 0;
    for (const [py, codigo] of wanted) {
      const uid = unidadId.get(codigo);
      if (!uid) { console.warn(`  ⚠️ unidad ${codigo} no existe`); continue; }
      const res = await db.query(
        "UPDATE proyecto SET unidad_id = $1 WHERE codigo = $2 AND unidad_id <> $1",
        [uid, py]
      );
      if (res.rowCount && res.rowCount > 0) { cambios++; console.log(`  ✓ ${py} -> ${codigo}`); }
      else {
        const ex = await db.query("SELECT 1 FROM proyecto WHERE codigo = $1", [py]);
        if (ex.rowCount) saltados++; else noExiste++;
      }
    }
    await db.query("COMMIT");
    console.log(`\n📊 Reasignados: ${cambios} · ya correctos: ${saltados} · inexistentes: ${noExiste}`);
    console.log("✅ Listo");
  } catch (e) {
    await db.query("ROLLBACK");
    console.error("❌ rollback:", e);
    throw e;
  } finally {
    await db.end();
  }
}
main().catch((e) => { console.error(e); process.exit(1); });

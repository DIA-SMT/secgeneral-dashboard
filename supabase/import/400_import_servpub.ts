/**
 * Import ADITIVO de la Secretaría de Servicios Públicos (SEC08).
 * NO trunca nada ni toca auth/perfiles. Inserta solo lo nuevo y es
 * idempotente (saltea lo que ya existe por código).
 *
 * Uso:
 *   npx tsx supabase/import/400_import_servpub.ts ["ruta\\al\\excel.xlsx"]
 */
import { Client } from "pg";
import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

// ---- .env.local ----
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

const DB_URL = process.env.SUPABASE_DB_URL;
if (!DB_URL) {
  console.error("Falta SUPABASE_DB_URL en .env.local");
  process.exit(1);
}
const xlsxPath =
  process.argv[2] || "C:/Users/LBonilla-DIA/Downloads/POA26 - ServPub - INDICADORES.xlsx";

const norm = (v: unknown): string | null => {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
};
const dirCode = (raw: string | null): string | null => {
  if (!raw) return null;
  const m = raw.replace(/DIR([0-9O]+)/gi, (_m, p1) => "DIR" + p1.toUpperCase().replace(/O/g, "0")).match(/DIR\d+/i);
  return m ? m[0].toUpperCase() : null;
};
const secCode = (raw: string | null): string | null => {
  if (!raw) return null;
  const m = raw.match(/SEC\d+/i);
  return m ? m[0].toUpperCase() : null;
};

async function main() {
  console.log(`📂 Leyendo: ${xlsxPath}`);
  const wb = XLSX.readFile(xlsxPath);
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  console.log("✅ Conectado");

  try {
    await db.query("BEGIN");

    // Periodo activo
    const per = await db.query<{ id: string }>(`SELECT id FROM periodo WHERE activo = true LIMIT 1`);
    if (per.rows.length === 0) throw new Error("No hay período activo");
    const periodoId = per.rows[0].id;

    // ===== Sheet2: estructura org =====
    const org = XLSX.utils.sheet_to_json<Record<string, string | null>>(wb.Sheets["Sheet2"], { defval: null, raw: false });

    // helper: obtener o crear unidad por codigo
    const getUnidad = async (codigo: string) => {
      const r = await db.query<{ id: string }>(`SELECT id FROM unidad_organizacional WHERE codigo = $1`, [codigo]);
      return r.rows[0]?.id ?? null;
    };
    const maxOrden = async (parent: string | null) => {
      const r = await db.query<{ m: number }>(
        `SELECT COALESCE(MAX(orden),0) AS m FROM unidad_organizacional WHERE parent_id ${parent ? "= $1" : "IS NULL"}`,
        parent ? [parent] : []
      );
      return r.rows[0].m;
    };

    let secId: string | null = null;
    let subId: string | null = null;
    let secNombre = "", subNombre = "";
    let secCodigo = "";
    let creadasSec = 0, creadasSub = 0, creadasDir = 0;
    const dirIds = new Map<string, string>();

    for (const row of org) {
      const sc = secCode(norm(row["id_secretaria"]));
      if (sc) { secCodigo = sc; secNombre = norm(row["nombre_secretaria"]) ?? sc; }
      const subN = norm(row["nombre_subsecretaria "]) ?? norm(row["nombre_subsecretaria"]);
      if (subN) subNombre = subN;
      const dc = dirCode(norm(row["id_direccion"]));
      const dirN = norm(row["nombre_direccion"]);
      const resp = norm(row["nombre_responsable"]);
      if (!dc || !dirN) continue;

      // Secretaría
      if (!secId) {
        secId = await getUnidad(secCodigo);
        if (!secId) {
          const ins = await db.query<{ id: string }>(
            `INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, activa, codigo, metadata)
             VALUES (NULL, $1, $2, 'secretaria', 0, $3, true, $4, '{"import":"servpub"}'::jsonb) RETURNING id`,
            [secNombre, secNombre, (await maxOrden(null)) + 1, secCodigo]
          );
          secId = ins.rows[0].id; creadasSec++;
        }
      }
      // Subsecretaría
      if (!subId && subNombre) {
        const ex = await db.query<{ id: string }>(
          `SELECT id FROM unidad_organizacional WHERE nombre = $1 AND parent_id = $2`,
          [subNombre, secId]
        );
        subId = ex.rows[0]?.id ?? null;
        if (!subId) {
          const ins = await db.query<{ id: string }>(
            `INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, activa, metadata)
             VALUES ($1, $2, $3, 'subsecretaria', 1, $4, true, '{"import":"servpub"}'::jsonb) RETURNING id`,
            [secId, subNombre, subNombre, (await maxOrden(secId)) + 1]
          );
          subId = ins.rows[0].id; creadasSub++;
        }
      }
      // Dirección
      const parentDir = subId ?? secId;
      let dId = await getUnidad(dc);
      if (!dId) {
        const ins = await db.query<{ id: string }>(
          `INSERT INTO unidad_organizacional (parent_id, nombre, nombre_corto, tipo, nivel, orden, responsable_nombre, activa, codigo, metadata)
           VALUES ($1, $2, $3, 'direccion', 2, $4, $5, true, $6, '{"import":"servpub"}'::jsonb) RETURNING id`,
          [parentDir, dirN, dirN, (await maxOrden(parentDir)) + 1, resp, dc]
        );
        dId = ins.rows[0].id; creadasDir++;
      }
      dirIds.set(dc, dId);
    }
    console.log(`🏛️  Secretaría: +${creadasSec}, Subsec: +${creadasSub}, Direcciones: +${creadasDir}`);

    // ===== Sheet1: proyectos/metas/indicadores =====
    const rows = XLSX.utils.sheet_to_json<Record<string, string | null>>(wb.Sheets["Sheet1"], { defval: null, raw: false });
    let dirAct: string | null = null, pyId: string | null = null, metaId: string | null = null;
    let nPy = 0, nMet = 0, nInd = 0, ordPy = 0, ordMet = 0, ordInd = 0;

    const existsCodigo = async (tabla: string, codigo: string) => {
      const r = await db.query<{ id: string }>(`SELECT id FROM ${tabla} WHERE codigo = $1 LIMIT 1`, [codigo]);
      return r.rows[0]?.id ?? null;
    };

    for (const r of rows) {
      const dc = dirCode(norm(r["id_direccion"]));
      if (dc) dirAct = dc;

      const pyCodigo = norm(r["id_proyecto"]);
      const pyNombre = norm(r["nombre_proyecto"]);
      if (pyCodigo && pyNombre) {
        const unidadId = dirAct ? dirIds.get(dirAct) : null;
        if (!unidadId) { console.warn(`  ⚠️ ${pyCodigo} sin unidad (${dirAct})`); pyId = null; metaId = null; continue; }
        pyId = await existsCodigo("proyecto", pyCodigo);
        if (!pyId) {
          const ins = await db.query<{ id: string }>(
            `INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, estado, orden, metadata)
             VALUES ($1, $2, $3, $4, 'activo', $5, '{"import":"servpub"}'::jsonb) RETURNING id`,
            [periodoId, unidadId, pyCodigo, pyNombre, ordPy++]
          );
          pyId = ins.rows[0].id; nPy++;
        }
        metaId = null;
      }

      const metCodigo = norm(r["id_metas"]);
      const metNombre = norm(r["descripcion_metas"]);
      if (metCodigo && metNombre && pyId) {
        metaId = await existsCodigo("meta", metCodigo);
        if (!metaId) {
          const ins = await db.query<{ id: string }>(
            `INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, estado_semaforo, orden, metadata)
             VALUES ($1, $2, $3, 'cuantitativo', 'sin_datos', $4, '{"import":"servpub"}'::jsonb) RETURNING id`,
            [pyId, metCodigo, metNombre, ordMet++]
          );
          metaId = ins.rows[0].id; nMet++;
        }
      }

      const indCodigo = norm(r["id_indicador"]);
      const indNombre = norm(r["nombre_indicador"]);
      if (indCodigo && indNombre && metaId) {
        const ya = await existsCodigo("indicador", indCodigo);
        if (!ya) {
          const vm = norm(r["valor_meta_semestral"]);
          const vo = vm && isFinite(Number(vm)) ? Number(vm) : null;
          await db.query(
            `INSERT INTO indicador (meta_id, codigo, nombre, valor_objetivo, estado_semaforo, orden, metadata)
             VALUES ($1, $2, $3, $4, 'sin_datos', $5, '{"import":"servpub"}'::jsonb)`,
            [metaId, indCodigo, indNombre, vo, ordInd++]
          );
          nInd++;
        }
      }
    }

    await db.query("COMMIT");
    console.log(`\n📊 RESUMEN:\n  Proyectos: +${nPy}\n  Metas: +${nMet}\n  Indicadores: +${nInd}`);
    console.log("✅ Import aditivo completado");
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("❌ Error, rollback:", err);
    throw err;
  } finally {
    await db.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

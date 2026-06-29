/**
 * Reemplaza los proyectos de la Direccion de Inteligencia Artificial (DIR36) por los
 * 29 proyectos reales que la DIA mantiene en su sistema propio (organizacion-dia).
 *
 * - Borra los proyectos placeholder previos de DIR36 (con sus metas/indicadores/avances).
 * - Carga cada proyecto del JSON con 1 meta + 1 indicador de "% de avance".
 * - Idempotente: usa codigos deterministas (PRYIA##/METIA##/INDIA##); re-correr actualiza.
 *
 * Uso:
 *   npx tsx supabase/import/402_import_dia_proyectos.ts [ruta\\al\\ia_projects.json]
 */
import { Client } from "pg";
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
if (!DB_URL) { console.error("Falta SUPABASE_DB_URL en .env.local"); process.exit(1); }

const jsonPath = process.argv[2] || path.join(process.cwd(), "ia_projects.json");
const UNIDAD = "DIR36";

type Src = {
  id: string; name: string; description: string | null; requester_area: string | null;
  stack: string | null; repository_url: string | null; repository_url_secondary: string | null;
  website_url: string | null; status: string | null; priority: string | null;
  progress: number | null; estimated_delivery: string | null; note: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
const semaforoPorAvance = (p: number | null) =>
  p == null ? "sin_datos" : p >= 70 ? "verde" : p >= 40 ? "amarillo" : "rojo";
const estadoProyecto = (status: string | null) =>
  status && /pausad/i.test(status) ? "pausado" : "activo";
const isDate = (s: string | null) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);

async function main() {
  const items: Src[] = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  console.log(`📂 ${items.length} proyectos en ${jsonPath}`);

  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  console.log("✅ Conectado");

  try {
    await db.query("BEGIN");

    const per = await db.query<{ id: string }>(`SELECT id FROM periodo WHERE activo = true LIMIT 1`);
    if (per.rows.length === 0) throw new Error("No hay período activo");
    const periodoId = per.rows[0].id;

    const u = await db.query<{ id: string }>(`SELECT id FROM unidad_organizacional WHERE codigo = $1`, [UNIDAD]);
    if (u.rows.length === 0) throw new Error(`No existe la unidad ${UNIDAD}`);
    const unidadId = u.rows[0].id;

    // --- Borrar proyectos previos de la unidad que NO sean de este import ---
    const prev = await db.query<{ id: string; codigo: string }>(
      `SELECT id, codigo FROM proyecto WHERE unidad_id = $1 AND (codigo IS NULL OR codigo NOT LIKE 'PRYIA%')`,
      [unidadId]
    );
    if (prev.rows.length) {
      const ids = prev.rows.map((r) => r.id);
      await db.query(
        `DELETE FROM avance WHERE meta_id IN (SELECT id FROM meta WHERE proyecto_id = ANY($1::uuid[]))`,
        [ids]
      );
      // meta->proyecto no es cascade; borro metas (los indicadores caen por cascade) y luego proyectos
      await db.query(`DELETE FROM meta WHERE proyecto_id = ANY($1::uuid[])`, [ids]);
      await db.query(`DELETE FROM proyecto WHERE id = ANY($1::uuid[])`, [ids]);
      console.log(`🗑️  Borrados ${prev.rows.length} proyectos previos: ${prev.rows.map((r) => r.codigo).join(", ")}`);
    }

    let nPy = 0, nMet = 0, nInd = 0;
    let i = 0;
    for (const it of items) {
      i++;
      const pyCod = `PRYIA${pad(i)}`;
      const metCod = `METIA${pad(i)}`;
      const indCod = `INDIA${pad(i)}`;
      const nombre = (it.name || "").trim() || pyCod;
      const estado = estadoProyecto(it.status);
      const fechaFin = isDate(it.estimated_delivery);
      const meta = {
        source: "organizacion-dia",
        source_id: it.id,
        status: it.status ?? null,
        priority: it.priority ?? null,
        progress: it.progress ?? null,
        stack: it.stack ?? null,
        repository_url: it.repository_url ?? null,
        repository_url_secondary: it.repository_url_secondary ?? null,
        website_url: it.website_url ?? null,
        requester_area: it.requester_area ?? null,
      };

      const idBy = async (tabla: string, codigo: string) => {
        const r = await db.query<{ id: string }>(`SELECT id FROM ${tabla} WHERE codigo = $1 LIMIT 1`, [codigo]);
        return r.rows[0]?.id ?? null;
      };

      // --- Proyecto (upsert por codigo) ---
      let pyId = await idBy("proyecto", pyCod);
      if (pyId) {
        await db.query(
          `UPDATE proyecto SET unidad_id=$2, nombre=$3, descripcion=$4, estado=$5::estado_proyecto,
             fecha_fin=$6, observaciones=$7, orden=$8, metadata=$9::jsonb WHERE id=$1`,
          [pyId, unidadId, nombre, it.description ?? null, estado, fechaFin, it.note ?? null, i, JSON.stringify(meta)]
        );
      } else {
        const ins = await db.query<{ id: string }>(
          `INSERT INTO proyecto (periodo_id, unidad_id, codigo, nombre, descripcion, estado, fecha_fin, observaciones, orden, metadata)
           VALUES ($1,$2,$3,$4,$5,$6::estado_proyecto,$7,$8,$9,$10::jsonb) RETURNING id`,
          [periodoId, unidadId, pyCod, nombre, it.description ?? null, estado, fechaFin, it.note ?? null, i, JSON.stringify(meta)]
        );
        pyId = ins.rows[0].id;
      }
      nPy++;

      // --- Meta (upsert por codigo) ---
      const metaNombre = `Desarrollar y poner en producción: ${nombre}`;
      let metaId = await idBy("meta", metCod);
      if (metaId) {
        await db.query(
          `UPDATE meta SET proyecto_id=$2, nombre=$3, estado_semaforo=$4::estado_semaforo WHERE id=$1`,
          [metaId, pyId, metaNombre, semaforoPorAvance(it.progress)]
        );
      } else {
        const ins = await db.query<{ id: string }>(
          `INSERT INTO meta (proyecto_id, codigo, nombre, tipo_medicion, estado_semaforo, orden, metadata)
           VALUES ($1,$2,$3,'cuantitativo',$4::estado_semaforo,1,'{"source":"organizacion-dia"}'::jsonb) RETURNING id`,
          [pyId, metCod, metaNombre, semaforoPorAvance(it.progress)]
        );
        metaId = ins.rows[0].id;
      }
      nMet++;

      // --- Indicador % de avance (upsert por codigo) ---
      const prog = typeof it.progress === "number" ? it.progress : null;
      const indId = await idBy("indicador", indCod);
      if (indId) {
        await db.query(
          `UPDATE indicador SET meta_id=$2, valor_actual=$3, valor_objetivo=100,
             estado_semaforo=$4::estado_semaforo, ultima_actualizacion=now() WHERE id=$1`,
          [indId, metaId, prog, semaforoPorAvance(prog)]
        );
      } else {
        await db.query(
          `INSERT INTO indicador (meta_id, codigo, nombre, unidad_medida, valor_actual, valor_objetivo, estado_semaforo, ultima_actualizacion, orden, metadata)
           VALUES ($1,$2,'% de avance del proyecto','%',$3,100,$4::estado_semaforo, now(), 1,'{"source":"organizacion-dia"}'::jsonb)`,
          [metaId, indCod, prog, semaforoPorAvance(prog)]
        );
      }
      nInd++;
    }

    await db.query("COMMIT");
    console.log(`\n📊 RESUMEN DIR36:\n  Proyectos: ${nPy}\n  Metas: ${nMet}\n  Indicadores: ${nInd}`);
    console.log("✅ Reemplazo completado");
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("❌ Error, rollback:", err);
    throw err;
  } finally {
    await db.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

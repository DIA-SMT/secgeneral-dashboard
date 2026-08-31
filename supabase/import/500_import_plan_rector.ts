/**
 * Carga la jerarquia del Plan Rector (104 nodos + 14 ODS) desde
 * supabase/import/plan-rector.json, que se extrajo de "Cumplimiento Plan
 * Rector.xlsx" usando los rangos de celdas combinadas como autoridad.
 *
 * Estructura: 5 areas de intervencion > 17 ejes > 19 objetivos > 63 lineas.
 * Los ODS cuelgan del EJE (en el documento vienen agrupados por eje, no por
 * linea: de las 63 filas con linea, 22 traen ODS sin linea).
 *
 * IDEMPOTENTE, y no borra nunca. Al re-correr:
 *   - inserta lo que falta, actualiza nombre / orden / codigo del resto;
 *   - REPORTA los nodos que estan en la base y ya no estan en el JSON, en vez
 *     de borrarlos: si hay vinculos de proyectos colgando, borrarlos en
 *     silencio se llevaria la imputacion de alguien.
 *
 * Sobre la clave estable: NO es posicional ni usa el numero del eje. Los ejes
 * estan numerados 1..17 GLOBALES (A1: 1-3, A2: 4-7, A3: 8-10, A4: 11-15,
 * A5: 16-17), asi que si el cliente inserta un eje en A1 se corren 16 numeros;
 * y la fila del Excel se corre con cualquier fila nueva. La clave se deriva del
 * TEXTO del nodo: prefijo legible + hash del nombre normalizado. Consecuencia
 * asumida: si corrigen un typo del documento, el nodo se ve como nuevo y el
 * viejo aparece en el reporte de divergencia para resolverlo a mano.
 *
 * Uso:
 *   npx tsx supabase/import/500_import_plan_rector.ts [--dry-run]
 */
import { Client } from "pg";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// ---- .env / .env.local ----
for (const nombre of [".env.local", ".env"]) {
  const p = path.join(process.cwd(), nombre);
  if (!fs.existsSync(p)) continue;
  const content = fs.readFileSync(p, "utf8").replace(/^﻿/, "");
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
  console.error("Falta SUPABASE_DB_URL en .env o .env.local");
  process.exit(1);
}
const DRY = process.argv.includes("--dry-run");

// ---- Tipos del JSON ----
type Linea = { orden: number; fila_excel: number; nombre: string };
type Objetivo = { orden: number; codigo: string | null; nombre: string; lineas: Linea[] };
type Eje = {
  orden: number; numero: string | null; nombre: string; nombre_completo: string;
  ods: string[]; objetivos: Objetivo[];
};
type Area = {
  orden: number; codigo: string; nombre: string; nombre_completo: string; ejes: Eje[];
};

const jsonPath = path.join(process.cwd(), "supabase", "import", "plan-rector.json");
const plan: { ambitos: Area[] } = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

// ---- Clave estable, derivada del texto ----
function normalizar(s: string): string {
  return s
    .normalize("NFD").replace(/[̀-ͯ]/g, "")  // saca acentos
    .replace(/[“”"']/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
function slug(s: string, max = 48): string {
  return normalizar(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max).replace(/-+$/, "");
}
function clave(tipo: string, nombre: string): string {
  const h = crypto.createHash("sha1").update(normalizar(nombre)).digest("hex").slice(0, 12);
  return `${tipo}:${slug(nombre)}:${h}`;
}

// ---- ODS: "8. Trabajo decente y crecimiento económico" -> {8, "Trabajo decente..."} ----
function parseOds(txt: string): { numero: number; nombre: string } | null {
  const m = /^(\d{1,2})\.?\s*(.+?)\.?\s*$/.exec(txt.trim());
  if (!m) return null;
  const numero = Number(m[1]);
  if (!Number.isInteger(numero) || numero < 1 || numero > 17) return null;
  return { numero, nombre: m[2].trim() };
}

type NodoPlano = {
  clave_estable: string;
  clave_padre: string | null;
  tipo: "area_intervencion" | "eje" | "objetivo" | "linea";
  nivel: number;
  codigo_cliente: string | null;
  nombre: string;
  nombre_corto: string | null;
  orden: number;
  ods: number[];
};

function aplanar(): { nodos: NodoPlano[]; ods: Map<number, string> } {
  const nodos: NodoPlano[] = [];
  const ods = new Map<number, string>();

  for (const a of plan.ambitos) {
    // OJO: la clave sale de `nombre`, que viene SIN el codigo ("Ciudad ordenada
    // y sustentable"), no de `nombre_completo` ("A1: Ciudad ordenada..."). Si se
    // usara el completo, renumerar las areas o los ejes cambiaria la clave y
    // duplicaria el arbol — que es exactamente lo que la clave estable evita.
    const kArea = clave("area", a.nombre);
    nodos.push({
      clave_estable: kArea, clave_padre: null, tipo: "area_intervencion", nivel: 0,
      codigo_cliente: a.codigo, nombre: a.nombre_completo, nombre_corto: a.nombre,
      orden: a.orden, ods: [],
    });

    for (const e of a.ejes) {
      const kEje = clave("eje", e.nombre);
      const numerosOds: number[] = [];
      for (const raw of e.ods) {
        const p = parseOds(raw);
        if (!p) { console.warn(`  ODS no reconocido, se ignora: "${raw}"`); continue; }
        if (!ods.has(p.numero)) ods.set(p.numero, p.nombre);
        numerosOds.push(p.numero);
      }
      nodos.push({
        clave_estable: kEje, clave_padre: kArea, tipo: "eje", nivel: 1,
        codigo_cliente: e.numero, nombre: e.nombre_completo, nombre_corto: e.nombre,
        orden: e.orden, ods: [...new Set(numerosOds)],
      });

      for (const o of e.objetivos) {
        const kObj = clave("obj", o.nombre);
        nodos.push({
          clave_estable: kObj, clave_padre: kEje, tipo: "objetivo", nivel: 2,
          codigo_cliente: o.codigo, nombre: o.nombre, nombre_corto: null,
          orden: o.orden, ods: [],
        });

        for (const l of o.lineas) {
          nodos.push({
            clave_estable: clave("linea", l.nombre), clave_padre: kObj, tipo: "linea", nivel: 3,
            codigo_cliente: null, nombre: l.nombre, nombre_corto: null,
            orden: l.orden, ods: [],
          });
        }
      }
    }
  }
  return { nodos, ods };
}

async function main() {
  const { nodos, ods } = aplanar();

  // Chequeo previo: dos nodos con la misma clave serian dos nodos que el
  // documento escribe exactamente igual. Mejor frenar que fusionarlos.
  const vistas = new Map<string, string>();
  const choques: string[] = [];
  for (const n of nodos) {
    if (vistas.has(n.clave_estable)) {
      choques.push(`  ${n.clave_estable}\n    (1) ${vistas.get(n.clave_estable)}\n    (2) ${n.nombre}`);
    } else vistas.set(n.clave_estable, n.nombre);
  }
  if (choques.length) {
    console.error(`FRENO: ${choques.length} clave(s) repetida(s) — hay nodos con texto idéntico en el Excel:\n${choques.join("\n")}`);
    process.exit(1);
  }

  const porNivel = [0, 1, 2, 3].map((n) => nodos.filter((x) => x.nivel === n).length);
  console.log(`JSON: ${nodos.length} nodos (${porNivel[0]} áreas, ${porNivel[1]} ejes, ${porNivel[2]} objetivos, ${porNivel[3]} líneas) y ${ods.size} ODS`);
  if (DRY) {
    console.log("\n--dry-run: no se escribe nada. Muestra de claves estables:");
    for (const n of [nodos[0], nodos[1], nodos[2], nodos[3]]) {
      if (n) console.log(`  [${n.tipo}] ${n.clave_estable}\n      ${n.nombre.slice(0, 90)}`);
    }
    return;
  }

  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query("BEGIN");

    // ---- ODS ----
    for (const [numero, nombre] of [...ods].sort((a, b) => a[0] - b[0])) {
      await client.query(
        `INSERT INTO public.ods (numero, nombre, nombre_documento)
         VALUES ($1, $2, $3)
         ON CONFLICT (numero) DO UPDATE
           SET nombre = EXCLUDED.nombre, nombre_documento = EXCLUDED.nombre_documento`,
        [numero, nombre, `${numero}. ${nombre}.`]
      );
    }
    console.log(`ODS: ${ods.size} cargados`);

    // ---- Nodos, por nivel, para que el padre exista antes que el hijo ----
    const idPorClave = new Map<string, string>();
    let insertados = 0, actualizados = 0;
    for (const nivel of [0, 1, 2, 3]) {
      for (const n of nodos.filter((x) => x.nivel === nivel)) {
        const parentId = n.clave_padre ? idPorClave.get(n.clave_padre) ?? null : null;
        if (n.clave_padre && !parentId) throw new Error(`Sin padre en memoria para ${n.clave_estable}`);
        const { rows } = await client.query(
          `INSERT INTO public.plan_rector_nodo
             (parent_id, tipo, nivel, clave_estable, codigo_cliente, nombre, nombre_corto, orden)
           VALUES ($1, $2::tipo_nodo_rector, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (clave_estable) DO UPDATE
             SET parent_id      = EXCLUDED.parent_id,
                 codigo_cliente = EXCLUDED.codigo_cliente,
                 nombre         = EXCLUDED.nombre,
                 nombre_corto   = EXCLUDED.nombre_corto,
                 orden          = EXCLUDED.orden,
                 activa         = true
           RETURNING id, (xmax = 0) AS fue_insert`,
          [parentId, n.tipo, n.nivel, n.clave_estable, n.codigo_cliente, n.nombre, n.nombre_corto, n.orden]
        );
        idPorClave.set(n.clave_estable, rows[0].id);
        if (rows[0].fue_insert) insertados++; else actualizados++;
      }
    }
    console.log(`Nodos: ${insertados} insertados, ${actualizados} actualizados`);

    // ---- Puente eje <-> ODS: se rearma completo (no tiene datos propios) ----
    let pares = 0;
    for (const n of nodos.filter((x) => x.tipo === "eje")) {
      const nodoId = idPorClave.get(n.clave_estable)!;
      await client.query(`DELETE FROM public.pr_eje_ods WHERE nodo_id = $1`, [nodoId]);
      for (const numero of n.ods) {
        await client.query(
          `INSERT INTO public.pr_eje_ods (nodo_id, ods_numero) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`, [nodoId, numero]
        );
        pares++;
      }
    }
    console.log(`Ejes-ODS: ${pares} pares`);

    // ---- Divergencia: lo que quedo en la base y ya no esta en el JSON ----
    const { rows: sobrantes } = await client.query(
      `SELECT n.clave_estable, n.tipo, n.nombre,
              (SELECT count(*) FROM public.proyecto_plan_rector v WHERE v.nodo_id = n.id) AS vinculos
         FROM public.plan_rector_nodo n
        WHERE NOT (n.clave_estable = ANY($1::text[]))
        ORDER BY n.nivel, n.orden`,
      [nodos.map((n) => n.clave_estable)]
    );

    await client.query("COMMIT");

    if (sobrantes.length) {
      console.log(`\nATENCION: ${sobrantes.length} nodo(s) estan en la base y NO en el JSON.`);
      console.log("No se borraron a proposito. Si alguno tiene vinculos, borrarlo se llevaria la imputacion de alguien.");
      for (const s of sobrantes) {
        console.log(`  [${s.tipo}] ${s.nombre.slice(0, 70)}`);
        console.log(`      clave: ${s.clave_estable}  ·  vinculos de proyectos: ${s.vinculos}`);
      }
      console.log("\nSi son restos de una version anterior del documento y no tienen vinculos, se dan de baja con:");
      console.log("  update public.plan_rector_nodo set activa = false where clave_estable in (...);");
    } else {
      console.log("\nSin divergencias: la base coincide con el JSON.");
    }
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });

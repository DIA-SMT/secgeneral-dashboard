/**
 * 200_import_poa_2026.ts
 *
 * Importa la planificación completa POA 2026 desde el Excel oficial:
 *   "poa 26 - indicadores.xlsx"
 *
 * Estructura del Excel:
 *   - Hoja1: maestro org (Secretaría → Subsecretaría → Dirección → Responsable)
 *   - 7 hojas POA (SGral, SGob, SITec, SIMun, ContGral, SATCiu, SAyDS):
 *     id_direccion | id_proyecto | nombre_proyecto | id_metas | descripcion_metas
 *     | id_indicador | nombre_indicador | valor_meta_semestral
 *
 * Pre-requisito: ejecutar antes la migración 009_importar_poa_2026.sql
 * (vacía las tablas de planificación).
 *
 * Uso:
 *   npx tsx supabase/import/200_import_poa_2026.ts <ruta-al-xlsx>
 *
 * Variables de entorno requeridas en .env.local:
 *   SUPABASE_DB_URL — connection string a Postgres de Supabase
 */

import { Client } from "pg";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

// Cargar .env.local manualmente (sin depender de dotenv)
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  // Quitar BOM si lo hubiera
  const content = fs.readFileSync(envPath, "utf8").replace(/^﻿/, "");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Quitar comillas envolventes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
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
  process.argv[2] ??
  "C:\\Users\\LBonilla-DIA\\Downloads\\poa 26 - indicadores.xlsx";

// ========================================================================
// Mapeo: hoja POA → id_secretaria (Excel)
// ========================================================================
const SHEET_TO_SECRETARIA: Record<string, string> = {
  SGral: "SEC01",
  SGob: "SEC02",
  SITec: "SEC03",
  SIMun: "SEC04",
  ContGral: "SEC05",
  SATCiu: "SEC06",
  SAyDS: "SEC07",
};

// ========================================================================
// Helpers
// ========================================================================
const norm = (s: string | null | undefined): string =>
  (s ?? "").toString().trim().replace(/\s+/g, " ");

// Extrae el código DIR\d+ del string compuesto "DIR01  - DIRECCION DE SALUD"
// Normaliza typos comunes del Excel: "DIR1O" (letra O) → "DIR10" (cero)
function extractDirCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Reemplazar O/o por 0 dentro del patrón "DIR<algo>"
  const normalized = raw.toString().replace(/DIR([0-9O]+)/gi, (_m, p1) =>
    "DIR" + p1.toUpperCase().replace(/O/g, "0")
  );
  const m = normalized.match(/(DIR\d+)/i);
  return m ? m[1].toUpperCase() : null;
}
function extractSecCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const m = raw.toString().match(/(SEC\d+)/i);
  return m ? m[1].toUpperCase() : null;
}

// ========================================================================
// Main
// ========================================================================
async function main() {
  console.log(`📂 Leyendo Excel: ${xlsxPath}`);
  const wb = XLSX.readFile(xlsxPath);

  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  console.log("✅ Conectado a Supabase");

  try {
    await db.query("BEGIN");

    // ===== Paso 0: Preservar autenticación =====
    // Guardamos el vínculo perfil_usuario.user_id <-> codigo_unidad antes
    // de truncar unidad_organizacional. Después del import, recuperamos el
    // user → nueva unidad_id usando el código (SEC01..07, DIR01..43) que
    // se mantiene estable entre versiones del Excel.
    console.log("💾 Preservando autenticación y perfiles...");
    const perfilesBackup = await db.query<{
      user_id: string;
      email: string;
      codigo_unidad: string | null;
    }>(`
      SELECT pu.user_id, pu.email, uo.codigo AS codigo_unidad
      FROM perfil_usuario pu
      LEFT JOIN unidad_organizacional uo ON uo.id = pu.unidad_id
    `);
    console.log(`  → ${perfilesBackup.rows.length} perfiles guardados`);

    // Romper temporalmente la FK y el check constraint que exige unidad
    // para Director/Secretario/Subsec — lo recuperamos al final del import.
    await db.query(`
      ALTER TABLE public.perfil_usuario
        DROP CONSTRAINT IF EXISTS perfil_usuario_unidad_id_fkey,
        DROP CONSTRAINT IF EXISTS chk_perfil_unidad
    `);
    await db.query(`
      UPDATE perfil_usuario SET unidad_id = NULL WHERE unidad_id IS NOT NULL
    `);

    // ===== Limpiar datos del POA (sin tocar auth.users ni perfil_usuario) =====
    console.log("🧹 Limpiando datos del POA actual...");
    await db.query(`
      TRUNCATE TABLE
        public.avance,
        public.hito,
        public.indicador,
        public.meta,
        public.proyecto,
        public.unidad_organizacional
      RESTART IDENTITY CASCADE
    `);
    // Limpiar agendas porque tienen FK a unidad_organizacional
    await db.query(
      `TRUNCATE TABLE public.agenda_actividad, public.agenda_semana RESTART IDENTITY CASCADE`
    );
    console.log("  ✓ Tablas vaciadas");

    // ===== Paso 1: Periodo =====
    const periodoRes = await db.query<{ id: string }>(
      `SELECT id FROM periodo WHERE activo = true AND anio = 2026 LIMIT 1`
    );
    let periodoId: string;
    if (periodoRes.rows.length > 0) {
      periodoId = periodoRes.rows[0].id;
      console.log(`📅 Periodo 2026 existente: ${periodoId}`);
    } else {
      const insP = await db.query<{ id: string }>(
        `INSERT INTO periodo (anio, nombre, fecha_inicio, fecha_fin, activo, configuracion)
         VALUES (2026, 'Plan Operativo Anual 2026', '2026-01-01', '2026-12-31', true,
                 '{"umbrales_semaforo":{"verde_min":80,"amarillo_min":50,"dias_sin_actualizar_alerta":15}}'::jsonb)
         RETURNING id`
      );
      periodoId = insP.rows[0].id;
      console.log(`📅 Periodo 2026 creado: ${periodoId}`);
    }

    // ===== Paso 2: Parsear Hoja1 =====
    type DirRow = {
      codigo: string;
      nombre: string;
      responsable: string | null;
      sec_codigo: string;
      sec_nombre: string;
      subsec_nombre: string | null;
    };
    const h1 = XLSX.utils.sheet_to_json<Record<string, string | null>>(
      wb.Sheets["Hoja1"],
      { defval: null, raw: false }
    );

    const secs = new Map<string, string>(); // codigo → nombre
    const subsByName = new Map<string, { nombre: string; sec_codigo: string }>(); // key = sec_codigo + "::" + nombre
    const dirs: DirRow[] = [];

    let lastSec: { codigo: string; nombre: string } | null = null;
    let lastSub: string | null = null;

    for (const r of h1) {
      const secCodigo = norm(r["id_secretaria"] as string | null);
      const secNombre = norm(r["nombre_secretaria"] as string | null);
      const subNombre = norm(r["nombre_subsecretaria "] as string | null);
      const dirCodigo = norm(r["id_direccion"] as string | null);
      const dirNombre = norm(r["nombre_direccion"] as string | null);
      const responsable = norm(r["nombre_responsable"] as string | null);

      if (secCodigo) {
        lastSec = { codigo: secCodigo, nombre: secNombre || secCodigo };
        secs.set(lastSec.codigo, lastSec.nombre);
        lastSub = null; // ⚠️ resetear subsec al cambiar de secretaría (evita herencia cruzada)
      }
      if (subNombre) {
        lastSub = subNombre;
        if (lastSec) {
          const key = `${lastSec.codigo}::${lastSub}`;
          if (!subsByName.has(key)) {
            subsByName.set(key, { nombre: lastSub, sec_codigo: lastSec.codigo });
          }
        }
      }
      if (dirCodigo && extractDirCode(dirCodigo) && lastSec) {
        dirs.push({
          codigo: extractDirCode(dirCodigo)!,
          nombre: dirNombre || dirCodigo,
          responsable: responsable || null,
          sec_codigo: lastSec.codigo,
          sec_nombre: lastSec.nombre,
          subsec_nombre: lastSub,
        });
      }
    }

    console.log(
      `📊 Hoja1 parseada: ${secs.size} secretarías, ${subsByName.size} subsecretarías, ${dirs.length} direcciones`
    );

    // ===== Paso 3: Insertar Secretarías (nivel 0) =====
    const secIds = new Map<string, string>(); // sec_codigo → uuid
    let orden = 0;
    for (const [codigo, nombre] of secs) {
      const res = await db.query<{ id: string }>(
        `INSERT INTO unidad_organizacional
           (parent_id, nombre, nombre_corto, tipo, nivel, orden, activa, codigo)
         VALUES (NULL, $1, $1, 'secretaria', 0, $2, true, $3)
         RETURNING id`,
        [nombre, orden++, codigo]
      );
      secIds.set(codigo, res.rows[0].id);
    }
    console.log(`✅ ${secIds.size} secretarías insertadas`);

    // ===== Paso 4: Subsecretarías (nivel 1) =====
    const subIds = new Map<string, string>(); // key sec_codigo::nombre → uuid
    orden = 0;
    for (const [key, sub] of subsByName) {
      const parentId = secIds.get(sub.sec_codigo);
      if (!parentId) continue;
      const res = await db.query<{ id: string }>(
        `INSERT INTO unidad_organizacional
           (parent_id, nombre, nombre_corto, tipo, nivel, orden, activa)
         VALUES ($1, $2, $2, 'subsecretaria', 1, $3, true)
         RETURNING id`,
        [parentId, sub.nombre, orden++]
      );
      subIds.set(key, res.rows[0].id);
    }
    console.log(`✅ ${subIds.size} subsecretarías insertadas`);

    // ===== Paso 5: Direcciones (nivel 2) =====
    const dirIds = new Map<string, string>(); // codigo → uuid
    orden = 0;
    for (const d of dirs) {
      let parentId: string | undefined;
      if (d.subsec_nombre) {
        parentId = subIds.get(`${d.sec_codigo}::${d.subsec_nombre}`);
      }
      if (!parentId) parentId = secIds.get(d.sec_codigo); // cuelga directo de la sec
      if (!parentId) {
        console.warn(`  ⚠️  ${d.codigo} sin parent (sec=${d.sec_codigo})`);
        continue;
      }
      const res = await db.query<{ id: string }>(
        `INSERT INTO unidad_organizacional
           (parent_id, nombre, nombre_corto, tipo, nivel, orden, activa, codigo, responsable_nombre)
         VALUES ($1, $2, $2, 'direccion', 2, $3, true, $4, $5)
         RETURNING id`,
        [parentId, d.nombre, orden++, d.codigo, d.responsable]
      );
      dirIds.set(d.codigo, res.rows[0].id);
    }
    console.log(`✅ ${dirIds.size} direcciones insertadas`);

    // ===== Paso 6: Hojas POA - proyectos / metas / indicadores =====
    let totalProyectos = 0;
    let totalMetas = 0;
    let totalIndicadores = 0;
    const proyectoCodToId = new Map<string, string>();
    const metaCodToId = new Map<string, string>();

    for (const sheetName of Object.keys(SHEET_TO_SECRETARIA)) {
      if (!wb.SheetNames.includes(sheetName)) {
        console.warn(`⚠️  Hoja ${sheetName} no encontrada, salteando`);
        continue;
      }
      const rows = XLSX.utils.sheet_to_json<Record<string, string | null>>(
        wb.Sheets[sheetName],
        { defval: null, raw: false }
      );

      let dirCodigoActivo: string | null = null;
      let proyectoIdActivo: string | null = null;
      let metaIdActivo: string | null = null;
      let proyectosHoja = 0;
      let metasHoja = 0;
      let indicadoresHoja = 0;

      for (const r of rows) {
        const dirRaw = norm(r["id_direccion"] as string | null);
        if (dirRaw) {
          const dc = extractDirCode(dirRaw);
          // SIMun mezcla dirección y secretaría en la primera columna; ignorar SEC*
          if (dc) {
            dirCodigoActivo = dc;
            proyectoIdActivo = null;
            metaIdActivo = null;
          } else if (extractSecCode(dirRaw)) {
            // Direcciones que cuelgan directo de la secretaría — usamos esa secretaría como contenedor
            const sc = extractSecCode(dirRaw)!;
            // Buscar una pseudo-dirección con código sec o bien usar la secretaría directamente como unidad
            // Por simplicidad, asignamos el proyecto a la secretaría
            dirCodigoActivo = sc; // se usa lookup combinado más abajo
            proyectoIdActivo = null;
            metaIdActivo = null;
          }
        }

        const pyCodigo = norm(r["id_proyecto"] as string | null);
        const pyNombre = norm(r["nombre_proyecto"] as string | null);
        if (pyCodigo && pyNombre) {
          // Resolver unidad_id
          let unidadId: string | undefined;
          if (dirCodigoActivo?.startsWith("DIR")) {
            unidadId = dirIds.get(dirCodigoActivo);
          } else if (dirCodigoActivo?.startsWith("SEC")) {
            unidadId = secIds.get(dirCodigoActivo);
          }
          if (!unidadId) {
            console.warn(`  ⚠️  ${pyCodigo} sin unidad (dir=${dirCodigoActivo}) en ${sheetName}`);
            continue;
          }
          const res = await db.query<{ id: string }>(
            `INSERT INTO proyecto
               (periodo_id, unidad_id, codigo, nombre, estado, orden, metadata)
             VALUES ($1, $2, $3, $4, 'activo', $5, $6::jsonb)
             RETURNING id`,
            [
              periodoId,
              unidadId,
              pyCodigo,
              pyNombre,
              totalProyectos,
              JSON.stringify({ import_source: "poa_2026_xlsx", hoja: sheetName }),
            ]
          );
          proyectoIdActivo = res.rows[0].id;
          proyectoCodToId.set(pyCodigo, proyectoIdActivo);
          metaIdActivo = null;
          totalProyectos++;
          proyectosHoja++;
        }

        const metaCodigo = norm(r["id_metas"] as string | null);
        const metaDesc = norm(r["descripcion_metas"] as string | null);
        if (metaCodigo && metaDesc) {
          if (!proyectoIdActivo) {
            console.warn(`  ⚠️  ${metaCodigo} sin proyecto activo en ${sheetName}`);
            continue;
          }
          const res = await db.query<{ id: string }>(
            `INSERT INTO meta
               (proyecto_id, codigo, nombre, tipo_medicion, estado_semaforo, orden, metadata)
             VALUES ($1, $2, $3, 'cuantitativo', 'sin_datos', $4, $5::jsonb)
             RETURNING id`,
            [
              proyectoIdActivo,
              metaCodigo,
              metaDesc,
              totalMetas,
              JSON.stringify({ import_source: "poa_2026_xlsx", hoja: sheetName }),
            ]
          );
          metaIdActivo = res.rows[0].id;
          metaCodToId.set(metaCodigo, metaIdActivo);
          totalMetas++;
          metasHoja++;
        }

        const indCodigo = norm(r["id_indicador"] as string | null);
        const indNombre = norm(r["nombre_indicador"] as string | null);
        if (indCodigo && indNombre) {
          if (!metaIdActivo) {
            // Indicador huérfano (puede pasar si la fila no tiene meta arriba)
            continue;
          }
          const valorMeta = norm(r["valor_meta_semestral"] as string | null);
          const valorObj = valorMeta ? Number(valorMeta) : null;
          await db.query(
            `INSERT INTO indicador
               (meta_id, codigo, nombre, valor_objetivo, estado_semaforo, orden, metadata)
             VALUES ($1, $2, $3, $4, 'sin_datos', $5, $6::jsonb)`,
            [
              metaIdActivo,
              indCodigo,
              indNombre,
              Number.isFinite(valorObj) ? valorObj : null,
              totalIndicadores,
              JSON.stringify({ import_source: "poa_2026_xlsx", hoja: sheetName }),
            ]
          );
          totalIndicadores++;
          indicadoresHoja++;
        }
      }

      console.log(
        `  ${sheetName}: ${proyectosHoja} proyectos, ${metasHoja} metas, ${indicadoresHoja} indicadores`
      );
    }

    // ===== Paso 7: Re-vincular perfiles a las nuevas unidades por código =====
    console.log("\n🔗 Re-vinculando perfiles a las nuevas unidades...");
    let relinkados = 0;
    let huerfanos = 0;
    for (const perfil of perfilesBackup.rows) {
      if (!perfil.codigo_unidad) continue;
      // Buscar la nueva unidad con ese código
      const codigo = perfil.codigo_unidad;
      let nuevaId: string | undefined;
      if (codigo.startsWith("SEC")) nuevaId = secIds.get(codigo);
      else if (codigo.startsWith("DIR")) nuevaId = dirIds.get(codigo);
      if (nuevaId) {
        await db.query(
          `UPDATE perfil_usuario SET unidad_id = $1 WHERE user_id = $2`,
          [nuevaId, perfil.user_id]
        );
        relinkados++;
      } else {
        huerfanos++;
        console.warn(
          `  ⚠️  ${perfil.email} apuntaba a ${codigo} pero no existe en el nuevo Excel`
        );
      }
    }
    console.log(`  ✓ ${relinkados} perfiles re-vinculados, ${huerfanos} huérfanos`);

    // ===== Desactivar perfiles huérfanos que requieren unidad =====
    // Si un Director/Secretario/Subsecretario quedó sin unidad porque su código
    // desapareció del Excel nuevo, lo desactivamos. Un Admin lo reasigna después.
    const desactivadosRes = await db.query<{ email: string; rol: string }>(`
      UPDATE perfil_usuario
      SET activo = false
      WHERE unidad_id IS NULL
        AND rol IN ('director', 'subsecretario', 'secretario')
        AND activo = true
      RETURNING email, rol
    `);
    if (desactivadosRes.rows.length > 0) {
      console.log(`  ⚠️  ${desactivadosRes.rows.length} perfiles desactivados por quedar sin unidad:`);
      for (const r of desactivadosRes.rows) console.log(`     - ${r.email} (${r.rol})`);
    }

    // ===== Restaurar las constraints que dropeamos al principio =====
    console.log("🔒 Restaurando constraints de perfil_usuario...");
    await db.query(`
      ALTER TABLE public.perfil_usuario
        ADD CONSTRAINT perfil_usuario_unidad_id_fkey
          FOREIGN KEY (unidad_id) REFERENCES public.unidad_organizacional(id)
    `);
    // Check constraint con NOT VALID para tolerar huérfanos inactivos (no se
    // valida sobre filas existentes pero sí protege futuras inserts/updates).
    await db.query(`
      ALTER TABLE public.perfil_usuario
        ADD CONSTRAINT chk_perfil_unidad CHECK (
          (rol IN ('intendenta', 'admin_funcional', 'admin_tecnico'))
          OR (rol IN ('secretario', 'subsecretario', 'director') AND unidad_id IS NOT NULL)
        ) NOT VALID
    `);

    await db.query("COMMIT");

    console.log("\n📊 RESUMEN FINAL:");
    console.log(`  Secretarías:    ${secIds.size}`);
    console.log(`  Subsecretarías: ${subIds.size}`);
    console.log(`  Direcciones:    ${dirIds.size}`);
    console.log(`  Proyectos:      ${totalProyectos}`);
    console.log(`  Metas:          ${totalMetas}`);
    console.log(`  Indicadores:    ${totalIndicadores}`);
    console.log(`  Perfiles:       ${relinkados} re-vinculados / ${perfilesBackup.rows.length} totales`);
    console.log("\n✅ Import completado");
  } catch (err) {
    await db.query("ROLLBACK");
    console.error("❌ Error, rollback ejecutado:", err);
    throw err;
  } finally {
    await db.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

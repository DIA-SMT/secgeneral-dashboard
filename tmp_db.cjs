const { Client } = require("pg");
const fs = require("fs"); const path = require("path");
const content = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8").replace(/^﻿/, "");
for (const raw of content.split(/\r?\n/)) {
  const line = raw.trim(); if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("="); if (eq === -1) continue;
  const k = line.slice(0, eq).trim(); let v = line.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (k && !process.env[k]) process.env[k] = v;
}
(async () => {
  const db = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await db.connect();
  const r = await db.query(`SELECT codigo, nombre, responsable_nombre, tipo FROM unidad_organizacional WHERE codigo = ANY($1) ORDER BY codigo`,
    [['DIR16','DIR17','DIR18','DIR19','DIR20','DIR21','DIR22']]);
  console.table(r.rows);
  // also subsec cultura
  const s = await db.query(`SELECT codigo,nombre,responsable_nombre FROM unidad_organizacional WHERE nombre ILIKE '%cultura%'`);
  console.table(s.rows);
  await db.end();
})().catch(e=>{console.error(e);process.exit(1);});

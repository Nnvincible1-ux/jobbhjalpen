// Idempotent startup migration: runs all drizzle/*.sql statements against the
// database. Safe to run on every deploy. Creates a __migrations table to skip
// files that already ran, and tolerates "already exists" errors as a fallback.
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const drizzleDir = path.resolve(__dirname, "..", "drizzle");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL saknas");
  process.exit(0); // do not block startup; server will surface its own error
}

function splitStatements(sql) {
  // drizzle uses "--> statement-breakpoint" between statements
  return sql
    .split(/-->\s*statement-breakpoint/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

const IGNORABLE = [
  "ER_TABLE_EXISTS_ERROR",
  "ER_DUP_FIELDNAME",
  "ER_DUP_KEYNAME",
  "ER_DUP_ENTRY",
  "ER_CANT_DROP_FIELD_OR_KEY",
  "ER_FK_DUP_NAME",
];

async function main() {
  const conn = await mysql.createConnection({ uri: url, multipleStatements: false });
  try {
    await conn.query(
      "CREATE TABLE IF NOT EXISTS `__migrations` (`name` varchar(255) NOT NULL, `appliedAt` timestamp NOT NULL DEFAULT (now()), PRIMARY KEY (`name`))"
    );
    const files = (await readdir(drizzleDir)).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      const [rows] = await conn.query("SELECT name FROM `__migrations` WHERE name = ?", [file]);
      if (Array.isArray(rows) && rows.length > 0) continue;
      const sql = await readFile(path.join(drizzleDir, file), "utf8");
      const statements = splitStatements(sql);
      for (const stmt of statements) {
        try {
          await conn.query(stmt);
        } catch (e) {
          if (IGNORABLE.includes(e.code)) continue;
          console.error(`[migrate] fel i ${file}: ${e.code} ${e.message}`);
        }
      }
      await conn.query("INSERT IGNORE INTO `__migrations` (name) VALUES (?)", [file]);
      console.log(`[migrate] tillämpade ${file}`);
    }
    console.log("[migrate] klar");
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error("[migrate] oväntat fel", e);
  process.exit(0); // never block server startup
});

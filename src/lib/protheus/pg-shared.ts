import { Pool } from "pg";

let pool: Pool | null = null;

export function isProtheusPgConfigured() {
  return Boolean(
    process.env.PROTHEUS_PG_URL ||
      (process.env.PROTHEUS_PG_HOST && process.env.PROTHEUS_PG_DATABASE),
  );
}

export function getProtheusPool() {
  if (pool) return pool;
  if (process.env.PROTHEUS_PG_URL) {
    pool = new Pool({ connectionString: process.env.PROTHEUS_PG_URL });
    return pool;
  }
  pool = new Pool({
    host: process.env.PROTHEUS_PG_HOST || "127.0.0.1",
    port: Number(process.env.PROTHEUS_PG_PORT || 5432),
    database: process.env.PROTHEUS_PG_DATABASE || "protheus",
    user: process.env.PROTHEUS_PG_USER || "protheus",
    password: process.env.PROTHEUS_PG_PASSWORD || "",
    max: 5,
  });
  return pool;
}

export function safeTableName(tableRaw: string, label: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableRaw)) {
    throw new Error(`${label} inválida`);
  }
  return tableRaw;
}

export function pad(value: string, size: number) {
  const raw = (value ?? "").slice(0, size);
  return raw + " ".repeat(Math.max(0, size - raw.length));
}

export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function trim(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : value == null
      ? ""
      : String(value).trim();
}

import { Pool, type QueryResultRow } from "pg";
import { getProtheusConfig } from "@/lib/protheus/config";

let pool: Pool | null = null;

export function isProtheusPgConfigured() {
  return Boolean(
    process.env.PROTHEUS_PG_URL ||
      (process.env.PROTHEUS_PG_HOST && process.env.PROTHEUS_PG_DATABASE),
  );
}

function getPool() {
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

export type ProtheusSa1Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  store: string | null;
  source: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  protheusCode: string | null;
};

function trim(value: unknown) {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

export async function fetchSa1ClientsFromPg(q = ""): Promise<{
  empresa: string;
  filial: string;
  clients: ProtheusSa1Client[];
}> {
  const config = getProtheusConfig();
  const tableRaw = process.env.PROTHEUS_SA1_TABLE || "sa1990";
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableRaw)) {
    throw new Error("PROTHEUS_SA1_TABLE inválida");
  }
  const table = tableRaw;
  const db = getPool();

  const result = await db.query<QueryResultRow>(
    `SELECT a1_cod, a1_loja, a1_nome, a1_nreduz, a1_email, a1_tel, a1_cgc
     FROM ${table}
     WHERE d_e_l_e_t_ = ' '
     ORDER BY a1_cod
     LIMIT 500`,
  );

  const needle = q.trim().toLowerCase();
  const clients = result.rows
    .map((row) => {
      const code = trim(row.a1_cod);
      const store = trim(row.a1_loja) || null;
      const name = trim(row.a1_nome) || trim(row.a1_nreduz) || code;
      return {
        id: `${code}-${store ?? "01"}`,
        name,
        email: trim(row.a1_email) || null,
        phone: trim(row.a1_tel) || null,
        document: trim(row.a1_cgc) || null,
        store,
        source: "protheus-live",
        totalOrders: 0,
        totalSpent: 0,
        lastOrderAt: null as string | null,
        protheusCode: code || null,
      };
    })
    .filter((client) => {
      if (!needle) return true;
      const hay = [
        client.name,
        client.email,
        client.phone,
        client.document,
        client.protheusCode,
        client.store,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });

  return {
    empresa: config.empresa,
    filial: config.filial,
    clients,
  };
}

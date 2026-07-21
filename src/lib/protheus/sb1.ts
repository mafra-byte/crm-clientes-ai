import type { QueryResultRow } from "pg";
import { getProtheusConfig } from "@/lib/protheus/config";
import {
  getProtheusPool,
  isProtheusPgConfigured,
  pad,
  safeTableName,
  trim,
} from "@/lib/protheus/pg-shared";
import { getTesByCode } from "@/lib/protheus/sf4";

export type CreateSb1Input = {
  code?: string;
  description: string;
  type?: string;
  unit?: string;
  warehouse?: string;
  group?: string;
  price?: number;
  entryTes?: string;
  exitTes?: string;
};

export type ProtheusSb1Product = {
  id: string;
  code: string;
  description: string;
  type: string | null;
  unit: string | null;
  warehouse: string | null;
  group: string | null;
  price: number;
  entryTes: string | null;
  exitTes: string | null;
  source: string;
};

function sb1Table() {
  return safeTableName(
    process.env.PROTHEUS_SB1_TABLE || "sb1990",
    "PROTHEUS_SB1_TABLE",
  );
}

async function nextSb1Code(table: string) {
  const db = getProtheusPool();
  const result = await db.query<{ next: string | null }>(
    `SELECT COALESCE(
       MAX(
         CASE
           WHEN TRIM(b1_cod) ~ '^PA[0-9]+$'
           THEN SUBSTRING(TRIM(b1_cod) FROM 3)::int
           ELSE NULL
         END
       ),
       0
     ) + 1 AS next
     FROM ${table}
     WHERE d_e_l_e_t_ = ' '`,
  );
  const next = Number.parseInt(result.rows[0]?.next ?? "1", 10);
  if (!Number.isFinite(next) || next > 9999) {
    throw new Error("Limite de códigos SB1 atingido");
  }
  return `PA${String(next).padStart(4, "0")}`;
}

export async function fetchSb1ProductsFromPg(q = "") {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }
  const config = getProtheusConfig();
  const table = sb1Table();
  const db = getProtheusPool();
  const result = await db.query<QueryResultRow>(
    `SELECT b1_cod, b1_desc, b1_tipo, b1_um, b1_locpad, b1_grupo, b1_prv1,
            b1_te, b1_ts
     FROM ${table}
     WHERE d_e_l_e_t_ = ' '
     ORDER BY b1_cod
     LIMIT 500`,
  );

  const needle = q.trim().toLowerCase();
  const products = result.rows
    .map((row) => {
      const code = trim(row.b1_cod);
      return {
        id: code,
        code,
        description: trim(row.b1_desc) || code,
        type: trim(row.b1_tipo) || null,
        unit: trim(row.b1_um) || null,
        warehouse: trim(row.b1_locpad) || null,
        group: trim(row.b1_grupo) || null,
        price: Number(row.b1_prv1 ?? 0) || 0,
        entryTes: trim(row.b1_te) || null,
        exitTes: trim(row.b1_ts) || null,
        source: "protheus-pg",
      } satisfies ProtheusSb1Product;
    })
    .filter((item) => {
      if (!needle) return true;
      const hay = [
        item.code,
        item.description,
        item.type,
        item.unit,
        item.group,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });

  return {
    empresa: config.empresa,
    filial: config.filial,
    products,
  };
}

export async function createSb1ProductInPg(input: CreateSb1Input) {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }

  const description = input.description.trim();
  if (!description) throw new Error("Informe a descrição do produto");

  const table = sb1Table();
  const db = getProtheusPool();
  const code = (input.code?.trim() || (await nextSb1Code(table)))
    .toUpperCase()
    .slice(0, 15);
  if (!code) throw new Error("Informe o código do produto");

  const type = (input.type?.trim() || "PA").toUpperCase().slice(0, 2);
  const unit = (input.unit?.trim() || "UN").toUpperCase().slice(0, 2);
  const warehouse = (input.warehouse?.trim() || "01").slice(0, 2);
  const group = (input.group?.trim() || "0001").slice(0, 4);
  const price =
    typeof input.price === "number" && Number.isFinite(input.price)
      ? input.price
      : Number(input.price ?? 0) || 0;

  const entryTes = (input.entryTes?.trim() || "001").padStart(3, "0").slice(-3);
  const entry = await getTesByCode(entryTes);
  if (entry.type !== "E") {
    throw new Error(`TES de entrada ${entry.code} inválida no SF4`);
  }
  const exitTesRaw = (input.exitTes?.trim() || "").padStart(3, "0").slice(-3);
  let exitTes = "";
  if (input.exitTes?.trim()) {
    const exit = await getTesByCode(exitTesRaw);
    if (exit.type !== "S") {
      throw new Error(`TES de saída ${exit.code} inválida no SF4`);
    }
    exitTes = exit.code;
  }

  const existing = await db.query(
    `SELECT 1 FROM ${table}
     WHERE d_e_l_e_t_ = ' ' AND b1_filial = $1 AND b1_cod = $2
     LIMIT 1`,
    [pad("", 2), pad(code, 15)],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw new Error(`Já existe produto ${code} no Protheus`);
  }

  await db.query(
    `INSERT INTO ${table} (
      b1_filial, b1_cod, b1_desc, b1_tipo, b1_um, b1_locpad, b1_grupo,
      b1_prv1, b1_msblql, b1_te, b1_ts
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
    )`,
    [
      pad("", 2),
      pad(code, 15),
      pad(description, 50),
      pad(type, 2),
      pad(unit, 2),
      pad(warehouse, 2),
      pad(group, 4),
      price,
      pad("2", 1),
      pad(entry.code, 3),
      pad(exitTes, 3),
    ],
  );

  return {
    empresa: getProtheusConfig().empresa,
    filial: getProtheusConfig().filial,
    product: {
      id: code,
      code,
      description,
      type,
      unit,
      warehouse,
      group,
      price,
      entryTes: entry.code,
      exitTes: exitTes || null,
      source: "protheus-pg",
    } satisfies ProtheusSb1Product,
  };
}

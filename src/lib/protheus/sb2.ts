import type { PoolClient, QueryResultRow } from "pg";
import { getProtheusConfig } from "@/lib/protheus/config";
import {
  getProtheusPool,
  isProtheusPgConfigured,
  pad,
  safeTableName,
  trim,
} from "@/lib/protheus/pg-shared";

export type ProtheusStockLine = {
  id: string;
  productCode: string;
  description: string;
  warehouse: string;
  quantity: number;
  unit: string | null;
  unitCost: number;
  totalValue: number;
  reserved: number;
  available: number;
  purchasedQty: number;
  source: string;
};

function sb2Table() {
  return safeTableName(
    process.env.PROTHEUS_SB2_TABLE || "sb2990",
    "PROTHEUS_SB2_TABLE",
  );
}

function sb1Table() {
  return safeTableName(
    process.env.PROTHEUS_SB1_TABLE || "sb1990",
    "PROTHEUS_SB1_TABLE",
  );
}

function sd1Table() {
  return safeTableName(
    process.env.PROTHEUS_SD1_TABLE || "sd1990",
    "PROTHEUS_SD1_TABLE",
  );
}

export async function fetchStockFromPg(q = "") {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }
  const config = getProtheusConfig();
  const stock = sb2Table();
  const products = sb1Table();
  const entries = sd1Table();
  const db = getProtheusPool();

  const result = await db.query<QueryResultRow>(
    `SELECT s.b2_cod, s.b2_local, s.b2_qatu, s.b2_cm1, s.b2_vatu1, s.b2_reserva,
            s.b2_dprod, p.b1_desc, p.b1_um,
            COALESCE(e.purchased, 0) AS purchased
     FROM ${stock} s
     LEFT JOIN ${products} p
       ON p.d_e_l_e_t_ = ' ' AND rtrim(p.b1_cod) = rtrim(s.b2_cod)
     LEFT JOIN (
       SELECT rtrim(d1_cod) AS cod,
              COALESCE(NULLIF(rtrim(d1_local), ''), '01') AS local,
              SUM(d1_quant) AS purchased
       FROM ${entries}
       WHERE d_e_l_e_t_ = ' '
       GROUP BY 1, 2
     ) e ON e.cod = rtrim(s.b2_cod)
        AND e.local = COALESCE(NULLIF(rtrim(s.b2_local), ''), '01')
     WHERE s.d_e_l_e_t_ = ' '
     ORDER BY s.b2_cod, s.b2_local
     LIMIT 500`,
  );

  const needle = q.trim().toLowerCase();
  const lines = result.rows
    .map((row) => {
      const productCode = trim(row.b2_cod);
      const warehouse = trim(row.b2_local) || "01";
      const quantity = Number(row.b2_qatu ?? 0) || 0;
      const reserved = Number(row.b2_reserva ?? 0) || 0;
      const unitCost = Number(row.b2_cm1 ?? 0) || 0;
      const totalValue =
        Number(row.b2_vatu1 ?? 0) || Math.round(quantity * unitCost * 100) / 100;
      const description =
        trim(row.b1_desc) || trim(row.b2_dprod) || productCode;
      return {
        id: `${productCode}-${warehouse}`,
        productCode,
        description,
        warehouse,
        quantity,
        unit: trim(row.b1_um) || null,
        unitCost,
        totalValue,
        reserved,
        available: Math.max(quantity - reserved, 0),
        purchasedQty: Number(row.purchased ?? 0) || 0,
        source: "protheus-pg",
      } satisfies ProtheusStockLine;
    })
    .filter((line) => {
      if (!needle) return true;
      const hay = [line.productCode, line.description, line.warehouse]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });

  return {
    empresa: config.empresa,
    filial: config.filial,
    lines,
    totals: {
      items: lines.length,
      quantity: lines.reduce((n, l) => n + l.quantity, 0),
      value: lines.reduce((n, l) => n + l.totalValue, 0),
    },
  };
}

/** Atualiza SB2 dentro da mesma transação do recebimento. */
export async function applyReceiptToStock(
  client: PoolClient,
  input: {
    filial: string;
    productCode: string;
    warehouse: string;
    quantity: number;
    unitPrice: number;
    description?: string;
  },
) {
  const table = sb2Table();
  const filial = pad(input.filial.slice(0, 2), 2);
  const productCode = pad(input.productCode.trim().toUpperCase(), 15);
  const warehouse = pad((input.warehouse || "01").slice(0, 2), 2);
  const quantity = Number(input.quantity);
  const unitPrice = Number(input.unitPrice);
  const total = Math.round(quantity * unitPrice * 100) / 100;
  const description = (input.description || input.productCode).slice(0, 50);

  const existing = await client.query<QueryResultRow>(
    `SELECT b2_qatu, b2_vatu1, b2_cm1
     FROM ${table}
     WHERE d_e_l_e_t_ = ' '
       AND b2_filial = $1
       AND rtrim(b2_cod) = rtrim($2)
       AND rtrim(b2_local) = rtrim($3)
     LIMIT 1`,
    [filial, productCode, warehouse],
  );

  if (existing.rows[0]) {
    const oldQty = Number(existing.rows[0].b2_qatu ?? 0) || 0;
    const oldVal = Number(existing.rows[0].b2_vatu1 ?? 0) || 0;
    const newQty = oldQty + quantity;
    const newVal = Math.round((oldVal + total) * 100) / 100;
    const newCm = newQty > 0 ? Math.round((newVal / newQty) * 1e6) / 1e6 : unitPrice;
    await client.query(
      `UPDATE ${table}
       SET b2_qatu = $1,
           b2_vatu1 = $2,
           b2_cm1 = $3,
           b2_qfim = $1
       WHERE d_e_l_e_t_ = ' '
         AND b2_filial = $4
         AND rtrim(b2_cod) = rtrim($5)
         AND rtrim(b2_local) = rtrim($6)`,
      [newQty, newVal, newCm, filial, productCode, warehouse],
    );
  } else {
    await client.query(
      `INSERT INTO ${table} (
        b2_filial, b2_cod, b2_local, b2_dprod, b2_qatu, b2_vatu1, b2_cm1, b2_qfim
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$5)`,
      [
        filial,
        productCode,
        warehouse,
        pad(description, 50),
        quantity,
        total,
        unitPrice,
      ],
    );
  }
}

import type { QueryResultRow } from "pg";
import { getProtheusConfig } from "@/lib/protheus/config";
import {
  getProtheusPool,
  isProtheusPgConfigured,
  pad,
  safeTableName,
  trim,
} from "@/lib/protheus/pg-shared";

export type CreateSc1Input = {
  productCode: string;
  quantity: number;
  unitPrice?: number;
  unit?: string;
  description?: string;
  warehouse?: string;
  requester?: string;
  notes?: string;
  needDate?: string; // YYYY-MM-DD or YYYYMMDD
  number?: string;
};

export type ProtheusSc1Line = {
  id: string;
  number: string;
  item: string;
  productCode: string;
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  total: number;
  warehouse: string | null;
  requester: string | null;
  notes: string | null;
  emission: string | null;
  needDate: string | null;
  approved: string | null;
  quoteNumber: string | null;
  purchaseOrderNumber: string | null;
  purchaseOrderItem: string | null;
  quantityOrdered: number;
  closed: boolean;
  source: string;
};

function sc1Table() {
  return safeTableName(
    process.env.PROTHEUS_SC1_TABLE || "sc1990",
    "PROTHEUS_SC1_TABLE",
  );
}

function sb1Table() {
  return safeTableName(
    process.env.PROTHEUS_SB1_TABLE || "sb1990",
    "PROTHEUS_SB1_TABLE",
  );
}

function toProtheusDate(value?: string) {
  if (!value) {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  }
  const digits = value.replace(/\D/g, "");
  if (digits.length === 8) return digits;
  throw new Error("Data inválida. Use AAAA-MM-DD");
}

function formatDateOut(value: unknown) {
  const raw = trim(value);
  if (!raw || raw.length !== 8) return raw || null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

async function nextSc1Number(table: string, filial: string) {
  const db = getProtheusPool();
  const result = await db.query<{ max: string | null }>(
    `SELECT MAX(NULLIF(TRIM(c1_num), '')) AS max
     FROM ${table}
     WHERE d_e_l_e_t_ = ' '
       AND c1_filial = $1
       AND TRIM(c1_num) ~ '^[0-9]+$'`,
    [pad(filial, 2)],
  );
  const current = Number.parseInt(result.rows[0]?.max ?? "0", 10);
  const next = Number.isFinite(current) ? current + 1 : 1;
  if (next > 999999) throw new Error("Limite de números de SC atingido");
  return String(next).padStart(6, "0");
}

export async function fetchSc1FromPg(q = "") {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }
  const config = getProtheusConfig();
  const table = sc1Table();
  const db = getProtheusPool();
  const result = await db.query<QueryResultRow>(
    `SELECT c1_num, c1_item, c1_produto, c1_descri, c1_quant, c1_um,
            c1_vunit, c1_total, c1_local, c1_solicit, c1_obs,
            c1_emissao, c1_datprf, c1_aprov, c1_cotacao, c1_pedido,
            c1_itemped, c1_quje
     FROM ${table}
     WHERE d_e_l_e_t_ = ' '
     ORDER BY c1_num DESC, c1_item
     LIMIT 500`,
  );

  const needle = q.trim().toLowerCase();
  const lines = result.rows
    .map((row) => {
      const number = trim(row.c1_num);
      const item = trim(row.c1_item);
      const productCode = trim(row.c1_produto);
      const quoteNumber = trim(row.c1_cotacao) || null;
      const purchaseOrderNumber = trim(row.c1_pedido) || null;
      return {
        id: `${number}-${item}`,
        number,
        item,
        productCode,
        description: trim(row.c1_descri) || productCode,
        quantity: Number(row.c1_quant ?? 0) || 0,
        unit: trim(row.c1_um) || null,
        unitPrice: Number(row.c1_vunit ?? 0) || 0,
        total: Number(row.c1_total ?? 0) || 0,
        warehouse: trim(row.c1_local) || null,
        requester: trim(row.c1_solicit) || null,
        notes: trim(row.c1_obs) || null,
        emission: formatDateOut(row.c1_emissao),
        needDate: formatDateOut(row.c1_datprf),
        approved: trim(row.c1_aprov) || null,
        quoteNumber,
        purchaseOrderNumber,
        purchaseOrderItem: trim(row.c1_itemped) || null,
        quantityOrdered: Number(row.c1_quje ?? 0) || 0,
        closed: Boolean(quoteNumber || purchaseOrderNumber),
        source: "protheus-pg",
      } satisfies ProtheusSc1Line;
    })
    .filter((line) => {
      if (!needle) return true;
      const hay = [
        line.number,
        line.item,
        line.productCode,
        line.description,
        line.requester,
        line.notes,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });

  return {
    empresa: config.empresa,
    filial: config.filial,
    lines,
  };
}

export async function createSc1InPg(input: CreateSc1Input) {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }

  const productCode = input.productCode.trim().toUpperCase();
  if (!productCode) throw new Error("Informe o produto");
  const quantity = Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Informe uma quantidade válida");
  }

  const config = getProtheusConfig();
  const filial = (config.filial || "01").slice(0, 2).padStart(2, "0");
  const table = sc1Table();
  const products = sb1Table();
  const db = getProtheusPool();

  const product = await db.query<QueryResultRow>(
    `SELECT b1_cod, b1_desc, b1_um, b1_locpad, b1_prv1
     FROM ${products}
     WHERE d_e_l_e_t_ = ' ' AND rtrim(b1_cod) = $1
     LIMIT 1`,
    [productCode],
  );
  if (!product.rows[0]) {
    throw new Error(`Produto ${productCode} não encontrado no SB1`);
  }

  const p = product.rows[0];
  const description = (
    input.description?.trim() ||
    trim(p.b1_desc) ||
    productCode
  ).slice(0, 50);
  const unit = (input.unit?.trim() || trim(p.b1_um) || "UN")
    .toUpperCase()
    .slice(0, 2);
  const warehouse = (input.warehouse?.trim() || trim(p.b1_locpad) || "01").slice(
    0,
    2,
  );
  const unitPrice =
    typeof input.unitPrice === "number" && Number.isFinite(input.unitPrice)
      ? input.unitPrice
      : Number(p.b1_prv1 ?? 0) || 0;
  const total = Math.round(quantity * unitPrice * 100) / 100;
  const number =
    (input.number?.trim() || (await nextSc1Number(table, filial)))
      .replace(/\D/g, "")
      .padStart(6, "0")
      .slice(-6);
  const item = "0001";
  const emission = toProtheusDate();
  const needDate = toProtheusDate(input.needDate);
  const requester = (input.requester?.trim() || "Admin").slice(0, 25);
  const notes = (input.notes?.trim() || "").slice(0, 30);

  // if number already has items, append next item instead
  const existingItems = await db.query<{ max: string | null }>(
    `SELECT MAX(NULLIF(TRIM(c1_item), '')) AS max
     FROM ${table}
     WHERE d_e_l_e_t_ = ' ' AND c1_filial = $1 AND c1_num = $2`,
    [pad(filial, 2), pad(number, 6)],
  );
  let itemCode = item;
  if (existingItems.rows[0]?.max) {
    const current = Number.parseInt(String(existingItems.rows[0].max).trim(), 10);
    if (Number.isFinite(current)) {
      itemCode = String(current + 1).padStart(4, "0");
    }
  }

  await db.query(
    `INSERT INTO ${table} (
      c1_filial, c1_num, c1_item, c1_itemgrd, c1_produto, c1_descri, c1_um,
      c1_quant, c1_vunit, c1_total, c1_local, c1_emissao, c1_datprf,
      c1_solicit, c1_obs, c1_aprov
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
    )`,
    [
      pad(filial, 2),
      pad(number, 6),
      pad(itemCode, 4),
      pad("", 3),
      pad(productCode, 15),
      pad(description, 50),
      pad(unit, 2),
      quantity,
      unitPrice,
      total,
      pad(warehouse, 2),
      pad(emission, 8),
      pad(needDate, 8),
      pad(requester, 25),
      pad(notes, 30),
      pad("L", 1),
    ],
  );

  return {
    empresa: config.empresa,
    filial,
    line: {
      id: `${number}-${itemCode}`,
      number,
      item: itemCode,
      productCode,
      description,
      quantity,
      unit,
      unitPrice,
      total,
      warehouse,
      requester,
      notes: notes || null,
      emission: formatDateOut(emission),
      needDate: formatDateOut(needDate),
      approved: "L",
      quoteNumber: null,
      purchaseOrderNumber: null,
      purchaseOrderItem: null,
      quantityOrdered: 0,
      closed: false,
      source: "protheus-pg",
    } satisfies ProtheusSc1Line,
  };
}

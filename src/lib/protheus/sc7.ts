import type { QueryResultRow } from "pg";
import { getProtheusConfig } from "@/lib/protheus/config";
import {
  getProtheusPool,
  isProtheusPgConfigured,
  pad,
  safeTableName,
  trim,
} from "@/lib/protheus/pg-shared";

export type CreateSc7Input = {
  productCode: string;
  supplierCode: string;
  supplierStore?: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  description?: string;
  warehouse?: string;
  purchaseRequestNumber?: string;
  purchaseRequestItem?: string;
  quoteNumber?: string;
  quoteItem?: string;
  quoteProposal?: string;
  paymentTerm?: string;
  needDate?: string;
  notes?: string;
  number?: string;
};

export type ProtheusSc7Line = {
  id: string;
  number: string;
  item: string;
  productCode: string;
  description: string;
  quantity: number;
  quantityDelivered: number;
  unit: string | null;
  unitPrice: number;
  total: number;
  supplierCode: string;
  supplierStore: string;
  warehouse: string | null;
  purchaseRequestNumber: string | null;
  purchaseRequestItem: string | null;
  quoteNumber: string | null;
  emission: string | null;
  needDate: string | null;
  approval: string | null;
  closed: boolean;
  source: string;
};

function sc8Table() {
  return safeTableName(
    process.env.PROTHEUS_SC8_TABLE || "sc8990",
    "PROTHEUS_SC8_TABLE",
  );
}

function sc1Table() {
  return safeTableName(
    process.env.PROTHEUS_SC1_TABLE || "sc1990",
    "PROTHEUS_SC1_TABLE",
  );
}

function sc7Table() {
  return safeTableName(
    process.env.PROTHEUS_SC7_TABLE || "sc7990",
    "PROTHEUS_SC7_TABLE",
  );
}

function sb1Table() {
  return safeTableName(
    process.env.PROTHEUS_SB1_TABLE || "sb1990",
    "PROTHEUS_SB1_TABLE",
  );
}

function sa2Table() {
  return safeTableName(
    process.env.PROTHEUS_SA2_TABLE || "sa2990",
    "PROTHEUS_SA2_TABLE",
  );
}

function toProtheusDate(value?: string, addDays = 0) {
  const base = value
    ? (() => {
        const digits = value.replace(/\D/g, "");
        if (digits.length !== 8) throw new Error("Data inválida. Use AAAA-MM-DD");
        return new Date(
          Number(digits.slice(0, 4)),
          Number(digits.slice(4, 6)) - 1,
          Number(digits.slice(6, 8)),
        );
      })()
    : new Date();
  if (addDays) base.setDate(base.getDate() + addDays);
  return `${base.getFullYear()}${String(base.getMonth() + 1).padStart(2, "0")}${String(base.getDate()).padStart(2, "0")}`;
}

function formatDateOut(value: unknown) {
  const raw = trim(value);
  if (!raw || raw.length !== 8) return raw || null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

async function nextSc7Number(table: string, filial: string) {
  const db = getProtheusPool();
  const result = await db.query<{ max: string | null }>(
    `SELECT MAX(NULLIF(TRIM(c7_num), '')) AS max
     FROM ${table}
     WHERE d_e_l_e_t_ = ' '
       AND c7_filial = $1
       AND TRIM(c7_num) ~ '^[0-9]+$'`,
    [pad(filial, 2)],
  );
  const current = Number.parseInt(result.rows[0]?.max ?? "0", 10);
  const next = Number.isFinite(current) ? current + 1 : 1;
  if (next > 999999) throw new Error("Limite de números de PC atingido");
  return String(next).padStart(6, "0");
}

export async function fetchSc7FromPg(q = "") {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }
  const config = getProtheusConfig();
  const table = sc7Table();
  const db = getProtheusPool();
  const result = await db.query<QueryResultRow>(
    `SELECT c7_num, c7_item, c7_produto, c7_descri, c7_quant, c7_quje, c7_um,
            c7_preco, c7_total, c7_fornece, c7_loja, c7_local,
            c7_numsc, c7_itemsc, c7_numcot, c7_emissao, c7_datprf, c7_conapro,
            c7_encer
     FROM ${table}
     WHERE d_e_l_e_t_ = ' '
     ORDER BY c7_num DESC, c7_item
     LIMIT 500`,
  );

  const needle = q.trim().toLowerCase();
  const lines = result.rows
    .map((row) => {
      const number = trim(row.c7_num);
      const item = trim(row.c7_item);
      const productCode = trim(row.c7_produto);
      const supplierCode = trim(row.c7_fornece);
      const quantity = Number(row.c7_quant ?? 0) || 0;
      const quantityDelivered = Number(row.c7_quje ?? 0) || 0;
      const encerrado = trim(row.c7_encer).toUpperCase() === "E";
      return {
        id: `${number}-${item}`,
        number,
        item,
        productCode,
        description: trim(row.c7_descri) || productCode,
        quantity,
        quantityDelivered,
        unit: trim(row.c7_um) || null,
        unitPrice: Number(row.c7_preco ?? 0) || 0,
        total: Number(row.c7_total ?? 0) || 0,
        supplierCode,
        supplierStore: trim(row.c7_loja) || "01",
        warehouse: trim(row.c7_local) || null,
        purchaseRequestNumber: trim(row.c7_numsc) || null,
        purchaseRequestItem: trim(row.c7_itemsc) || null,
        quoteNumber: trim(row.c7_numcot) || null,
        emission: formatDateOut(row.c7_emissao),
        needDate: formatDateOut(row.c7_datprf),
        approval: trim(row.c7_conapro) || null,
        closed: encerrado || (quantity > 0 && quantityDelivered >= quantity),
        source: "protheus-pg",
      } satisfies ProtheusSc7Line;
    })
    .filter((line) => {
      if (!needle) return true;
      const hay = [
        line.number,
        line.item,
        line.productCode,
        line.description,
        line.supplierCode,
        line.purchaseRequestNumber,
        line.quoteNumber,
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

export async function createSc7InPg(input: CreateSc7Input) {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }

  const productCode = input.productCode.trim().toUpperCase();
  const supplierCode = input.supplierCode.trim().padStart(6, "0").slice(-6);
  if (!productCode) throw new Error("Informe o produto");
  if (!supplierCode) throw new Error("Informe o fornecedor");

  const quantity = Number(input.quantity);
  const unitPrice = Number(input.unitPrice);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Informe uma quantidade válida");
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error("Informe um preço válido");
  }

  const config = getProtheusConfig();
  const filial = (config.filial || "01").slice(0, 2).padStart(2, "0");
  const table = sc7Table();
  const products = sb1Table();
  const suppliers = sa2Table();
  const db = getProtheusPool();

  const product = await db.query<QueryResultRow>(
    `SELECT b1_cod, b1_desc, b1_um, b1_locpad
     FROM ${products}
     WHERE d_e_l_e_t_ = ' ' AND rtrim(b1_cod) = $1
     LIMIT 1`,
    [productCode],
  );
  if (!product.rows[0]) {
    throw new Error(`Produto ${productCode} não encontrado no SB1`);
  }

  const supplierStore = (input.supplierStore?.trim() || "01")
    .slice(0, 2)
    .padStart(2, "0");
  const supplier = await db.query(
    `SELECT 1 FROM ${suppliers}
     WHERE d_e_l_e_t_ = ' '
       AND rtrim(a2_cod) = $1
       AND rtrim(a2_loja) = $2
     LIMIT 1`,
    [supplierCode, supplierStore],
  );
  if (!supplier.rowCount) {
    throw new Error(`Fornecedor ${supplierCode}/${supplierStore} não encontrado no SA2`);
  }

  const description = (
    input.description?.trim() ||
    trim(product.rows[0].b1_desc) ||
    productCode
  ).slice(0, 50);
  const unit = (input.unit?.trim() || trim(product.rows[0].b1_um) || "UN")
    .toUpperCase()
    .slice(0, 2);
  const warehouse = (
    input.warehouse?.trim() ||
    trim(product.rows[0].b1_locpad) ||
    "01"
  ).slice(0, 2);
  const total = Math.round(quantity * unitPrice * 100) / 100;
  const number = (
    input.number?.trim() || (await nextSc7Number(table, filial))
  )
    .replace(/\D/g, "")
    .padStart(6, "0")
    .slice(-6);

  const existingItems = await db.query<{ max: string | null }>(
    `SELECT MAX(NULLIF(TRIM(c7_item), '')) AS max
     FROM ${table}
     WHERE d_e_l_e_t_ = ' ' AND c7_filial = $1 AND c7_num = $2`,
    [pad(filial, 2), pad(number, 6)],
  );
  let itemCode = "0001";
  if (existingItems.rows[0]?.max) {
    const current = Number.parseInt(String(existingItems.rows[0].max).trim(), 10);
    if (Number.isFinite(current)) itemCode = String(current + 1).padStart(4, "0");
  }

  const emission = toProtheusDate();
  const needDate = toProtheusDate(input.needDate, input.needDate ? 0 : 10);
  const paymentTerm = (input.paymentTerm?.trim() || "001").slice(0, 3);
  const numSc = (input.purchaseRequestNumber?.trim() || "").replace(/\D/g, "").slice(-6);
  const itemSc = (input.purchaseRequestItem?.trim() || "").replace(/\D/g, "").slice(-4);
  const numCot = (input.quoteNumber?.trim() || "").replace(/\D/g, "").slice(-6);
  const itemCot = (input.quoteItem?.trim() || "").replace(/\D/g, "").slice(-4);
  const proposalCot = (input.quoteProposal?.trim() || "").replace(/\D/g, "").slice(-2);
  const notes = (input.notes?.trim() || "").slice(0, 30);

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO ${table} (
        c7_filial, c7_num, c7_item, c7_sequen, c7_itemgrd, c7_produto, c7_descri,
        c7_um, c7_quant, c7_preco, c7_total, c7_fornece, c7_loja, c7_local,
        c7_numsc, c7_itemsc, c7_numcot, c7_emissao, c7_datprf, c7_cond, c7_obs,
        c7_conapro, c7_quje
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
      )`,
      [
        pad(filial, 2),
        pad(number, 6),
        pad(itemCode, 4),
        pad("001", 4),
        pad("", 3),
        pad(productCode, 15),
        pad(description, 50),
        pad(unit, 2),
        quantity,
        unitPrice,
        total,
        pad(supplierCode, 6),
        pad(supplierStore, 2),
        pad(warehouse, 2),
        pad(numSc, 6),
        pad(itemSc, 4),
        pad(numCot, 6),
        pad(emission, 8),
        pad(needDate, 8),
        pad(paymentTerm, 3),
        pad(notes, 30),
        pad("L", 1),
        0,
      ],
    );

    // Fecha a cotação (SC8): grava C8_NUMPED / C8_ITEMPED
    if (numCot) {
      const quotes = sc8Table();
      let quoteSql = `
        UPDATE ${quotes}
        SET c8_numped = $1, c8_itemped = $2
        WHERE d_e_l_e_t_ = ' '
          AND rtrim(c8_num) = $3
          AND rtrim(c8_fornece) = $4
          AND rtrim(c8_loja) = $5
          AND NULLIF(TRIM(c8_numped), '') IS NULL`;
      const quoteParams: Array<string> = [
        pad(number, 6),
        pad(itemCode, 4),
        numCot.padStart(6, "0").slice(-6),
        supplierCode,
        supplierStore,
      ];
      if (itemCot) {
        quoteSql += ` AND rtrim(c8_item) = $${quoteParams.length + 1}`;
        quoteParams.push(itemCot.padStart(4, "0").slice(-4));
      }
      if (proposalCot) {
        quoteSql += ` AND rtrim(c8_numpro) = $${quoteParams.length + 1}`;
        quoteParams.push(proposalCot.padStart(2, "0").slice(-2));
      }
      const updated = await client.query(quoteSql, quoteParams);
      if (!updated.rowCount) {
        throw new Error(
          `Cotação ${numCot}${itemCot ? `/${itemCot}` : ""} já fechada ou não encontrada para este fornecedor`,
        );
      }
    }

    // Atualiza SC1 vinculada com pedido e quantidade em pedido
    if (numSc && itemSc) {
      const requests = sc1Table();
      await client.query(
        `UPDATE ${requests}
         SET c1_pedido = $1,
             c1_itemped = $2,
             c1_quje = COALESCE(c1_quje, 0) + $3,
             c1_cotacao = CASE
               WHEN NULLIF(TRIM(c1_cotacao), '') IS NULL AND $4 <> '' THEN $5
               ELSE c1_cotacao
             END
         WHERE d_e_l_e_t_ = ' '
           AND rtrim(c1_num) = $6
           AND rtrim(c1_item) = $7`,
        [
          pad(number, 6),
          pad(itemCode, 4),
          quantity,
          numCot,
          pad(numCot || "", 6),
          numSc.padStart(6, "0").slice(-6),
          itemSc.padStart(4, "0").slice(-4),
        ],
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

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
      quantityDelivered: 0,
      unit,
      unitPrice,
      total,
      supplierCode,
      supplierStore,
      warehouse,
      purchaseRequestNumber: numSc || null,
      purchaseRequestItem: itemSc || null,
      quoteNumber: numCot || null,
      emission: formatDateOut(emission),
      needDate: formatDateOut(needDate),
      approval: "L",
      closed: false,
      source: "protheus-pg",
    } satisfies ProtheusSc7Line,
  };
}

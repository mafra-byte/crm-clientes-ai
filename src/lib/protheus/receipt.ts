import type { QueryResultRow } from "pg";
import { getProtheusConfig } from "@/lib/protheus/config";
import {
  getProtheusPool,
  isProtheusPgConfigured,
  pad,
  safeTableName,
  trim,
} from "@/lib/protheus/pg-shared";
import { applyReceiptToStock } from "@/lib/protheus/sb2";
import { getTesByCode } from "@/lib/protheus/sf4";

export type CreateReceiptInput = {
  purchaseOrderNumber: string;
  purchaseOrderItem: string;
  quantity?: number;
  unitPrice?: number;
  document?: string;
  series?: string;
  tes?: string;
  notes?: string;
};

export type ProtheusReceiptLine = {
  id: string;
  document: string;
  series: string;
  item: string;
  productCode: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  total: number;
  supplierCode: string;
  supplierStore: string;
  warehouse: string | null;
  purchaseOrderNumber: string | null;
  purchaseOrderItem: string | null;
  tes: string | null;
  cfop: string | null;
  emission: string | null;
  source: string;
};

function sf1Table() {
  return safeTableName(
    process.env.PROTHEUS_SF1_TABLE || "sf1990",
    "PROTHEUS_SF1_TABLE",
  );
}

function sd1Table() {
  return safeTableName(
    process.env.PROTHEUS_SD1_TABLE || "sd1990",
    "PROTHEUS_SD1_TABLE",
  );
}

function sc7Table() {
  return safeTableName(
    process.env.PROTHEUS_SC7_TABLE || "sc7990",
    "PROTHEUS_SC7_TABLE",
  );
}

function toProtheusDate() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateOut(value: unknown) {
  const raw = trim(value);
  if (!raw || raw.length !== 8) return raw || null;
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

async function nextDocument(table: string, filial: string) {
  const db = getProtheusPool();
  const result = await db.query<{ max: string | null }>(
    `SELECT MAX(NULLIF(TRIM(f1_doc), '')) AS max
     FROM ${table}
     WHERE d_e_l_e_t_ = ' '
       AND f1_filial = $1
       AND TRIM(f1_doc) ~ '^[0-9]+$'`,
    [pad(filial, 2)],
  );
  const current = Number.parseInt(result.rows[0]?.max ?? "0", 10);
  const next = Number.isFinite(current) ? current + 1 : 1;
  if (next > 999999999) throw new Error("Limite de documentos de entrada atingido");
  return String(next).padStart(9, "0");
}

export async function fetchReceiptsFromPg(q = "") {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }
  const config = getProtheusConfig();
  const table = sd1Table();
  const db = getProtheusPool();
  const result = await db.query<QueryResultRow>(
    `SELECT d1_doc, d1_serie, d1_item, d1_cod, d1_um, d1_quant, d1_vunit, d1_total,
            d1_fornece, d1_loja, d1_local, d1_pedido, d1_itempc, d1_emissao,
            d1_tes, d1_cf
     FROM ${table}
     WHERE d_e_l_e_t_ = ' '
     ORDER BY d1_doc DESC, d1_item
     LIMIT 500`,
  );

  const needle = q.trim().toLowerCase();
  const lines = result.rows
    .map((row) => {
      const document = trim(row.d1_doc);
      const series = trim(row.d1_serie) || "1";
      const item = trim(row.d1_item);
      const productCode = trim(row.d1_cod);
      return {
        id: `${document}-${series}-${item}`,
        document,
        series,
        item,
        productCode,
        quantity: Number(row.d1_quant ?? 0) || 0,
        unit: trim(row.d1_um) || null,
        unitPrice: Number(row.d1_vunit ?? 0) || 0,
        total: Number(row.d1_total ?? 0) || 0,
        supplierCode: trim(row.d1_fornece),
        supplierStore: trim(row.d1_loja) || "01",
        warehouse: trim(row.d1_local) || null,
        purchaseOrderNumber: trim(row.d1_pedido) || null,
        purchaseOrderItem: trim(row.d1_itempc) || null,
        tes: trim(row.d1_tes) || null,
        cfop: trim(row.d1_cf) || null,
        emission: formatDateOut(row.d1_emissao),
        source: "protheus-pg",
      } satisfies ProtheusReceiptLine;
    })
    .filter((line) => {
      if (!needle) return true;
      const hay = [
        line.document,
        line.productCode,
        line.supplierCode,
        line.purchaseOrderNumber,
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

export async function createReceiptFromPurchaseOrder(input: CreateReceiptInput) {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }

  const pcNumber = input.purchaseOrderNumber.trim().padStart(6, "0").slice(-6);
  const pcItem = input.purchaseOrderItem.trim().padStart(4, "0").slice(-4);
  if (!pcNumber || !pcItem) {
    throw new Error("Informe o pedido de compras e o item");
  }

  const config = getProtheusConfig();
  const filial = (config.filial || "01").slice(0, 2).padStart(2, "0");
  const headerTable = sf1Table();
  const itemTable = sd1Table();
  const orderTable = sc7Table();
  const db = getProtheusPool();

  const order = await db.query<QueryResultRow>(
    `SELECT c7_num, c7_item, c7_produto, c7_descri, c7_um, c7_quant, c7_preco,
            c7_fornece, c7_loja, c7_local, c7_quje
     FROM ${orderTable}
     WHERE d_e_l_e_t_ = ' '
       AND rtrim(c7_num) = $1
       AND rtrim(c7_item) = $2
     LIMIT 1`,
    [pcNumber, pcItem],
  );
  if (!order.rows[0]) {
    throw new Error(`Pedido ${pcNumber}/${pcItem} não encontrado no SC7`);
  }

  const pc = order.rows[0];
  const orderedQty = Number(pc.c7_quant ?? 0) || 0;
  const already = Number(pc.c7_quje ?? 0) || 0;
  const remaining = Math.max(orderedQty - already, 0);
  const quantity =
    input.quantity === undefined
      ? remaining || orderedQty
      : Number(input.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Informe uma quantidade válida para recebimento");
  }
  if (remaining > 0 && quantity > remaining + 0.0001) {
    throw new Error(
      `Quantidade maior que o saldo do pedido (${remaining})`,
    );
  }

  const unitPrice =
    input.unitPrice === undefined
      ? Number(pc.c7_preco ?? 0) || 0
      : Number(input.unitPrice);
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    throw new Error("Informe um preço válido");
  }

  const productCode = trim(pc.c7_produto);
  const unit = trim(pc.c7_um) || "UN";
  const supplierCode = trim(pc.c7_fornece).padStart(6, "0").slice(-6);
  const supplierStore = trim(pc.c7_loja) || "01";
  const warehouse = trim(pc.c7_local) || "01";
  const total = Math.round(quantity * unitPrice * 100) / 100;
  const series = (input.series?.trim() || "1").slice(0, 3);
  const document = (
    input.document?.trim() || (await nextDocument(headerTable, filial))
  )
    .replace(/\D/g, "")
    .padStart(9, "0")
    .slice(-9);
  const emission = toProtheusDate();
  let itemCode = "0001";

  const tesCode = (input.tes?.trim() || "001").padStart(3, "0").slice(-3);
  const tes = await getTesByCode(tesCode);
  if (tes.type !== "E") {
    throw new Error(`TES ${tes.code} não é de entrada`);
  }
  const cfop = (tes.cfop || "1102").slice(0, 5);

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const headerExists = await client.query(
      `SELECT 1 FROM ${headerTable}
       WHERE d_e_l_e_t_ = ' '
         AND f1_filial = $1 AND f1_doc = $2 AND f1_serie = $3
         AND f1_fornece = $4 AND f1_loja = $5 AND f1_formul = $6
       LIMIT 1`,
      [
        pad(filial, 2),
        pad(document, 9),
        pad(series, 3),
        pad(supplierCode, 6),
        pad(supplierStore, 2),
        pad("", 1),
      ],
    );

    if (!headerExists.rowCount) {
      await client.query(
        `INSERT INTO ${headerTable} (
          f1_filial, f1_doc, f1_serie, f1_fornece, f1_loja, f1_formul,
          f1_tipo, f1_emissao, f1_dtdigit, f1_especie, f1_cond, f1_status,
          f1_valmerc, f1_valbrut
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14
        )`,
        [
          pad(filial, 2),
          pad(document, 9),
          pad(series, 3),
          pad(supplierCode, 6),
          pad(supplierStore, 2),
          pad("", 1),
          pad("N", 1),
          pad(emission, 8),
          pad(emission, 8),
          pad("NF", 5),
          pad("001", 3),
          pad("A", 1),
          total,
          total,
        ],
      );
    } else {
      await client.query(
        `UPDATE ${headerTable}
         SET f1_valmerc = COALESCE(f1_valmerc,0) + $1,
             f1_valbrut = COALESCE(f1_valbrut,0) + $1
         WHERE d_e_l_e_t_ = ' '
           AND f1_filial = $2 AND f1_doc = $3 AND f1_serie = $4
           AND f1_fornece = $5 AND f1_loja = $6 AND f1_formul = $7`,
        [
          total,
          pad(filial, 2),
          pad(document, 9),
          pad(series, 3),
          pad(supplierCode, 6),
          pad(supplierStore, 2),
          pad("", 1),
        ],
      );
    }

    const existingItems = await client.query<{ max: string | null }>(
      `SELECT MAX(NULLIF(TRIM(d1_item), '')) AS max
       FROM ${itemTable}
       WHERE d_e_l_e_t_ = ' '
         AND d1_filial = $1 AND d1_doc = $2 AND d1_serie = $3
         AND d1_fornece = $4 AND d1_loja = $5`,
      [
        pad(filial, 2),
        pad(document, 9),
        pad(series, 3),
        pad(supplierCode, 6),
        pad(supplierStore, 2),
      ],
    );
    itemCode = "0001";
    if (existingItems.rows[0]?.max) {
      const current = Number.parseInt(String(existingItems.rows[0].max).trim(), 10);
      if (Number.isFinite(current)) itemCode = String(current + 1).padStart(4, "0");
    }

    await client.query(
      `INSERT INTO ${itemTable} (
        d1_filial, d1_doc, d1_serie, d1_item, d1_formul, d1_itemgrd,
        d1_cod, d1_um, d1_quant, d1_vunit, d1_total, d1_fornece, d1_loja,
        d1_local, d1_pedido, d1_itempc, d1_emissao, d1_dtdigit, d1_tipo,
        d1_tes, d1_cf
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
      )`,
      [
        pad(filial, 2),
        pad(document, 9),
        pad(series, 3),
        pad(itemCode, 4),
        pad("", 1),
        pad("", 3),
        pad(productCode, 15),
        pad(unit, 2),
        quantity,
        unitPrice,
        total,
        pad(supplierCode, 6),
        pad(supplierStore, 2),
        pad(warehouse, 2),
        pad(pcNumber, 6),
        pad(pcItem, 4),
        pad(emission, 8),
        pad(emission, 8),
        pad("N", 1),
        pad(tes.code, 3),
        pad(cfop, 5),
      ],
    );

    await client.query(
      `UPDATE ${orderTable}
       SET c7_quje = COALESCE(c7_quje,0) + $1,
           c7_encer = CASE
             WHEN COALESCE(c7_quje,0) + $1 >= COALESCE(c7_quant,0)
               AND COALESCE(c7_quant,0) > 0
             THEN 'E'
             ELSE c7_encer
           END
       WHERE d_e_l_e_t_ = ' '
         AND rtrim(c7_num) = $2
         AND rtrim(c7_item) = $3`,
      [quantity, pcNumber, pcItem],
    );

    if (tes.updatesStock) {
      await applyReceiptToStock(client, {
        filial,
        productCode,
        warehouse,
        quantity,
        unitPrice,
        description: trim(pc.c7_descri) || productCode,
      });
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
      id: `${document}-${series}-${itemCode}`,
      document,
      series,
      item: itemCode,
      productCode,
      quantity,
      unit,
      unitPrice,
      total,
      supplierCode,
      supplierStore,
      warehouse,
      purchaseOrderNumber: pcNumber,
      purchaseOrderItem: pcItem,
      tes: tes.code,
      cfop,
      emission: formatDateOut(emission),
      source: "protheus-pg",
    } satisfies ProtheusReceiptLine,
  };
}

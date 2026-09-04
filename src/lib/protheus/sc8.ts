import type { QueryResultRow } from "pg";
import { getProtheusConfig } from "@/lib/protheus/config";
import {
  getProtheusPool,
  isProtheusPgConfigured,
  pad,
  safeTableName,
  trim,
} from "@/lib/protheus/pg-shared";

export type CreateSc8Input = {
  productCode: string;
  supplierCode: string;
  supplierStore?: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  description?: string;
  purchaseRequestNumber?: string;
  purchaseRequestItem?: string;
  proposal?: string;
  paymentTerm?: string;
  deliveryDays?: number;
  validUntil?: string;
  notes?: string;
  number?: string;
};

export type UpdateSc8Input = {
  number: string;
  item: string;
  proposal?: string;
  supplierCode?: string;
  supplierStore?: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  deliveryDays?: number;
  validUntil?: string;
  description?: string;
};

export type ProtheusSc8Line = {
  id: string;
  number: string;
  item: string;
  proposal: string;
  productCode: string;
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  total: number;
  supplierCode: string;
  supplierStore: string;
  supplierName: string;
  purchaseRequestNumber: string | null;
  purchaseRequestItem: string | null;
  purchaseOrderNumber: string | null;
  purchaseOrderItem: string | null;
  emission: string | null;
  validUntil: string | null;
  deliveryDays: number;
  closed: boolean;
  source: string;
};

function sc1Table() {
  return safeTableName(
    process.env.PROTHEUS_SC1_TABLE || "sc1990",
    "PROTHEUS_SC1_TABLE",
  );
}

function sc8Table() {
  return safeTableName(
    process.env.PROTHEUS_SC8_TABLE || "sc8990",
    "PROTHEUS_SC8_TABLE",
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

async function nextSc8Number(table: string, filial: string) {
  const db = getProtheusPool();
  const result = await db.query<{ max: string | null }>(
    `SELECT MAX(NULLIF(TRIM(c8_num), '')) AS max
     FROM ${table}
     WHERE d_e_l_e_t_ = ' '
       AND c8_filial = $1
       AND TRIM(c8_num) ~ '^[0-9]+$'`,
    [pad(filial, 2)],
  );
  const current = Number.parseInt(result.rows[0]?.max ?? "0", 10);
  const next = Number.isFinite(current) ? current + 1 : 1;
  if (next > 999999) throw new Error("Limite de números de cotação atingido");
  return String(next).padStart(6, "0");
}

export async function fetchSc8FromPg(q = "") {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }
  const config = getProtheusConfig();
  const table = sc8Table();
  const db = getProtheusPool();
  const result = await db.query<QueryResultRow>(
    `SELECT c8_num, c8_item, c8_numpro, c8_produto, c8_descri, c8_quant, c8_um,
            c8_preco, c8_total, c8_fornece, c8_loja, c8_fornome,
            c8_numsc, c8_itemsc, c8_numped, c8_itemped, c8_emissao, c8_valida, c8_prazo
     FROM ${table}
     WHERE d_e_l_e_t_ = ' '
     ORDER BY c8_num DESC, c8_item, c8_numpro
     LIMIT 500`,
  );

  const needle = q.trim().toLowerCase();
  const lines = result.rows
    .map((row) => {
      const number = trim(row.c8_num);
      const item = trim(row.c8_item);
      const proposal = trim(row.c8_numpro) || "01";
      const productCode = trim(row.c8_produto);
      const supplierCode = trim(row.c8_fornece);
      const purchaseOrderNumber = trim(row.c8_numped) || null;
      return {
        id: `${number}-${item}-${proposal}-${supplierCode}`,
        number,
        item,
        proposal,
        productCode,
        description: trim(row.c8_descri) || productCode,
        quantity: Number(row.c8_quant ?? 0) || 0,
        unit: trim(row.c8_um) || null,
        unitPrice: Number(row.c8_preco ?? 0) || 0,
        total: Number(row.c8_total ?? 0) || 0,
        supplierCode,
        supplierStore: trim(row.c8_loja) || "01",
        supplierName: trim(row.c8_fornome) || supplierCode,
        purchaseRequestNumber: trim(row.c8_numsc) || null,
        purchaseRequestItem: trim(row.c8_itemsc) || null,
        purchaseOrderNumber,
        purchaseOrderItem: trim(row.c8_itemped) || null,
        emission: formatDateOut(row.c8_emissao),
        validUntil: formatDateOut(row.c8_valida),
        deliveryDays: Number(row.c8_prazo ?? 0) || 0,
        closed: Boolean(purchaseOrderNumber),
        source: "protheus-pg",
      } satisfies ProtheusSc8Line;
    })
    .filter((line) => {
      if (!needle) return true;
      const hay = [
        line.number,
        line.item,
        line.productCode,
        line.description,
        line.supplierCode,
        line.supplierName,
        line.purchaseRequestNumber,
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

export async function createSc8InPg(input: CreateSc8Input) {
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
  const table = sc8Table();
  const products = sb1Table();
  const suppliers = sa2Table();
  const db = getProtheusPool();

  const product = await db.query<QueryResultRow>(
    `SELECT b1_cod, b1_desc, b1_um
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
  const supplier = await db.query<QueryResultRow>(
    `SELECT a2_cod, a2_loja, a2_nome
     FROM ${suppliers}
     WHERE d_e_l_e_t_ = ' '
       AND rtrim(a2_cod) = $1
       AND rtrim(a2_loja) = $2
     LIMIT 1`,
    [supplierCode, supplierStore],
  );
  if (!supplier.rows[0]) {
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
  const supplierName = trim(supplier.rows[0].a2_nome).slice(0, 50);
  const total = Math.round(quantity * unitPrice * 100) / 100;
  const number = (
    input.number?.trim() || (await nextSc8Number(table, filial))
  )
    .replace(/\D/g, "")
    .padStart(6, "0")
    .slice(-6);
  const proposal = (input.proposal?.trim() || "01").padStart(2, "0").slice(-2);
  const emission = toProtheusDate();
  const validUntil = toProtheusDate(input.validUntil, input.validUntil ? 0 : 15);
  const deliveryDays =
    typeof input.deliveryDays === "number" && Number.isFinite(input.deliveryDays)
      ? input.deliveryDays
      : 7;
  const paymentTerm = (input.paymentTerm?.trim() || "001").slice(0, 3);
  const numSc = (input.purchaseRequestNumber?.trim() || "").replace(/\D/g, "").slice(-6);
  const itemSc = (input.purchaseRequestItem?.trim() || "").replace(/\D/g, "").slice(-4);
  const notes = (input.notes?.trim() || "").slice(0, 200);

  const existingItems = await db.query<{ max: string | null }>(
    `SELECT MAX(NULLIF(TRIM(c8_item), '')) AS max
     FROM ${table}
     WHERE d_e_l_e_t_ = ' ' AND c8_filial = $1 AND c8_num = $2`,
    [pad(filial, 2), pad(number, 6)],
  );
  let itemCode = "0001";
  if (existingItems.rows[0]?.max) {
    const current = Number.parseInt(String(existingItems.rows[0].max).trim(), 10);
    if (Number.isFinite(current)) itemCode = String(current + 1).padStart(4, "0");
  }

  // if same item+supplier+proposal already exists for this quote number, block
  const dup = await db.query(
    `SELECT 1 FROM ${table}
     WHERE d_e_l_e_t_ = ' '
       AND c8_filial = $1 AND c8_num = $2 AND c8_item = $3
       AND c8_numpro = $4 AND c8_fornece = $5 AND c8_loja = $6
     LIMIT 1`,
    [
      pad(filial, 2),
      pad(number, 6),
      pad(itemCode, 4),
      pad(proposal, 2),
      pad(supplierCode, 6),
      pad(supplierStore, 2),
    ],
  );
  if (dup.rowCount && dup.rowCount > 0) {
    throw new Error("Já existe esta proposta de fornecedor neste item da cotação");
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO ${table} (
        c8_filial, c8_num, c8_item, c8_itemgrd, c8_numpro, c8_produto, c8_descri,
        c8_um, c8_quant, c8_preco, c8_total, c8_fornece, c8_loja, c8_fornome,
        c8_numsc, c8_itemsc, c8_emissao, c8_valida, c8_cond, c8_prazo, c8_obs
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21
      )`,
      [
        pad(filial, 2),
        pad(number, 6),
        pad(itemCode, 4),
        pad("", 3),
        pad(proposal, 2),
        pad(productCode, 15),
        pad(description, 50),
        pad(unit, 2),
        quantity,
        unitPrice,
        total,
        pad(supplierCode, 6),
        pad(supplierStore, 2),
        pad(supplierName, 50),
        pad(numSc, 6),
        pad(itemSc, 4),
        pad(emission, 8),
        pad(validUntil, 8),
        pad(paymentTerm, 3),
        deliveryDays,
        notes,
      ],
    );

    // Fecha a solicitação (SC1) vinculada: grava C1_COTACAO
    if (numSc && itemSc) {
      const sc1 = sc1Table();
      const openSc = await client.query<QueryResultRow>(
        `SELECT c1_cotacao, c1_pedido
         FROM ${sc1}
         WHERE d_e_l_e_t_ = ' '
           AND rtrim(c1_num) = $1
           AND rtrim(c1_item) = $2
         LIMIT 1`,
        [numSc.padStart(6, "0").slice(-6), itemSc.padStart(4, "0").slice(-4)],
      );
      if (!openSc.rows[0]) {
        throw new Error(`Solicitação ${numSc}/${itemSc} não encontrada`);
      }
      const existingQuote = trim(openSc.rows[0].c1_cotacao);
      const existingPo = trim(openSc.rows[0].c1_pedido);
      if (existingPo) {
        throw new Error(
          `Solicitação ${numSc}/${itemSc} já gerou pedido ${existingPo}`,
        );
      }
      if (existingQuote && existingQuote !== number) {
        throw new Error(
          `Solicitação ${numSc}/${itemSc} já está em cotação ${existingQuote}`,
        );
      }
      await client.query(
        `UPDATE ${sc1}
         SET c1_cotacao = $1
         WHERE d_e_l_e_t_ = ' '
           AND rtrim(c1_num) = $2
           AND rtrim(c1_item) = $3`,
        [
          pad(number, 6),
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
      id: `${number}-${itemCode}-${proposal}-${supplierCode}`,
      number,
      item: itemCode,
      proposal,
      productCode,
      description,
      quantity,
      unit,
      unitPrice,
      total,
      supplierCode,
      supplierStore,
      supplierName,
      purchaseRequestNumber: numSc || null,
      purchaseRequestItem: itemSc || null,
      purchaseOrderNumber: null,
      purchaseOrderItem: null,
      emission: formatDateOut(emission),
      validUntil: formatDateOut(validUntil),
      deliveryDays,
      closed: false,
      source: "protheus-pg",
    } satisfies ProtheusSc8Line,
  };
}

export async function updateSc8InPg(input: UpdateSc8Input) {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }

  const number = input.number.trim().replace(/\D/g, "").padStart(6, "0").slice(-6);
  const item = input.item.trim().replace(/\D/g, "").padStart(4, "0").slice(-4);
  if (!number) throw new Error("Informe o número da cotação");
  if (!item) throw new Error("Informe o item da cotação");

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
  const table = sc8Table();
  const db = getProtheusPool();
  const proposal = (input.proposal?.trim() || "01").padStart(2, "0").slice(-2);
  const supplierCode = input.supplierCode
    ? input.supplierCode.trim().padStart(6, "0").slice(-6)
    : "";
  const supplierStore = (input.supplierStore?.trim() || "01")
    .slice(0, 2)
    .padStart(2, "0");

  let sql = `
    SELECT c8_num, c8_item, c8_numpro, c8_produto, c8_descri, c8_um,
           c8_preco, c8_fornece, c8_loja, c8_fornome, c8_numsc, c8_itemsc,
           c8_numped, c8_itemped, c8_emissao, c8_valida, c8_prazo, c8_obs
    FROM ${table}
    WHERE d_e_l_e_t_ = ' '
      AND c8_filial = $1
      AND c8_num = $2
      AND c8_item = $3
      AND c8_numpro = $4`;
  const params: Array<string> = [
    pad(filial, 2),
    pad(number, 6),
    pad(item, 4),
    pad(proposal, 2),
  ];
  if (supplierCode) {
    sql += ` AND c8_fornece = $${params.length + 1} AND c8_loja = $${params.length + 2}`;
    params.push(pad(supplierCode, 6), pad(supplierStore, 2));
  }
  sql += " LIMIT 1";

  const current = await db.query<QueryResultRow>(sql, params);
  const row = current.rows[0];
  if (!row) {
    throw new Error(
      `Cotação ${number}/${item}/${proposal}${supplierCode ? `/${supplierCode}` : ""} não encontrada`,
    );
  }

  const purchaseOrderNumber = trim(row.c8_numped);
  if (purchaseOrderNumber) {
    throw new Error(
      `Cotação ${number}/${item} não pode ser editada (já gerou pedido ${purchaseOrderNumber})`,
    );
  }

  const productCode = trim(row.c8_produto);
  const resolvedSupplierCode = trim(row.c8_fornece);
  const resolvedSupplierStore = trim(row.c8_loja) || "01";
  const supplierName = trim(row.c8_fornome) || resolvedSupplierCode;
  const description = (
    input.description?.trim() ||
    trim(row.c8_descri) ||
    productCode
  ).slice(0, 50);
  const unit = trim(row.c8_um) || "UN";
  const total = Math.round(quantity * unitPrice * 100) / 100;
  const validUntil = input.validUntil
    ? toProtheusDate(input.validUntil)
    : trim(row.c8_valida) || toProtheusDate(undefined, 15);
  const deliveryDays =
    typeof input.deliveryDays === "number" && Number.isFinite(input.deliveryDays)
      ? input.deliveryDays
      : Number(row.c8_prazo ?? 0) || 0;
  const notes =
    input.notes !== undefined
      ? (input.notes.trim() || "").slice(0, 200)
      : String(row.c8_obs ?? "").slice(0, 200);
  const emission = trim(row.c8_emissao);

  await db.query(
    `UPDATE ${table}
     SET c8_descri = $1,
         c8_quant = $2,
         c8_preco = $3,
         c8_total = $4,
         c8_valida = $5,
         c8_prazo = $6,
         c8_obs = $7
     WHERE d_e_l_e_t_ = ' '
       AND c8_filial = $8
       AND c8_num = $9
       AND c8_item = $10
       AND c8_numpro = $11
       AND c8_fornece = $12
       AND c8_loja = $13`,
    [
      pad(description, 50),
      quantity,
      unitPrice,
      total,
      pad(validUntil, 8),
      deliveryDays,
      notes,
      pad(filial, 2),
      pad(number, 6),
      pad(item, 4),
      pad(proposal, 2),
      pad(resolvedSupplierCode, 6),
      pad(resolvedSupplierStore, 2),
    ],
  );

  return {
    empresa: config.empresa,
    filial,
    line: {
      id: `${number}-${item}-${proposal}-${resolvedSupplierCode}`,
      number,
      item,
      proposal,
      productCode,
      description,
      quantity,
      unit,
      unitPrice,
      total,
      supplierCode: resolvedSupplierCode,
      supplierStore: resolvedSupplierStore,
      supplierName,
      purchaseRequestNumber: trim(row.c8_numsc) || null,
      purchaseRequestItem: trim(row.c8_itemsc) || null,
      purchaseOrderNumber: null,
      purchaseOrderItem: trim(row.c8_itemped) || null,
      emission: formatDateOut(emission),
      validUntil: formatDateOut(validUntil),
      deliveryDays,
      closed: false,
      source: "protheus-pg",
    } satisfies ProtheusSc8Line,
  };
}

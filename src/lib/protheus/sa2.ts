import type { Pool, QueryResultRow } from "pg";
import { getProtheusConfig } from "@/lib/protheus/config";
import {
  digitsOnly,
  getProtheusPool,
  isProtheusPgConfigured,
  pad,
  safeTableName,
  trim,
} from "@/lib/protheus/pg-shared";

export type CreateSa2Input = {
  name: string;
  tradeName?: string;
  document?: string;
  email?: string;
  phone?: string;
  address?: string;
  district?: string;
  city?: string;
  state?: string;
  zip?: string;
  store?: string;
  supplierType?: string;
  code?: string;
};

export type ProtheusSa2Supplier = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  store: string | null;
  source: string;
  protheusCode: string | null;
  tradeName?: string | null;
  address?: string | null;
  district?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  supplierType?: string | null;
};

function sa2Table() {
  return safeTableName(process.env.PROTHEUS_SA2_TABLE || "sa2990", "PROTHEUS_SA2_TABLE");
}

async function nextSa2Code(db: Pool, table: string) {
  const result = await db.query<{ max: string | null }>(
    `SELECT MAX(NULLIF(TRIM(a2_cod), '')) AS max
     FROM ${table}
     WHERE d_e_l_e_t_ = ' ' AND TRIM(a2_cod) ~ '^[0-9]+$'`,
  );
  const current = Number.parseInt(result.rows[0]?.max ?? "0", 10);
  const next = Number.isFinite(current) ? current + 1 : 1;
  if (next > 999999) throw new Error("Limite de códigos SA2 atingido");
  return String(next).padStart(6, "0");
}

export async function fetchSa2SuppliersFromPg(q = "") {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }
  const config = getProtheusConfig();
  const table = sa2Table();
  const db = getProtheusPool();
  const result = await db.query<QueryResultRow>(
    `SELECT a2_cod, a2_loja, a2_nome, a2_nreduz, a2_email, a2_tel, a2_cgc,
            a2_end, a2_bairro, a2_mun, a2_est, a2_cep, a2_tipo
     FROM ${table}
     WHERE d_e_l_e_t_ = ' '
     ORDER BY a2_cod
     LIMIT 500`,
  );

  const needle = q.trim().toLowerCase();
  const suppliers = result.rows
    .map((row) => {
      const code = trim(row.a2_cod);
      const store = trim(row.a2_loja) || null;
      const name = trim(row.a2_nome) || trim(row.a2_nreduz) || code;
      return {
        id: `${code}-${store ?? "01"}`,
        name,
        email: trim(row.a2_email) || null,
        phone: trim(row.a2_tel) || null,
        document: trim(row.a2_cgc) || null,
        store,
        source: "protheus-pg",
        protheusCode: code || null,
        tradeName: trim(row.a2_nreduz) || null,
        address: trim(row.a2_end) || null,
        district: trim(row.a2_bairro) || null,
        city: trim(row.a2_mun) || null,
        state: trim(row.a2_est) || null,
        zip: trim(row.a2_cep) || null,
        supplierType: trim(row.a2_tipo) || null,
      } satisfies ProtheusSa2Supplier;
    })
    .filter((item) => {
      if (!needle) return true;
      const hay = [
        item.name,
        item.email,
        item.phone,
        item.document,
        item.protheusCode,
        item.store,
        item.tradeName,
        item.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });

  return {
    empresa: config.empresa,
    filial: config.filial,
    suppliers,
  };
}

export async function createSa2SupplierInPg(input: CreateSa2Input) {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }

  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome do fornecedor");

  const table = sa2Table();
  const db = getProtheusPool();
  const store = (input.store?.trim() || "01").slice(0, 2).padStart(2, "0");
  const code = (input.code?.trim() || (await nextSa2Code(db, table)))
    .replace(/\D/g, "")
    .padStart(6, "0")
    .slice(-6);
  const document = digitsOnly(input.document ?? "").slice(0, 14);
  const tradeName = (input.tradeName?.trim() || name).slice(0, 20);
  const email = (input.email?.trim() || "").slice(0, 30);
  const phone = digitsOnly(input.phone ?? "").slice(0, 50);
  const address = (input.address?.trim() || "").slice(0, 40);
  const district = (input.district?.trim() || "").slice(0, 20);
  const city = (input.city?.trim() || "").slice(0, 60);
  const state = (input.state?.trim() || "").toUpperCase().slice(0, 2);
  const zip = digitsOnly(input.zip ?? "").slice(0, 8);
  const supplierType = (input.supplierType?.trim() || "J").slice(0, 1).toUpperCase();

  const existing = await db.query(
    `SELECT 1 FROM ${table}
     WHERE d_e_l_e_t_ = ' ' AND a2_filial = $1 AND a2_cod = $2 AND a2_loja = $3
     LIMIT 1`,
    [pad("", 2), pad(code, 6), pad(store, 2)],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw new Error(`Já existe fornecedor ${code}/${store} no Protheus`);
  }

  if (document) {
    const dupDoc = await db.query(
      `SELECT rtrim(a2_cod) AS code FROM ${table}
       WHERE d_e_l_e_t_ = ' ' AND rtrim(a2_cgc) = $1
       LIMIT 1`,
      [document],
    );
    if (dupDoc.rows[0]?.code) {
      throw new Error(
        `CNPJ/CPF já cadastrado no fornecedor ${String(dupDoc.rows[0].code).trim()}`,
      );
    }
  }

  await db.query(
    `INSERT INTO ${table} (
      a2_filial, a2_cod, a2_loja, a2_nome, a2_nreduz, a2_tipo,
      a2_end, a2_bairro, a2_est, a2_mun, a2_cep, a2_tel, a2_cgc, a2_email,
      a2_msblql, a2_codpais
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16
    )`,
    [
      pad("", 2),
      pad(code, 6),
      pad(store, 2),
      pad(name, 50),
      pad(tradeName, 20),
      pad(supplierType, 1),
      pad(address, 40),
      pad(district, 20),
      pad(state, 2),
      pad(city, 60),
      pad(zip, 8),
      pad(phone, 50),
      pad(document, 14),
      pad(email, 30),
      pad("2", 1),
      pad("105", 5),
    ],
  );

  const config = getProtheusConfig();
  return {
    empresa: config.empresa,
    filial: config.filial,
    supplier: {
      id: `${code}-${store}`,
      name,
      email: email || null,
      phone: phone || null,
      document: document || null,
      store,
      source: "protheus-pg",
      protheusCode: code,
      tradeName,
      address: address || null,
      district: district || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      supplierType,
    } satisfies ProtheusSa2Supplier,
  };
}

export async function updateSa2SupplierInPg(
  input: CreateSa2Input & { code: string },
) {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }

  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome do fornecedor");

  const rawCode = input.code?.trim();
  if (!rawCode) throw new Error("Informe o código do fornecedor");

  const table = sa2Table();
  const db = getProtheusPool();
  const store = (input.store?.trim() || "01").slice(0, 2).padStart(2, "0");
  const code = rawCode.replace(/\D/g, "").padStart(6, "0").slice(-6);
  const document = digitsOnly(input.document ?? "").slice(0, 14);
  const tradeName = (input.tradeName?.trim() || name).slice(0, 20);
  const email = (input.email?.trim() || "").slice(0, 30);
  const phone = digitsOnly(input.phone ?? "").slice(0, 50);
  const address = (input.address?.trim() || "").slice(0, 40);
  const district = (input.district?.trim() || "").slice(0, 20);
  const city = (input.city?.trim() || "").slice(0, 60);
  const state = (input.state?.trim() || "").toUpperCase().slice(0, 2);
  const zip = digitsOnly(input.zip ?? "").slice(0, 8);
  const supplierType = (input.supplierType?.trim() || "J").slice(0, 1).toUpperCase();

  const existing = await db.query(
    `SELECT 1 FROM ${table}
     WHERE d_e_l_e_t_ = ' ' AND a2_filial = $1 AND a2_cod = $2 AND a2_loja = $3
     LIMIT 1`,
    [pad("", 2), pad(code, 6), pad(store, 2)],
  );
  if (!existing.rowCount) {
    throw new Error(`Fornecedor ${code}/${store} não encontrado no Protheus`);
  }

  if (document) {
    const dupDoc = await db.query(
      `SELECT rtrim(a2_cod) AS code FROM ${table}
       WHERE d_e_l_e_t_ = ' '
         AND rtrim(a2_cgc) = $1
         AND NOT (a2_cod = $2 AND a2_loja = $3)
       LIMIT 1`,
      [document, pad(code, 6), pad(store, 2)],
    );
    if (dupDoc.rows[0]?.code) {
      throw new Error(
        `CNPJ/CPF já cadastrado no fornecedor ${String(dupDoc.rows[0].code).trim()}`,
      );
    }
  }

  await db.query(
    `UPDATE ${table}
     SET a2_nome = $1,
         a2_nreduz = $2,
         a2_tipo = $3,
         a2_end = $4,
         a2_bairro = $5,
         a2_est = $6,
         a2_mun = $7,
         a2_cep = $8,
         a2_tel = $9,
         a2_cgc = $10,
         a2_email = $11
     WHERE d_e_l_e_t_ = ' '
       AND a2_filial = $12
       AND a2_cod = $13
       AND a2_loja = $14`,
    [
      pad(name, 50),
      pad(tradeName, 20),
      pad(supplierType, 1),
      pad(address, 40),
      pad(district, 20),
      pad(state, 2),
      pad(city, 60),
      pad(zip, 8),
      pad(phone, 50),
      pad(document, 14),
      pad(email, 30),
      pad("", 2),
      pad(code, 6),
      pad(store, 2),
    ],
  );

  const config = getProtheusConfig();
  return {
    empresa: config.empresa,
    filial: config.filial,
    supplier: {
      id: `${code}-${store}`,
      name,
      email: email || null,
      phone: phone || null,
      document: document || null,
      store,
      source: "protheus-pg",
      protheusCode: code,
      tradeName,
      address: address || null,
      district: district || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      supplierType,
    } satisfies ProtheusSa2Supplier,
  };
}

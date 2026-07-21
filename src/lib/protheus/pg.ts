import type { QueryResultRow } from "pg";
import { getProtheusConfig } from "@/lib/protheus/config";
import {
  digitsOnly,
  getProtheusPool,
  isProtheusPgConfigured,
  pad,
  safeTableName,
  trim,
} from "@/lib/protheus/pg-shared";

export { isProtheusPgConfigured } from "@/lib/protheus/pg-shared";

export type CreateSa1Input = {
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
  personType?: "F" | "J";
  customerType?: string;
  code?: string;
};

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

function sa1Table() {
  return safeTableName(
    process.env.PROTHEUS_SA1_TABLE || "sa1990",
    "PROTHEUS_SA1_TABLE",
  );
}

async function nextSa1Code(table: string) {
  const db = getProtheusPool();
  const result = await db.query<{ max: string | null }>(
    `SELECT MAX(NULLIF(TRIM(a1_cod), '')) AS max
     FROM ${table}
     WHERE d_e_l_e_t_ = ' ' AND TRIM(a1_cod) ~ '^[0-9]+$'`,
  );
  const current = Number.parseInt(result.rows[0]?.max ?? "0", 10);
  const next = Number.isFinite(current) ? current + 1 : 1;
  if (next > 999999) {
    throw new Error("Limite de códigos SA1 atingido");
  }
  return String(next).padStart(6, "0");
}

export async function createSa1ClientInPg(input: CreateSa1Input) {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }

  const name = input.name.trim();
  if (!name) throw new Error("Informe o nome do cliente");

  const table = sa1Table();
  const db = getProtheusPool();
  const store = (input.store?.trim() || "01").slice(0, 2).padStart(2, "0");
  const code = (input.code?.trim() || (await nextSa1Code(table)))
    .replace(/\D/g, "")
    .padStart(6, "0")
    .slice(-6);
  const document = digitsOnly(input.document ?? "").slice(0, 14);
  const personType =
    input.personType || (document.length === 11 ? "F" : "J");
  const tradeName = (input.tradeName?.trim() || name).slice(0, 20);
  const email = (input.email?.trim() || "").slice(0, 30);
  const phone = digitsOnly(input.phone ?? "").slice(0, 15);
  const address = (input.address?.trim() || "").slice(0, 80);
  const district = (input.district?.trim() || "").slice(0, 40);
  const city = (input.city?.trim() || "").slice(0, 60);
  const state = (input.state?.trim() || "").toUpperCase().slice(0, 2);
  const zip = digitsOnly(input.zip ?? "").slice(0, 8);
  const customerType = (input.customerType?.trim() || "F")
    .slice(0, 1)
    .toUpperCase();

  const existing = await db.query(
    `SELECT 1 FROM ${table}
     WHERE d_e_l_e_t_ = ' ' AND a1_filial = $1 AND a1_cod = $2 AND a1_loja = $3
     LIMIT 1`,
    [pad("", 2), pad(code, 6), pad(store, 2)],
  );
  if (existing.rowCount && existing.rowCount > 0) {
    throw new Error(`Já existe cliente ${code}/${store} no Protheus`);
  }

  if (document) {
    const dupDoc = await db.query(
      `SELECT rtrim(a1_cod) AS code FROM ${table}
       WHERE d_e_l_e_t_ = ' ' AND rtrim(a1_cgc) = $1
       LIMIT 1`,
      [document],
    );
    if (dupDoc.rows[0]?.code) {
      throw new Error(
        `CNPJ/CPF já cadastrado no cliente ${String(dupDoc.rows[0].code).trim()}`,
      );
    }
  }

  await db.query(
    `INSERT INTO ${table} (
      a1_filial, a1_cod, a1_loja, a1_nome, a1_nreduz, a1_pessoa, a1_tipo,
      a1_end, a1_bairro, a1_est, a1_mun, a1_cep, a1_tel, a1_cgc, a1_email,
      a1_msblql, a1_codpais
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
    )`,
    [
      pad("", 2),
      pad(code, 6),
      pad(store, 2),
      pad(name, 50),
      pad(tradeName, 20),
      pad(personType, 1),
      pad(customerType, 1),
      pad(address, 80),
      pad(district, 40),
      pad(state, 2),
      pad(city, 60),
      pad(zip, 8),
      pad(phone, 15),
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
    client: {
      id: `${code}-${store}`,
      name,
      email: email || null,
      phone: phone || null,
      document: document || null,
      store,
      source: "protheus-live",
      totalOrders: 0,
      totalSpent: 0,
      lastOrderAt: null as string | null,
      protheusCode: code,
    } satisfies ProtheusSa1Client,
  };
}

export async function fetchSa1ClientsFromPg(q = ""): Promise<{
  empresa: string;
  filial: string;
  clients: ProtheusSa1Client[];
}> {
  const config = getProtheusConfig();
  const table = sa1Table();
  const db = getProtheusPool();

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

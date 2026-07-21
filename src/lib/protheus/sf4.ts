import type { QueryResultRow } from "pg";
import { getProtheusConfig } from "@/lib/protheus/config";
import {
  getProtheusPool,
  isProtheusPgConfigured,
  pad,
  safeTableName,
  trim,
} from "@/lib/protheus/pg-shared";

export type CreateTesInput = {
  code?: string;
  type: "E" | "S";
  text: string;
  cfop: string;
  updatesStock?: boolean;
  generatesDuplicate?: boolean;
  calculatesIcms?: boolean;
  creditIcms?: boolean;
  purpose?: string;
};

export type ProtheusTes = {
  id: string;
  code: string;
  type: string;
  text: string;
  cfop: string;
  updatesStock: boolean;
  generatesDuplicate: boolean;
  calculatesIcms: boolean;
  creditIcms: boolean;
  blocked: boolean;
  purpose: string | null;
  source: string;
};

function sf4Table() {
  return safeTableName(
    process.env.PROTHEUS_SF4_TABLE || "sf4990",
    "PROTHEUS_SF4_TABLE",
  );
}

function yn(value: unknown, yes = "S") {
  return trim(value).toUpperCase() === yes;
}

export async function fetchTesFromPg(q = "", onlyEntry = false) {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }
  const config = getProtheusConfig();
  const table = sf4Table();
  const db = getProtheusPool();
  const result = await db.query<QueryResultRow>(
    `SELECT f4_codigo, f4_tipo, f4_texto, f4_cf, f4_estoque, f4_duplic,
            f4_icm, f4_credicm, f4_msblql, f4_finalid
     FROM ${table}
     WHERE d_e_l_e_t_ = ' '
     ORDER BY f4_codigo
     LIMIT 500`,
  );

  const needle = q.trim().toLowerCase();
  const lines = result.rows
    .map((row) => {
      const code = trim(row.f4_codigo);
      const type = trim(row.f4_tipo).toUpperCase() || "E";
      const blocked = trim(row.f4_msblql) === "1";
      return {
        id: code,
        code,
        type,
        text: trim(row.f4_texto) || code,
        cfop: trim(row.f4_cf),
        updatesStock: yn(row.f4_estoque),
        generatesDuplicate: yn(row.f4_duplic),
        calculatesIcms: yn(row.f4_icm),
        creditIcms: yn(row.f4_credicm),
        blocked,
        purpose: trim(row.f4_finalid) || null,
        source: "protheus-pg",
      } satisfies ProtheusTes;
    })
    .filter((line) => {
      if (onlyEntry && line.type !== "E") return false;
      if (line.blocked) return false;
      if (!needle) return true;
      const hay = [line.code, line.text, line.cfop, line.purpose]
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

export async function getTesByCode(code: string) {
  const normalized = code.trim().padStart(3, "0").slice(-3);
  const payload = await fetchTesFromPg();
  const tes = payload.lines.find((line) => line.code === normalized);
  if (!tes) {
    throw new Error(`TES ${normalized} não encontrada no SF4`);
  }
  if (tes.blocked) {
    throw new Error(`TES ${normalized} está bloqueada`);
  }
  return tes;
}

/**
 * Resolve TES de entrada com integração SF4:
 * override → C7_TES → B1_TE → padrão 001
 */
export async function resolveEntryTes(options: {
  override?: string | null;
  orderTes?: string | null;
  productTes?: string | null;
  fallback?: string;
}) {
  const candidates = [
    options.override,
    options.orderTes,
    options.productTes,
    options.fallback || "001",
  ];
  let lastError: Error | null = null;
  for (const raw of candidates) {
    const code = (raw || "").trim();
    if (!code) continue;
    try {
      const tes = await getTesByCode(code);
      if (tes.type !== "E") {
        lastError = new Error(`TES ${tes.code} não é de entrada`);
        continue;
      }
      return tes;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError || new Error("Nenhuma TES de entrada válida no SF4");
}

export async function createTesInPg(input: CreateTesInput) {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }

  const type = input.type === "S" ? "S" : "E";
  const text = input.text.trim().slice(0, 20);
  const cfop = input.cfop.replace(/\D/g, "").slice(0, 5);
  if (!text) throw new Error("Informe o texto da TES");
  if (cfop.length < 4) throw new Error("Informe um CFOP válido");

  const config = getProtheusConfig();
  const filial = (config.filial || "01").slice(0, 2).padStart(2, "0");
  const table = sf4Table();
  const db = getProtheusPool();

  let code = (input.code?.trim() || "").replace(/\D/g, "").slice(-3);
  if (!code) {
    const max = await db.query<{ max: string | null }>(
      `SELECT MAX(NULLIF(TRIM(f4_codigo), '')) AS max
       FROM ${table}
       WHERE d_e_l_e_t_ = ' '
         AND f4_filial = $1
         AND TRIM(f4_codigo) ~ '^[0-9]+$'`,
      [pad(filial, 2)],
    );
    const current = Number.parseInt(max.rows[0]?.max ?? "0", 10);
    const next = Number.isFinite(current) ? current + 1 : 1;
    if (next > 999) throw new Error("Limite de códigos TES atingido");
    code = String(next).padStart(3, "0");
  } else {
    code = code.padStart(3, "0");
  }

  const dup = await db.query(
    `SELECT 1 FROM ${table}
     WHERE d_e_l_e_t_ = ' '
       AND f4_filial = $1 AND rtrim(f4_codigo) = $2
     LIMIT 1`,
    [pad(filial, 2), code],
  );
  if (dup.rowCount) {
    throw new Error(`Já existe TES ${code}`);
  }

  const updatesStock = input.updatesStock !== false && type === "E";
  const generatesDuplicate = input.generatesDuplicate !== false;
  const calculatesIcms = input.calculatesIcms !== false;
  const creditIcms = input.creditIcms !== false && type === "E";
  const purpose = (input.purpose?.trim() || text).slice(0, 254);

  await db.query(
    `INSERT INTO ${table} (
      f4_filial, f4_codigo, f4_tipo, f4_texto, f4_cf, f4_estoque, f4_duplic,
      f4_icm, f4_ipi, f4_credicm, f4_credipi, f4_msblql, f4_lficm, f4_lfipi,
      f4_poder3, f4_atuatf, f4_finalid
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17
    )`,
    [
      pad(filial, 2),
      pad(code, 3),
      pad(type, 1),
      pad(text, 20),
      pad(cfop, 5),
      pad(updatesStock ? "S" : "N", 1),
      pad(generatesDuplicate ? "S" : "N", 1),
      pad(calculatesIcms ? "S" : "N", 1),
      pad("N", 1),
      pad(creditIcms ? "S" : "N", 1),
      pad("N", 1),
      pad("2", 1),
      pad(calculatesIcms ? "S" : "N", 1),
      pad("N", 1),
      pad("N", 1),
      pad("N", 1),
      pad(purpose, 254),
    ],
  );

  return {
    empresa: config.empresa,
    filial,
    line: {
      id: code,
      code,
      type,
      text,
      cfop,
      updatesStock,
      generatesDuplicate,
      calculatesIcms,
      creditIcms,
      blocked: false,
      purpose,
      source: "protheus-pg",
    } satisfies ProtheusTes,
  };
}

export async function updateTesInPg(input: CreateTesInput & { code: string }) {
  if (!isProtheusPgConfigured()) {
    throw new Error("PostgreSQL do Protheus não configurado (PROTHEUS_PG_*)");
  }

  const rawCode = input.code?.trim();
  if (!rawCode) throw new Error("Informe o código da TES");

  const type = input.type === "S" ? "S" : "E";
  const text = input.text.trim().slice(0, 20);
  const cfop = input.cfop.replace(/\D/g, "").slice(0, 5);
  if (!text) throw new Error("Informe o texto da TES");
  if (cfop.length < 4) throw new Error("Informe um CFOP válido");

  const config = getProtheusConfig();
  const filial = (config.filial || "01").slice(0, 2).padStart(2, "0");
  const table = sf4Table();
  const db = getProtheusPool();
  const code = rawCode.replace(/\D/g, "").slice(-3).padStart(3, "0");

  const existing = await db.query(
    `SELECT 1 FROM ${table}
     WHERE d_e_l_e_t_ = ' '
       AND f4_filial = $1 AND rtrim(f4_codigo) = $2
     LIMIT 1`,
    [pad(filial, 2), code],
  );
  if (!existing.rowCount) {
    throw new Error(`TES ${code} não encontrada`);
  }

  const updatesStock = input.updatesStock !== false && type === "E";
  const generatesDuplicate = input.generatesDuplicate !== false;
  const calculatesIcms = input.calculatesIcms !== false;
  const creditIcms = input.creditIcms !== false && type === "E";
  const purpose = (input.purpose?.trim() || text).slice(0, 254);

  await db.query(
    `UPDATE ${table}
     SET f4_tipo = $1,
         f4_texto = $2,
         f4_cf = $3,
         f4_estoque = $4,
         f4_duplic = $5,
         f4_icm = $6,
         f4_credicm = $7,
         f4_lficm = $8,
         f4_finalid = $9
     WHERE d_e_l_e_t_ = ' '
       AND f4_filial = $10
       AND rtrim(f4_codigo) = $11`,
    [
      pad(type, 1),
      pad(text, 20),
      pad(cfop, 5),
      pad(updatesStock ? "S" : "N", 1),
      pad(generatesDuplicate ? "S" : "N", 1),
      pad(calculatesIcms ? "S" : "N", 1),
      pad(creditIcms ? "S" : "N", 1),
      pad(calculatesIcms ? "S" : "N", 1),
      pad(purpose, 254),
      pad(filial, 2),
      code,
    ],
  );

  return {
    empresa: config.empresa,
    filial,
    line: {
      id: code,
      code,
      type,
      text,
      cfop,
      updatesStock,
      generatesDuplicate,
      calculatesIcms,
      creditIcms,
      blocked: false,
      purpose,
      source: "protheus-pg",
    } satisfies ProtheusTes,
  };
}

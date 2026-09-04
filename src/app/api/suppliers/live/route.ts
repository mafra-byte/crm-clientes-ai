import { NextRequest, NextResponse } from "next/server";
import { isProtheusPgConfigured } from "@/lib/protheus/pg-shared";
import {
  createSa2SupplierInPg,
  fetchSa2SuppliersFromPg,
  updateSa2SupplierInPg,
} from "@/lib/protheus/sa2";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!isProtheusPgConfigured()) {
    return NextResponse.json(
      {
        error: "Configure PROTHEUS_PG_* para ler fornecedores SA2.",
        suppliers: [],
      },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchSa2SuppliersFromPg(q);
    return NextResponse.json({ ...payload, source: "protheus-pg" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao listar fornecedores SA2",
        suppliers: [],
      },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isProtheusPgConfigured()) {
    return NextResponse.json(
      {
        error:
          "Gravação no Protheus exige PROTHEUS_PG_* no .env (PostgreSQL SA2).",
      },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  try {
    const created = await createSa2SupplierInPg({
      name: String(body.name ?? ""),
      tradeName: body.tradeName ? String(body.tradeName) : undefined,
      document: body.document ? String(body.document) : undefined,
      email: body.email ? String(body.email) : undefined,
      phone: body.phone ? String(body.phone) : undefined,
      address: body.address ? String(body.address) : undefined,
      district: body.district ? String(body.district) : undefined,
      city: body.city ? String(body.city) : undefined,
      state: body.state ? String(body.state) : undefined,
      zip: body.zip ? String(body.zip) : undefined,
      store: body.store ? String(body.store) : undefined,
      supplierType: body.supplierType ? String(body.supplierType) : undefined,
      code: body.code ? String(body.code) : undefined,
    });
    return NextResponse.json({ ok: true, source: "protheus-pg", ...created });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao gravar fornecedor",
      },
      { status: 400 },
    );
  }
}

export async function PUT(request: NextRequest) {
  if (!isProtheusPgConfigured()) {
    return NextResponse.json(
      {
        error:
          "Gravação no Protheus exige PROTHEUS_PG_* no .env (PostgreSQL SA2).",
      },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const code = String(body.code ?? body.protheusCode ?? "").trim();
  if (!code) {
    return NextResponse.json(
      { error: "Informe o código do fornecedor (code)" },
      { status: 400 },
    );
  }

  try {
    const updated = await updateSa2SupplierInPg({
      code,
      name: String(body.name ?? ""),
      tradeName: body.tradeName ? String(body.tradeName) : undefined,
      document: body.document ? String(body.document) : undefined,
      email: body.email ? String(body.email) : undefined,
      phone: body.phone ? String(body.phone) : undefined,
      address: body.address ? String(body.address) : undefined,
      district: body.district ? String(body.district) : undefined,
      city: body.city ? String(body.city) : undefined,
      state: body.state ? String(body.state) : undefined,
      zip: body.zip ? String(body.zip) : undefined,
      store: body.store ? String(body.store) : undefined,
      supplierType: body.supplierType ? String(body.supplierType) : undefined,
    });
    return NextResponse.json({ ok: true, source: "protheus-pg", ...updated });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao atualizar fornecedor",
      },
      { status: 400 },
    );
  }
}

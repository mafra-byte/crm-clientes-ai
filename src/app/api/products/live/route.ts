import { NextRequest, NextResponse } from "next/server";
import { isProtheusPgConfigured } from "@/lib/protheus/pg-shared";
import {
  createSb1ProductInPg,
  fetchSb1ProductsFromPg,
  updateSb1ProductInPg,
} from "@/lib/protheus/sb1";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!isProtheusPgConfigured()) {
    return NextResponse.json(
      {
        error: "Configure PROTHEUS_PG_* para ler produtos SB1.",
        products: [],
      },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchSb1ProductsFromPg(q);
    return NextResponse.json({ ...payload, source: "protheus-pg" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao listar produtos SB1",
        products: [],
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
          "Gravação no Protheus exige PROTHEUS_PG_* no .env (PostgreSQL SB1).",
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
    const created = await createSb1ProductInPg({
      code: body.code ? String(body.code) : undefined,
      description: String(body.description ?? body.name ?? ""),
      type: body.type ? String(body.type) : undefined,
      unit: body.unit ? String(body.unit) : undefined,
      warehouse: body.warehouse ? String(body.warehouse) : undefined,
      group: body.group ? String(body.group) : undefined,
      price:
        body.price === undefined || body.price === null || body.price === ""
          ? undefined
          : Number(body.price),
      entryTes: body.entryTes
        ? String(body.entryTes)
        : body.tes
          ? String(body.tes)
          : undefined,
      exitTes: body.exitTes ? String(body.exitTes) : undefined,
    });
    return NextResponse.json({ ok: true, source: "protheus-pg", ...created });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao gravar produto",
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
          "Gravação no Protheus exige PROTHEUS_PG_* no .env (PostgreSQL SB1).",
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

  const code = String(body.code ?? "").trim();
  if (!code) {
    return NextResponse.json(
      { error: "Informe o código do produto (code)" },
      { status: 400 },
    );
  }

  try {
    const updated = await updateSb1ProductInPg({
      code,
      description: String(body.description ?? body.name ?? ""),
      type: body.type ? String(body.type) : undefined,
      unit: body.unit ? String(body.unit) : undefined,
      warehouse: body.warehouse ? String(body.warehouse) : undefined,
      group: body.group ? String(body.group) : undefined,
      price:
        body.price === undefined || body.price === null || body.price === ""
          ? undefined
          : Number(body.price),
      entryTes: body.entryTes
        ? String(body.entryTes)
        : body.tes
          ? String(body.tes)
          : undefined,
      exitTes: body.exitTes ? String(body.exitTes) : undefined,
    });
    return NextResponse.json({ ok: true, source: "protheus-pg", ...updated });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao atualizar produto",
      },
      { status: 400 },
    );
  }
}

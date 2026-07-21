import { NextRequest, NextResponse } from "next/server";
import { isProtheusPgConfigured } from "@/lib/protheus/pg-shared";
import { createSc1InPg, fetchSc1FromPg, updateSc1InPg } from "@/lib/protheus/sc1";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!isProtheusPgConfigured()) {
    return NextResponse.json(
      {
        error: "Configure PROTHEUS_PG_* para ler solicitações SC1.",
        lines: [],
      },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchSc1FromPg(q);
    return NextResponse.json({ ...payload, source: "protheus-pg" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao listar solicitações SC1",
        lines: [],
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
          "Gravação no Protheus exige PROTHEUS_PG_* no .env (PostgreSQL SC1).",
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
    const created = await createSc1InPg({
      productCode: String(body.productCode ?? body.product ?? ""),
      quantity: Number(body.quantity),
      unitPrice:
        body.unitPrice === undefined || body.unitPrice === null || body.unitPrice === ""
          ? undefined
          : Number(body.unitPrice),
      unit: body.unit ? String(body.unit) : undefined,
      description: body.description ? String(body.description) : undefined,
      warehouse: body.warehouse ? String(body.warehouse) : undefined,
      requester: body.requester ? String(body.requester) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
      needDate: body.needDate ? String(body.needDate) : undefined,
      number: body.number ? String(body.number) : undefined,
    });
    return NextResponse.json({ ok: true, source: "protheus-pg", ...created });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao gravar solicitação de compras",
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
          "Gravação no Protheus exige PROTHEUS_PG_* no .env (PostgreSQL SC1).",
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

  const number = String(body.number ?? "").trim();
  const item = String(body.item ?? "").trim();
  if (!number || !item) {
    return NextResponse.json(
      { error: "Informe número e item da solicitação" },
      { status: 400 },
    );
  }

  try {
    const updated = await updateSc1InPg({
      number,
      item,
      quantity: Number(body.quantity),
      unitPrice:
        body.unitPrice === undefined ||
        body.unitPrice === null ||
        body.unitPrice === ""
          ? undefined
          : Number(body.unitPrice),
      description: body.description ? String(body.description) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
      requester: body.requester ? String(body.requester) : undefined,
      needDate: body.needDate ? String(body.needDate) : undefined,
      warehouse: body.warehouse ? String(body.warehouse) : undefined,
    });
    return NextResponse.json({ ok: true, source: "protheus-pg", ...updated });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao atualizar solicitação de compras",
      },
      { status: 400 },
    );
  }
}

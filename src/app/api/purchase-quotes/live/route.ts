import { NextRequest, NextResponse } from "next/server";
import { isProtheusPgConfigured } from "@/lib/protheus/pg-shared";
import { createSc8InPg, fetchSc8FromPg } from "@/lib/protheus/sc8";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!isProtheusPgConfigured()) {
    return NextResponse.json(
      { error: "Configure PROTHEUS_PG_* para ler cotações SC8.", lines: [] },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchSc8FromPg(q);
    return NextResponse.json({ ...payload, source: "protheus-pg" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao listar cotações SC8",
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
          "Gravação no Protheus exige PROTHEUS_PG_* no .env (PostgreSQL SC8).",
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
    const created = await createSc8InPg({
      productCode: String(body.productCode ?? body.product ?? ""),
      supplierCode: String(body.supplierCode ?? body.supplier ?? ""),
      supplierStore: body.supplierStore ? String(body.supplierStore) : undefined,
      quantity: Number(body.quantity),
      unitPrice: Number(body.unitPrice ?? body.price),
      unit: body.unit ? String(body.unit) : undefined,
      description: body.description ? String(body.description) : undefined,
      purchaseRequestNumber: body.purchaseRequestNumber
        ? String(body.purchaseRequestNumber)
        : undefined,
      purchaseRequestItem: body.purchaseRequestItem
        ? String(body.purchaseRequestItem)
        : undefined,
      proposal: body.proposal ? String(body.proposal) : undefined,
      paymentTerm: body.paymentTerm ? String(body.paymentTerm) : undefined,
      deliveryDays:
        body.deliveryDays === undefined || body.deliveryDays === ""
          ? undefined
          : Number(body.deliveryDays),
      validUntil: body.validUntil ? String(body.validUntil) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
      number: body.number ? String(body.number) : undefined,
    });
    return NextResponse.json({ ok: true, source: "protheus-pg", ...created });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao gravar cotação de compras",
      },
      { status: 400 },
    );
  }
}

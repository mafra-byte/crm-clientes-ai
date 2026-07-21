import { NextRequest, NextResponse } from "next/server";
import { isProtheusPgConfigured } from "@/lib/protheus/pg-shared";
import { createSc7InPg, fetchSc7FromPg } from "@/lib/protheus/sc7";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!isProtheusPgConfigured()) {
    return NextResponse.json(
      { error: "Configure PROTHEUS_PG_* para ler pedidos SC7.", lines: [] },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchSc7FromPg(q);
    return NextResponse.json({ ...payload, source: "protheus-pg" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao listar pedidos de compra SC7",
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
          "Gravação no Protheus exige PROTHEUS_PG_* no .env (PostgreSQL SC7).",
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
    const created = await createSc7InPg({
      productCode: String(body.productCode ?? body.product ?? ""),
      supplierCode: String(body.supplierCode ?? body.supplier ?? ""),
      supplierStore: body.supplierStore ? String(body.supplierStore) : undefined,
      quantity: Number(body.quantity),
      unitPrice: Number(body.unitPrice ?? body.price),
      unit: body.unit ? String(body.unit) : undefined,
      description: body.description ? String(body.description) : undefined,
      warehouse: body.warehouse ? String(body.warehouse) : undefined,
      purchaseRequestNumber: body.purchaseRequestNumber
        ? String(body.purchaseRequestNumber)
        : undefined,
      purchaseRequestItem: body.purchaseRequestItem
        ? String(body.purchaseRequestItem)
        : undefined,
      quoteNumber: body.quoteNumber ? String(body.quoteNumber) : undefined,
      quoteItem: body.quoteItem ? String(body.quoteItem) : undefined,
      quoteProposal: body.quoteProposal
        ? String(body.quoteProposal)
        : undefined,
      paymentTerm: body.paymentTerm ? String(body.paymentTerm) : undefined,
      needDate: body.needDate ? String(body.needDate) : undefined,
      notes: body.notes ? String(body.notes) : undefined,
      number: body.number ? String(body.number) : undefined,
      tes: body.tes ? String(body.tes) : undefined,
    });
    return NextResponse.json({ ok: true, source: "protheus-pg", ...created });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao gravar pedido de compras",
      },
      { status: 400 },
    );
  }
}

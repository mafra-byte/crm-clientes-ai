import { NextRequest, NextResponse } from "next/server";
import { isProtheusPgConfigured } from "@/lib/protheus/pg-shared";
import {
  createReceiptFromPurchaseOrder,
  fetchReceiptsFromPg,
} from "@/lib/protheus/receipt";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!isProtheusPgConfigured()) {
    return NextResponse.json(
      { error: "Configure PROTHEUS_PG_* para ler recebimentos SF1/SD1.", lines: [] },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchReceiptsFromPg(q);
    return NextResponse.json({ ...payload, source: "protheus-pg" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao listar recebimentos SF1/SD1",
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
          "Gravação no Protheus exige PROTHEUS_PG_* no .env (PostgreSQL SF1/SD1).",
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
    const created = await createReceiptFromPurchaseOrder({
      purchaseOrderNumber: String(
        body.purchaseOrderNumber ?? body.pedido ?? body.number ?? "",
      ),
      purchaseOrderItem: String(
        body.purchaseOrderItem ?? body.itemPc ?? body.item ?? "",
      ),
      quantity:
        body.quantity !== undefined && body.quantity !== ""
          ? Number(body.quantity)
          : undefined,
      unitPrice:
        body.unitPrice !== undefined && body.unitPrice !== ""
          ? Number(body.unitPrice)
          : undefined,
      document: body.document
        ? String(body.document)
        : body.documento
          ? String(body.documento)
          : undefined,
      series: body.series
        ? String(body.series)
        : body.serie
          ? String(body.serie)
          : undefined,
      notes: body.notes ? String(body.notes) : undefined,
    });
    return NextResponse.json({ ok: true, source: "protheus-pg", ...created });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao gravar recebimento",
      },
      { status: 400 },
    );
  }
}

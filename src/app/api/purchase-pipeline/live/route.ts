import { NextResponse } from "next/server";
import { isProtheusPgConfigured } from "@/lib/protheus/pg-shared";
import { fetchPurchasePipeline } from "@/lib/protheus/pipeline";

export async function GET() {
  if (!isProtheusPgConfigured()) {
    return NextResponse.json(
      {
        error: "Configure PROTHEUS_PG_* para o fluxo de compras.",
        columns: [],
      },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchPurchasePipeline();
    return NextResponse.json({ ...payload, source: "protheus-pg" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao montar o fluxo de compras",
        columns: [],
      },
      { status: 502 },
    );
  }
}

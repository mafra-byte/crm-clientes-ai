import { NextRequest, NextResponse } from "next/server";
import { isProtheusPgConfigured } from "@/lib/protheus/pg-shared";
import { fetchStockFromPg } from "@/lib/protheus/sb2";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";

  if (!isProtheusPgConfigured()) {
    return NextResponse.json(
      { error: "Configure PROTHEUS_PG_* para ler estoque SB2.", lines: [] },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchStockFromPg(q);
    return NextResponse.json({ ...payload, source: "protheus-pg" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao listar estoque SB2",
        lines: [],
      },
      { status: 502 },
    );
  }
}

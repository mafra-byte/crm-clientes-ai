import { NextRequest, NextResponse } from "next/server";
import { isProtheusPgConfigured } from "@/lib/protheus/pg-shared";
import { createTesInPg, fetchTesFromPg } from "@/lib/protheus/sf4";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const onlyEntry = request.nextUrl.searchParams.get("entry") === "1";

  if (!isProtheusPgConfigured()) {
    return NextResponse.json(
      { error: "Configure PROTHEUS_PG_* para ler TES SF4.", lines: [] },
      { status: 400 },
    );
  }

  try {
    const payload = await fetchTesFromPg(q, onlyEntry);
    return NextResponse.json({ ...payload, source: "protheus-pg" });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao listar TES SF4",
        lines: [],
      },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isProtheusPgConfigured()) {
    return NextResponse.json(
      { error: "Gravação no Protheus exige PROTHEUS_PG_* (SF4)." },
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
    const typeRaw = String(body.type ?? "E").toUpperCase();
    const created = await createTesInPg({
      code: body.code ? String(body.code) : undefined,
      type: typeRaw === "S" ? "S" : "E",
      text: String(body.text ?? body.texto ?? ""),
      cfop: String(body.cfop ?? body.cf ?? ""),
      updatesStock:
        body.updatesStock === undefined
          ? undefined
          : Boolean(body.updatesStock),
      generatesDuplicate:
        body.generatesDuplicate === undefined
          ? undefined
          : Boolean(body.generatesDuplicate),
      calculatesIcms:
        body.calculatesIcms === undefined
          ? undefined
          : Boolean(body.calculatesIcms),
      creditIcms:
        body.creditIcms === undefined ? undefined : Boolean(body.creditIcms),
      purpose: body.purpose ? String(body.purpose) : undefined,
    });
    return NextResponse.json({ ok: true, source: "protheus-pg", ...created });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao gravar TES",
      },
      { status: 400 },
    );
  }
}

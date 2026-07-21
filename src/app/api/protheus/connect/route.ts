import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/protheus/config";
import { ensureDemoConnection } from "@/lib/protheus/demo";
import { ensureConnectionFromEnv, getValidConnection } from "@/lib/protheus/sync";

export async function POST() {
  try {
    if (isDemoMode()) {
      const connection = await ensureDemoConnection();
      return NextResponse.json({
        ok: true,
        demo: true,
        connected: true,
        connection: {
          id: connection.id,
          label: connection.label,
          baseUrl: connection.baseUrl,
          empresa: connection.empresa,
          filial: connection.filial,
          username: connection.username,
          expiresAt: connection.expiresAt,
        },
      });
    }

    const seeded = await ensureConnectionFromEnv();
    if (!seeded) {
      return NextResponse.json(
        {
          error:
            "Configure PROTHEUS_BASE_URL, PROTHEUS_USERNAME e PROTHEUS_PASSWORD no .env",
        },
        { status: 400 },
      );
    }

    const connection = await getValidConnection();
    return NextResponse.json({
      ok: true,
      connected: Boolean(connection?.accessToken),
      connection: connection
        ? {
            id: connection.id,
            label: connection.label,
            baseUrl: connection.baseUrl,
            empresa: connection.empresa,
            filial: connection.filial,
            username: connection.username,
            expiresAt: connection.expiresAt,
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível autenticar no Protheus",
      },
      { status: 500 },
    );
  }
}

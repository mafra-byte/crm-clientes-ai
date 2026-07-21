import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/protheus/config";
import { demoTestConnection } from "@/lib/protheus/demo";
import { testConnection } from "@/lib/protheus/sync";

export async function POST() {
  try {
    const connection = isDemoMode()
      ? await demoTestConnection()
      : await testConnection();
    return NextResponse.json({
      ok: true,
      demo: isDemoMode(),
      connection: {
        id: connection.id,
        label: connection.label,
        baseUrl: connection.baseUrl,
        empresa: connection.empresa,
        filial: connection.filial,
        username: connection.username,
        expiresAt: connection.expiresAt,
        lastTestAt: connection.lastTestAt,
        lastTestOk: connection.lastTestOk,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha no teste de conexão",
      },
      { status: 500 },
    );
  }
}

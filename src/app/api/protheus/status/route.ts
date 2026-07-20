import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getProtheusConfig } from "@/lib/protheus/config";
import { ensureConnectionFromEnv, getValidConnection } from "@/lib/protheus/sync";

export async function GET() {
  const config = getProtheusConfig();
  const connection =
    (await prisma.protheusConnection.findFirst({
      orderBy: { updatedAt: "desc" },
    })) ?? null;

  const recentSync = await prisma.syncLog.findFirst({
    orderBy: { createdAt: "desc" },
  });

  const connected = Boolean(
    connection?.accessToken &&
      connection.expiresAt &&
      connection.expiresAt.getTime() > Date.now(),
  );

  return NextResponse.json({
    configured: config.isConfigured,
    connected,
    connection: connection
      ? {
          id: connection.id,
          label: connection.label,
          baseUrl: connection.baseUrl,
          empresa: connection.empresa,
          filial: connection.filial,
          username: connection.username,
          expiresAt: connection.expiresAt,
          lastTestAt: connection.lastTestAt,
          lastTestOk: connection.lastTestOk,
        }
      : null,
    paths: {
      token: config.tokenPath,
      customers: config.customersPath,
      orders: config.ordersPath,
    },
    recentSync,
  });
}

export async function POST() {
  try {
    const connection = await ensureConnectionFromEnv();
    if (!connection) {
      return NextResponse.json(
        {
          error:
            "Configure PROTHEUS_BASE_URL, PROTHEUS_USERNAME e PROTHEUS_PASSWORD no .env",
        },
        { status: 400 },
      );
    }

    const authenticated = await getValidConnection();
    return NextResponse.json({
      ok: true,
      connection: authenticated,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Falha ao conectar no Protheus",
      },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const connection = await prisma.protheusConnection.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (connection) {
    await prisma.protheusConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        lastTestOk: false,
      },
    });
  }

  return NextResponse.json({ ok: true });
}

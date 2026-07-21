import { NextRequest, NextResponse } from "next/server";
import {
  customerCode,
  customerDocument,
  customerEmail,
  customerName,
  customerPhone,
  customerStore,
  fetchCustomers,
  ProtheusApiError,
} from "@/lib/protheus/client";
import { getProtheusConfig, isDemoMode } from "@/lib/protheus/config";
import { listDemoClientsLive } from "@/lib/protheus/demo";
import {
  fetchSa1ClientsFromPg,
  isProtheusPgConfigured,
} from "@/lib/protheus/pg";
import { getValidConnection } from "@/lib/protheus/sync";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const pageSize = Number(request.nextUrl.searchParams.get("pageSize") ?? 50);

  // Preferência: dados reais no PostgreSQL do Protheus (SA1990)
  if (isProtheusPgConfigured()) {
    try {
      const payload = await fetchSa1ClientsFromPg(q);
      return NextResponse.json({
        ...payload,
        source: "protheus-pg",
        demo: false,
      });
    } catch (error) {
      if (!isDemoMode()) {
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Falha ao ler SA1 no PostgreSQL do Protheus",
            source: "protheus-pg",
            clients: [],
          },
          { status: 502 },
        );
      }
    }
  }

  if (isDemoMode()) {
    const payload = await listDemoClientsLive(q);
    return NextResponse.json(payload);
  }

  try {
    const config = getProtheusConfig();
    if (!config.isConfigured) {
      return NextResponse.json(
        {
          error:
            "Configure PROTHEUS_BASE_URL, PROTHEUS_USERNAME e PROTHEUS_PASSWORD no .env",
          source: "config",
          clients: [],
        },
        { status: 400 },
      );
    }

    const connection = await getValidConnection();
    if (!connection?.accessToken) {
      return NextResponse.json(
        {
          error: "Não foi possível autenticar no REST do Protheus.",
          source: "auth",
          clients: [],
        },
        { status: 502 },
      );
    }

    const rows = await fetchCustomers({
      accessToken: connection.accessToken,
      tokenType: connection.tokenType ?? "Bearer",
      empresa: connection.empresa,
      filial: connection.filial,
      baseUrl: connection.baseUrl,
      page: 1,
      pageSize: Number.isFinite(pageSize) ? Math.min(pageSize, 200) : 50,
    });

    const clients = rows
      .map((customer) => {
        const code = customerCode(customer);
        const name = customerName(customer);
        return {
          id: code || name,
          name,
          email: customerEmail(customer),
          phone: customerPhone(customer),
          document: customerDocument(customer),
          store: customerStore(customer),
          source: "protheus-live",
          totalOrders: 0,
          totalSpent: 0,
          lastOrderAt: null as string | null,
          protheusCode: code || null,
        };
      })
      .filter((client) => {
        if (!q) return true;
        const hay = [
          client.name,
          client.email,
          client.phone,
          client.document,
          client.protheusCode,
          client.store,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });

    return NextResponse.json({
      source: "protheus-live",
      empresa: connection.empresa,
      filial: connection.filial,
      clients,
    });
  } catch (error) {
    const message =
      error instanceof ProtheusApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Falha ao listar clientes no Protheus";
    const status = error instanceof ProtheusApiError ? error.status : 502;
    return NextResponse.json(
      { error: message, source: "protheus-live", clients: [] },
      { status },
    );
  }
}

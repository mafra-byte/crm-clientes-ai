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
  createSa1ClientInPg,
  fetchSa1ClientsFromPg,
  isProtheusPgConfigured,
} from "@/lib/protheus/pg";
import { getValidConnection } from "@/lib/protheus/sync";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const pageSize = Number(request.nextUrl.searchParams.get("pageSize") ?? 50);

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

export async function POST(request: NextRequest) {
  if (!isProtheusPgConfigured()) {
    return NextResponse.json(
      {
        error:
          "Gravação no Protheus exige PROTHEUS_PG_* no .env (PostgreSQL SA1).",
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
    const created = await createSa1ClientInPg({
      name: String(body.name ?? ""),
      tradeName: body.tradeName ? String(body.tradeName) : undefined,
      document: body.document ? String(body.document) : undefined,
      email: body.email ? String(body.email) : undefined,
      phone: body.phone ? String(body.phone) : undefined,
      address: body.address ? String(body.address) : undefined,
      district: body.district ? String(body.district) : undefined,
      city: body.city ? String(body.city) : undefined,
      state: body.state ? String(body.state) : undefined,
      zip: body.zip ? String(body.zip) : undefined,
      store: body.store ? String(body.store) : undefined,
      personType:
        body.personType === "F" || body.personType === "J"
          ? body.personType
          : undefined,
      customerType: body.customerType ? String(body.customerType) : undefined,
      code: body.code ? String(body.code) : undefined,
    });

    // Espelha no cache local do portal (não bloqueia se falhar)
    try {
      await prisma.client.upsert({
        where: { protheusCode: created.client.protheusCode! },
        create: {
          protheusCode: created.client.protheusCode,
          name: created.client.name,
          email: created.client.email,
          phone: created.client.phone,
          document: created.client.document,
          store: created.client.store,
          source: "protheus",
        },
        update: {
          name: created.client.name,
          email: created.client.email,
          phone: created.client.phone,
          document: created.client.document,
          store: created.client.store,
          source: "protheus",
        },
      });
    } catch {
      /* cache opcional */
    }

    return NextResponse.json({ ok: true, source: "protheus-pg", ...created });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha ao gravar cliente",
      },
      { status: 400 },
    );
  }
}

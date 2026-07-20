import { prisma } from "@/lib/db";
import {
  customerCode,
  customerDocument,
  customerEmail,
  customerName,
  customerPhone,
  customerStore,
  fetchCustomers,
  fetchOrders,
  orderCustomerCode,
  orderCustomerName,
  orderDate,
  orderFirstItem,
  orderId,
  orderNumber,
  orderStatus,
  orderTotal,
  requestAccessToken,
} from "@/lib/protheus/client";
import { getProtheusConfig } from "@/lib/protheus/config";
import type { ProtheusCustomer, ProtheusOrder } from "@/lib/protheus/types";
import type { ProtheusConnection } from "@prisma/client";

const TOKEN_SKEW_MS = 5 * 60 * 1000;

export async function ensureConnectionFromEnv(): Promise<ProtheusConnection | null> {
  const config = getProtheusConfig();
  if (!config.isConfigured) return null;

  const existing = await prisma.protheusConnection.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (existing) {
    return prisma.protheusConnection.update({
      where: { id: existing.id },
      data: {
        baseUrl: config.baseUrl,
        empresa: config.empresa,
        filial: config.filial,
        username: config.username,
      },
    });
  }

  return prisma.protheusConnection.create({
    data: {
      label: "Ambiente configurado",
      baseUrl: config.baseUrl,
      empresa: config.empresa,
      filial: config.filial,
      username: config.username,
    },
  });
}

export async function getValidConnection(): Promise<ProtheusConnection | null> {
  const connection =
    (await prisma.protheusConnection.findFirst({
      orderBy: { updatedAt: "desc" },
    })) ?? (await ensureConnectionFromEnv());

  if (!connection) return null;

  if (
    connection.accessToken &&
    connection.expiresAt &&
    connection.expiresAt.getTime() - Date.now() > TOKEN_SKEW_MS
  ) {
    return connection;
  }

  const tokens = await requestAccessToken({
    baseUrl: connection.baseUrl,
    username: connection.username,
  });

  return prisma.protheusConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? connection.refreshToken,
      tokenType: tokens.token_type ?? "Bearer",
      expiresAt: new Date(
        Date.now() + (tokens.expires_in ?? 3600) * 1000,
      ),
      lastTestAt: new Date(),
      lastTestOk: true,
    },
  });
}

export async function upsertCustomer(
  connection: ProtheusConnection,
  customer: ProtheusCustomer,
) {
  const code = customerCode(customer);
  if (!code) return null;

  return prisma.client.upsert({
    where: { protheusCode: code },
    create: {
      protheusCode: code,
      name: customerName(customer),
      email: customerEmail(customer),
      phone: customerPhone(customer),
      document: customerDocument(customer),
      store: customerStore(customer),
      source: "protheus",
      connectionId: connection.id,
    },
    update: {
      name: customerName(customer),
      email: customerEmail(customer) ?? undefined,
      phone: customerPhone(customer) ?? undefined,
      document: customerDocument(customer) ?? undefined,
      store: customerStore(customer) ?? undefined,
      connectionId: connection.id,
      source: "protheus",
    },
  });
}

export async function upsertOrderAndClient(
  connection: ProtheusConnection,
  order: ProtheusOrder,
) {
  const id = orderId(order);
  if (!id) return { ok: false as const, client: null };

  const customerCodeValue = orderCustomerCode(order);
  let client =
    customerCodeValue
      ? await prisma.client.findUnique({
          where: { protheusCode: customerCodeValue },
        })
      : null;

  if (!client && customerCodeValue) {
    client = await prisma.client.create({
      data: {
        protheusCode: customerCodeValue,
        name: orderCustomerName(order) ?? `Cliente ${customerCodeValue}`,
        source: "protheus",
        connectionId: connection.id,
        lastOrderAt: orderDate(order),
        totalOrders: 1,
        totalSpent: orderTotal(order),
      },
    });
  }

  const item = orderFirstItem(order);

  await prisma.order.upsert({
    where: { protheusId: id },
    create: {
      protheusId: id,
      number: orderNumber(order),
      status: orderStatus(order),
      totalAmount: orderTotal(order),
      currencyId: order.currency ?? order.moeda ?? "BRL",
      dateCreated: orderDate(order),
      itemTitle: item?.title ?? null,
      itemId: item?.itemId ?? null,
      quantity: item?.quantity ?? 1,
      rawJson: JSON.stringify(order),
      clientId: client?.id,
      connectionId: connection.id,
    },
    update: {
      number: orderNumber(order),
      status: orderStatus(order),
      totalAmount: orderTotal(order),
      currencyId: order.currency ?? order.moeda ?? "BRL",
      dateCreated: orderDate(order),
      itemTitle: item?.title ?? null,
      itemId: item?.itemId ?? null,
      quantity: item?.quantity ?? 1,
      rawJson: JSON.stringify(order),
      clientId: client?.id,
      connectionId: connection.id,
    },
  });

  if (client) {
    const aggregates = await prisma.order.aggregate({
      where: { clientId: client.id },
      _count: { _all: true },
      _sum: { totalAmount: true },
      _max: { dateCreated: true },
    });

    await prisma.client.update({
      where: { id: client.id },
      data: {
        totalOrders: aggregates._count._all,
        totalSpent: aggregates._sum.totalAmount ?? 0,
        lastOrderAt: aggregates._max.dateCreated,
      },
    });
  }

  return { ok: true as const, client };
}

export async function syncCustomers(options?: {
  maxPages?: number;
  pageSize?: number;
}) {
  const connection = await getValidConnection();
  if (!connection?.accessToken) {
    throw new Error("Nenhuma conexão Protheus autenticada.");
  }

  const maxPages = options?.maxPages ?? 5;
  const pageSize = options?.pageSize ?? 50;
  let imported = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const customers = await fetchCustomers({
      accessToken: connection.accessToken,
      tokenType: connection.tokenType ?? "Bearer",
      empresa: connection.empresa,
      filial: connection.filial,
      baseUrl: connection.baseUrl,
      page,
      pageSize,
    });

    if (!customers.length) break;

    for (const customer of customers) {
      const saved = await upsertCustomer(connection, customer);
      if (saved) imported += 1;
    }

    if (customers.length < pageSize) break;
  }

  await prisma.syncLog.create({
    data: {
      type: "customers",
      status: "success",
      message: `Sincronizados ${imported} clientes do Protheus.`,
      details: JSON.stringify({ imported, maxPages, pageSize }),
    },
  });

  return { imported };
}

export async function syncOrders(options?: {
  maxPages?: number;
  pageSize?: number;
}) {
  const connection = await getValidConnection();
  if (!connection?.accessToken) {
    throw new Error("Nenhuma conexão Protheus autenticada.");
  }

  const maxPages = options?.maxPages ?? 5;
  const pageSize = options?.pageSize ?? 50;
  let imported = 0;

  for (let page = 1; page <= maxPages; page += 1) {
    const orders = await fetchOrders({
      accessToken: connection.accessToken,
      tokenType: connection.tokenType ?? "Bearer",
      empresa: connection.empresa,
      filial: connection.filial,
      baseUrl: connection.baseUrl,
      page,
      pageSize,
    });

    if (!orders.length) break;

    for (const order of orders) {
      const saved = await upsertOrderAndClient(connection, order);
      if (saved.ok) imported += 1;
    }

    if (orders.length < pageSize) break;
  }

  await prisma.syncLog.create({
    data: {
      type: "orders",
      status: "success",
      message: `Sincronizados ${imported} pedidos do Protheus.`,
      details: JSON.stringify({ imported, maxPages, pageSize }),
    },
  });

  return { imported };
}

export async function testConnection() {
  const connection = await ensureConnectionFromEnv();
  if (!connection) {
    throw new Error(
      "Configure PROTHEUS_BASE_URL, PROTHEUS_USERNAME e PROTHEUS_PASSWORD.",
    );
  }

  const tokens = await requestAccessToken({
    baseUrl: connection.baseUrl,
    username: connection.username,
  });

  const updated = await prisma.protheusConnection.update({
    where: { id: connection.id },
    data: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenType: tokens.token_type ?? "Bearer",
      expiresAt: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000),
      lastTestAt: new Date(),
      lastTestOk: true,
    },
  });

  await prisma.syncLog.create({
    data: {
      type: "connection",
      status: "success",
      message: `Conexão testada com sucesso (${updated.empresa}/${updated.filial}).`,
    },
  });

  return updated;
}

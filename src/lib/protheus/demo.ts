import { prisma } from "@/lib/db";
import { getProtheusConfig, isDemoMode } from "@/lib/protheus/config";

export async function ensureDemoConnection() {
  const config = getProtheusConfig();
  const existing = await prisma.protheusConnection.findFirst({
    orderBy: { updatedAt: "desc" },
  });

  if (existing?.accessToken && existing.expiresAt && existing.expiresAt > new Date()) {
    return existing;
  }

  if (existing) {
    return prisma.protheusConnection.update({
      where: { id: existing.id },
      data: {
        label: existing.label || "Demo comercial — empresa 99",
        baseUrl: config.baseUrl || existing.baseUrl,
        empresa: config.empresa,
        filial: config.filial,
        username: config.username || existing.username,
        accessToken: "demo-access-token",
        refreshToken: "demo-refresh-token",
        tokenType: "Bearer",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        lastTestAt: new Date(),
        lastTestOk: true,
      },
    });
  }

  return prisma.protheusConnection.create({
    data: {
      label: "Demo comercial — empresa 99",
      baseUrl: config.baseUrl || "https://protheus.ccskf.net/rest",
      empresa: config.empresa,
      filial: config.filial,
      username: config.username || "Admin",
      accessToken: "demo-access-token",
      refreshToken: "demo-refresh-token",
      tokenType: "Bearer",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      lastTestAt: new Date(),
      lastTestOk: true,
    },
  });
}

export async function demoTestConnection() {
  const connection = await ensureDemoConnection();
  await prisma.syncLog.create({
    data: {
      type: "test",
      status: "ok",
      message: "Demo: conexão REST simulada com sucesso",
    },
  });
  return connection;
}

export async function demoSync(type: "customers" | "orders" | "all") {
  const clients = await prisma.client.count();
  const orders = await prisma.order.count();
  await ensureDemoConnection();

  const message =
    type === "customers"
      ? `Demo: ${clients} clientes já disponíveis`
      : type === "orders"
        ? `Demo: ${orders} pedidos já disponíveis`
        : `Demo: ${clients} clientes e ${orders} pedidos sincronizados`;

  await prisma.syncLog.create({
    data: {
      type: "sync",
      status: "ok",
      message,
      details: JSON.stringify({ mode: "demo", type }),
    },
  });

  if (type === "customers") return { imported: clients, customers: clients };
  if (type === "orders") return { imported: orders, orders };
  return {
    imported: clients + orders,
    customers: clients,
    orders,
  };
}

export async function listDemoClientsLive(q = "") {
  const rows = await prisma.client.findMany({
    orderBy: { name: "asc" },
    take: 200,
  });

  const needle = q.trim().toLowerCase();
  const clients = rows
    .map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      document: client.document,
      store: client.store,
      source: "protheus-live",
      totalOrders: client.totalOrders,
      totalSpent: client.totalSpent,
      lastOrderAt: client.lastOrderAt?.toISOString() ?? null,
      protheusCode: client.protheusCode,
    }))
    .filter((client) => {
      if (!needle) return true;
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
      return hay.includes(needle);
    });

  const config = getProtheusConfig();
  return {
    source: "protheus-live",
    demo: true,
    empresa: config.empresa,
    filial: config.filial,
    clients,
  };
}

export { isDemoMode };

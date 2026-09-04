import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [clients, orders, revenue, connection, recentSync] = await Promise.all([
    prisma.client.count(),
    prisma.order.count(),
    prisma.order.aggregate({ _sum: { totalAmount: true } }),
    prisma.protheusConnection.findFirst({ orderBy: { updatedAt: "desc" } }),
    prisma.syncLog.findFirst({ orderBy: { createdAt: "desc" } }),
  ]);

  const recentClients = await prisma.client.findMany({
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  const recentOrders = await prisma.order.findMany({
    orderBy: { dateCreated: "desc" },
    take: 5,
    include: {
      client: { select: { id: true, name: true } },
    },
  });

  const connected = Boolean(
    connection?.accessToken &&
      connection.expiresAt &&
      connection.expiresAt.getTime() > Date.now(),
  );

  return NextResponse.json({
    stats: {
      clients,
      orders,
      revenue: revenue._sum.totalAmount ?? 0,
      connected,
      demo: process.env.PROTHEUS_DEMO_MODE === "true",
      empresa: connection?.empresa ?? null,
      filial: connection?.filial ?? null,
      label: connection?.label ?? null,
    },
    recentClients,
    recentOrders,
    recentSync,
  });
}

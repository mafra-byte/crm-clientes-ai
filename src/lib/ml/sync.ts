import { prisma } from "@/lib/db";
import {
  buyerDisplayName,
  fetchMlUser,
  fetchOrder,
  refreshAccessToken,
  searchSellerOrders,
} from "@/lib/ml/client";
import type { MlOrder } from "@/lib/ml/types";
import type { MlAccount } from "@prisma/client";

const TOKEN_SKEW_MS = 5 * 60 * 1000;

export async function getValidMlAccount(): Promise<MlAccount | null> {
  const account = await prisma.mlAccount.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  if (!account) return null;

  if (account.expiresAt.getTime() - Date.now() > TOKEN_SKEW_MS) {
    return account;
  }

  const tokens = await refreshAccessToken(account.refreshToken);
  const user = await fetchMlUser(tokens.access_token);

  return prisma.mlAccount.update({
    where: { id: account.id },
    data: {
      mlUserId: String(tokens.user_id),
      nickname: user.nickname,
      email: user.email ?? account.email,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });
}

function phoneFromBuyer(order: MlOrder): string | null {
  const phone = order.buyer.phone;
  if (!phone?.number) return null;
  const area = phone.area_code ? `${phone.area_code} ` : "";
  return `${area}${phone.number}`.trim();
}

export async function upsertOrderAndClient(
  account: MlAccount,
  order: MlOrder,
) {
  const firstItem = order.order_items?.[0];
  const buyerId = String(order.buyer.id);
  const name = buyerDisplayName(order.buyer);

  const client = await prisma.client.upsert({
    where: { mlBuyerId: buyerId },
    create: {
      mlBuyerId: buyerId,
      name,
      email: order.buyer.email ?? null,
      phone: phoneFromBuyer(order),
      nickname: order.buyer.nickname ?? null,
      source: "mercado_livre",
      mlAccountId: account.id,
      lastOrderAt: new Date(order.date_created),
      totalOrders: 1,
      totalSpent: order.total_amount,
    },
    update: {
      name,
      email: order.buyer.email ?? undefined,
      phone: phoneFromBuyer(order) ?? undefined,
      nickname: order.buyer.nickname ?? undefined,
      mlAccountId: account.id,
      lastOrderAt: new Date(order.date_created),
    },
  });

  await prisma.order.upsert({
    where: { mlOrderId: String(order.id) },
    create: {
      mlOrderId: String(order.id),
      status: order.status,
      totalAmount: order.total_amount,
      currencyId: order.currency_id || "BRL",
      dateCreated: new Date(order.date_created),
      dateClosed: order.date_closed ? new Date(order.date_closed) : null,
      itemTitle: firstItem?.item.title ?? null,
      itemId: firstItem?.item.id ?? null,
      quantity: firstItem?.quantity ?? 1,
      rawJson: JSON.stringify(order),
      clientId: client.id,
      mlAccountId: account.id,
    },
    update: {
      status: order.status,
      totalAmount: order.total_amount,
      currencyId: order.currency_id || "BRL",
      dateCreated: new Date(order.date_created),
      dateClosed: order.date_closed ? new Date(order.date_closed) : null,
      itemTitle: firstItem?.item.title ?? null,
      itemId: firstItem?.item.id ?? null,
      quantity: firstItem?.quantity ?? 1,
      rawJson: JSON.stringify(order),
      clientId: client.id,
      mlAccountId: account.id,
    },
  });

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

  return client;
}

export async function syncRecentOrders(options?: {
  maxPages?: number;
  pageSize?: number;
}) {
  const account = await getValidMlAccount();
  if (!account) {
    throw new Error("Nenhuma conta Mercado Livre conectada.");
  }

  const maxPages = options?.maxPages ?? 5;
  const pageSize = options?.pageSize ?? 50;
  let offset = 0;
  let imported = 0;
  let total = 0;

  for (let page = 0; page < maxPages; page += 1) {
    const result = await searchSellerOrders({
      accessToken: account.accessToken,
      sellerId: account.mlUserId,
      offset,
      limit: pageSize,
    });

    total = result.paging.total;
    if (!result.results.length) break;

    for (const order of result.results) {
      await upsertOrderAndClient(account, order);
      imported += 1;
    }

    offset += result.results.length;
    if (offset >= result.paging.total) break;
  }

  await prisma.syncLog.create({
    data: {
      type: "orders",
      status: "success",
      message: `Sincronizados ${imported} pedidos (total disponível: ${total}).`,
      details: JSON.stringify({ imported, total, maxPages, pageSize }),
    },
  });

  return { imported, total };
}

export async function syncSingleOrder(orderId: string | number) {
  const account = await getValidMlAccount();
  if (!account) {
    throw new Error("Nenhuma conta Mercado Livre conectada.");
  }

  const order = await fetchOrder(account.accessToken, orderId);
  const client = await upsertOrderAndClient(account, order);

  await prisma.syncLog.create({
    data: {
      type: "order",
      status: "success",
      message: `Pedido ${order.id} sincronizado.`,
      details: JSON.stringify({ orderId: order.id, clientId: client.id }),
    },
  });

  return { order, client };
}

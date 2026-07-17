import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMlConfig } from "@/lib/ml/config";
import { getValidMlAccount } from "@/lib/ml/sync";

export async function GET() {
  const config = getMlConfig();
  const account = await getValidMlAccount().catch(() => null);
  const recentSync = await prisma.syncLog.findFirst({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    configured: config.isConfigured,
    connected: Boolean(account),
    account: account
      ? {
          id: account.id,
          mlUserId: account.mlUserId,
          nickname: account.nickname,
          email: account.email,
          expiresAt: account.expiresAt,
        }
      : null,
    recentSync,
  });
}

export async function DELETE() {
  const account = await prisma.mlAccount.findFirst();
  if (!account) {
    return NextResponse.json({ ok: true });
  }

  await prisma.order.deleteMany({ where: { mlAccountId: account.id } });
  await prisma.client.updateMany({
    where: { mlAccountId: account.id },
    data: { mlAccountId: null },
  });
  await prisma.mlAccount.delete({ where: { id: account.id } });

  return NextResponse.json({ ok: true });
}

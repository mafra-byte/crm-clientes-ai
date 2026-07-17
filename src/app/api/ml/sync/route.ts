import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncRecentOrders } from "@/lib/ml/sync";

export async function POST() {
  try {
    const result = await syncRecentOrders({ maxPages: 5, pageSize: 50 });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha na sincronização";

    await prisma.syncLog.create({
      data: {
        type: "orders",
        status: "error",
        message,
      },
    });

    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

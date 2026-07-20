import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncCustomers, syncOrders } from "@/lib/protheus/sync";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      type?: "customers" | "orders" | "all";
    };
    const type = body.type ?? "all";

    if (type === "customers") {
      const result = await syncCustomers();
      return NextResponse.json({ type, ...result });
    }

    if (type === "orders") {
      const result = await syncOrders();
      return NextResponse.json({ type, ...result });
    }

    const customers = await syncCustomers();
    const orders = await syncOrders();

    return NextResponse.json({
      type: "all",
      customers: customers.imported,
      orders: orders.imported,
      imported: customers.imported + orders.imported,
    });
  } catch (error) {
    await prisma.syncLog.create({
      data: {
        type: "sync",
        status: "error",
        message:
          error instanceof Error ? error.message : "Falha na sincronização",
      },
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Falha na sincronização",
      },
      { status: 500 },
    );
  }
}

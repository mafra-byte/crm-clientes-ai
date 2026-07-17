import { NextRequest, NextResponse } from "next/server";
import { syncSingleOrder } from "@/lib/ml/sync";
import type { MlNotification } from "@/lib/ml/types";

/**
 * Endpoint de notificações do Mercado Livre.
 * Configure a URL no painel do aplicativo:
 *   https://seu-dominio/api/ml/notifications
 */
export async function POST(request: NextRequest) {
  let payload: MlNotification | null = null;

  try {
    payload = (await request.json()) as MlNotification;
  } catch {
    return NextResponse.json({ ok: true });
  }

  if (payload?.topic === "orders" || payload?.topic === "orders_v2") {
    const match = payload.resource?.match(/\/orders\/(\d+)/);
    if (match?.[1]) {
      try {
        await syncSingleOrder(match[1]);
      } catch {
        // Acknowledge anyway to avoid notification retries storm during setup.
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Webhook Mercado Livre ativo. Use POST para notificações.",
  });
}

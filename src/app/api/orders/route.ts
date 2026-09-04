import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get("status")?.trim();

  const orders = await prisma.order.findMany({
    where: status ? { status } : undefined,
    orderBy: { dateCreated: "desc" },
    take: 100,
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          protheusCode: true,
        },
      },
    },
  });

  return NextResponse.json({ orders });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();

  const clients = await prisma.client.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
            { document: { contains: q } },
            { protheusCode: { contains: q } },
          ],
        }
      : undefined,
    orderBy: [{ lastOrderAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({ clients });
}

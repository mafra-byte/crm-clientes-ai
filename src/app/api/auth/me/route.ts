import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/portal-auth";

export async function GET() {
  const jar = await cookies();
  const session = verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({
    authenticated: true,
    username: session.username,
    exp: session.exp,
  });
}

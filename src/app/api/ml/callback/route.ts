import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMlConfig } from "@/lib/ml/config";
import { exchangeCodeForToken, fetchMlUser } from "@/lib/ml/client";

export async function GET(request: NextRequest) {
  const { appUrl } = getMlConfig();
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${appUrl}/integracoes?error=${encodeURIComponent(error)}`,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${appUrl}/integracoes?error=${encodeURIComponent("missing_code")}`,
    );
  }

  const savedState = await prisma.oAuthState.findUnique({ where: { state } });
  if (!savedState) {
    return NextResponse.redirect(
      `${appUrl}/integracoes?error=${encodeURIComponent("invalid_state")}`,
    );
  }

  await prisma.oAuthState.delete({ where: { id: savedState.id } });

  try {
    const tokens = await exchangeCodeForToken(code);
    const user = await fetchMlUser(tokens.access_token);

    await prisma.mlAccount.upsert({
      where: { mlUserId: String(tokens.user_id) },
      create: {
        mlUserId: String(tokens.user_id),
        nickname: user.nickname,
        email: user.email ?? null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
      update: {
        nickname: user.nickname,
        email: user.email ?? null,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    return NextResponse.redirect(`${appUrl}/integracoes?connected=1`);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao conectar ao Mercado Livre";
    return NextResponse.redirect(
      `${appUrl}/integracoes?error=${encodeURIComponent(message)}`,
    );
  }
}

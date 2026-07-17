import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMlConfig } from "@/lib/ml/config";
import { buildAuthorizationUrl } from "@/lib/ml/client";

export async function GET() {
  const config = getMlConfig();
  if (!config.isConfigured) {
    return NextResponse.json(
      {
        error:
          "Configure ML_APP_ID e ML_CLIENT_SECRET no arquivo .env antes de conectar.",
      },
      { status: 400 },
    );
  }

  const state = randomBytes(16).toString("hex");
  await prisma.oAuthState.create({ data: { state } });

  return NextResponse.redirect(buildAuthorizationUrl(state));
}

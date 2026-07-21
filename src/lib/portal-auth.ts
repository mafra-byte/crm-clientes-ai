import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "portal_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export type PortalSession = {
  username: string;
  exp: number;
};

function sessionSecret() {
  return (
    process.env.PORTAL_SESSION_SECRET ||
    process.env.PROTHEUS_PASSWORD ||
    "protheus-portal-dev-secret"
  );
}

export function getPortalCredentials() {
  return {
    username: process.env.PORTAL_USERNAME || "Admin",
    password: process.env.PORTAL_PASSWORD || "Protheus.123",
  };
}

export function validatePortalLogin(username: string, password: string) {
  const portal = getPortalCredentials();
  const protheusUser = process.env.PROTHEUS_USERNAME || "";
  const protheusPass = process.env.PROTHEUS_PASSWORD || "";

  const portalOk =
    username === portal.username && password === portal.password;
  const erpOk =
    Boolean(protheusUser) &&
    username === protheusUser &&
    password === protheusPass;

  return portalOk || erpOk;
}

function sign(payload: string) {
  return createHmac("sha256", sessionSecret()).update(payload).digest("base64url");
}

export function createSessionToken(username: string) {
  const session: PortalSession = {
    username,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): PortalSession | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as PortalSession;
    if (!session?.username || !session?.exp || session.exp < Date.now()) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_TTL_MS / 1000) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

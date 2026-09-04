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

function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 1) {
    binary += String.fromCharCode(view[i]!);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i)! ^ b.charCodeAt(i)!;
  }
  return out === 0;
}

async function sign(payload: string) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(sessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return toBase64Url(signature);
}

export async function createSessionToken(username: string) {
  const session: PortalSession = {
    username,
    exp: Date.now() + SESSION_TTL_MS,
  };
  const payload = toBase64Url(new TextEncoder().encode(JSON.stringify(session)));
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(
  token: string | undefined | null,
): Promise<PortalSession | null> {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = await sign(payload);
  if (!timingSafeEqual(signature, expected)) return null;

  try {
    const json = new TextDecoder().decode(fromBase64Url(payload));
    const session = JSON.parse(json) as PortalSession;
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

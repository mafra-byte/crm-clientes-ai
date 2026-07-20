import { getMlConfig } from "./config";
import type {
  MlOrder,
  MlOrdersSearchResponse,
  MlTokenResponse,
  MlUser,
} from "./types";

export class MercadoLivreApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "MercadoLivreApiError";
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof (body as { message: unknown }).message === "string"
        ? (body as { message: string }).message
        : `Mercado Livre API error (${response.status})`;
    throw new MercadoLivreApiError(message, response.status, body);
  }

  return body as T;
}

export function buildAuthorizationUrl(state: string): string {
  const { appId, redirectUri, authUrl } = getMlConfig();
  const url = new URL(authUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeCodeForToken(
  code: string,
): Promise<MlTokenResponse> {
  const { appId, clientSecret, redirectUri, apiUrl } = getMlConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: appId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch(`${apiUrl}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return parseJson<MlTokenResponse>(response);
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<MlTokenResponse> {
  const { appId, clientSecret, apiUrl } = getMlConfig();
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: appId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${apiUrl}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return parseJson<MlTokenResponse>(response);
}

export async function fetchMlUser(accessToken: string): Promise<MlUser> {
  const { apiUrl } = getMlConfig();
  const response = await fetch(`${apiUrl}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  return parseJson<MlUser>(response);
}

export async function searchSellerOrders(params: {
  accessToken: string;
  sellerId: string;
  offset?: number;
  limit?: number;
}): Promise<MlOrdersSearchResponse> {
  const { apiUrl } = getMlConfig();
  const offset = params.offset ?? 0;
  const limit = params.limit ?? 50;
  const url = new URL(`${apiUrl}/orders/search`);
  url.searchParams.set("seller", params.sellerId);
  url.searchParams.set("sort", "date_desc");
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(limit));

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      Accept: "application/json",
    },
  });

  return parseJson<MlOrdersSearchResponse>(response);
}

export async function fetchOrder(
  accessToken: string,
  orderId: string | number,
): Promise<MlOrder> {
  const { apiUrl } = getMlConfig();
  const response = await fetch(`${apiUrl}/orders/${orderId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  return parseJson<MlOrder>(response);
}

export function buyerDisplayName(buyer: {
  first_name?: string;
  last_name?: string;
  nickname?: string;
  id: number;
}): string {
  const full = [buyer.first_name, buyer.last_name].filter(Boolean).join(" ").trim();
  if (full) return full;
  if (buyer.nickname) return buyer.nickname;
  return `Comprador ${buyer.id}`;
}

import { getProtheusConfig } from "./config";
import type {
  ProtheusCustomer,
  ProtheusListResponse,
  ProtheusOrder,
  ProtheusTokenResponse,
} from "./types";

export class ProtheusApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ProtheusApiError";
  }
}

function joinUrl(base: string, path: string) {
  const normalizedBase = base.replace(/\/$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
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
      "error_description" in body &&
      typeof (body as { error_description: unknown }).error_description ===
        "string"
        ? (body as { error_description: string }).error_description
        : typeof body === "object" &&
            body !== null &&
            "message" in body &&
            typeof (body as { message: unknown }).message === "string"
          ? (body as { message: string }).message
          : `Protheus API error (${response.status})`;
    throw new ProtheusApiError(message, response.status, body);
  }

  return body as T;
}

export function buildBasicAuthHeader(clientId: string, clientSecret: string) {
  const token = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  return `Basic ${token}`;
}

export async function requestAccessToken(options?: {
  baseUrl?: string;
  username?: string;
  password?: string;
  clientId?: string;
  clientSecret?: string;
  tokenPath?: string;
}): Promise<ProtheusTokenResponse> {
  const config = getProtheusConfig();
  const baseUrl = options?.baseUrl ?? config.baseUrl;
  const username = options?.username ?? config.username;
  const password = options?.password ?? config.password;
  const clientId = options?.clientId ?? config.clientId;
  const clientSecret = options?.clientSecret ?? config.clientSecret;
  const tokenPath = options?.tokenPath ?? config.tokenPath;

  if (!baseUrl) {
    throw new ProtheusApiError("PROTHEUS_BASE_URL não configurada.", 400);
  }

  const body = new URLSearchParams({
    grant_type: "password",
    username,
    password,
  });

  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  };

  if (clientId && clientSecret) {
    headers.Authorization = buildBasicAuthHeader(clientId, clientSecret);
  }

  const response = await fetch(joinUrl(baseUrl, tokenPath), {
    method: "POST",
    headers,
    body,
  });

  return parseJson<ProtheusTokenResponse>(response);
}

function tenantHeaders(empresa: string, filial: string) {
  return {
    tenantId: `${empresa},${filial}`,
    Company: empresa,
    Branch: filial,
  };
}

export async function protheusFetch<T>(
  path: string,
  options: {
    accessToken: string;
    tokenType?: string;
    empresa: string;
    filial: string;
    baseUrl?: string;
    method?: string;
    query?: Record<string, string | number | undefined>;
  },
): Promise<T> {
  const config = getProtheusConfig();
  const baseUrl = options.baseUrl ?? config.baseUrl;
  const url = new URL(joinUrl(baseUrl, path));

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `${options.tokenType ?? "Bearer"} ${options.accessToken}`,
      Accept: "application/json",
      ...tenantHeaders(options.empresa, options.filial),
    },
  });

  return parseJson<T>(response);
}

export function unwrapList<T>(payload: ProtheusListResponse<T> | T[]): T[] {
  if (Array.isArray(payload)) return payload;
  return payload.items ?? payload.data ?? payload.content ?? [];
}

export async function fetchCustomers(params: {
  accessToken: string;
  tokenType?: string;
  empresa: string;
  filial: string;
  baseUrl?: string;
  page?: number;
  pageSize?: number;
}) {
  const config = getProtheusConfig();
  const payload = await protheusFetch<
    ProtheusListResponse<ProtheusCustomer> | ProtheusCustomer[]
  >(config.customersPath, {
    accessToken: params.accessToken,
    tokenType: params.tokenType,
    empresa: params.empresa,
    filial: params.filial,
    baseUrl: params.baseUrl,
    query: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 50,
      limit: params.pageSize ?? 50,
    },
  });

  return unwrapList(payload);
}

export async function fetchOrders(params: {
  accessToken: string;
  tokenType?: string;
  empresa: string;
  filial: string;
  baseUrl?: string;
  page?: number;
  pageSize?: number;
}) {
  const config = getProtheusConfig();
  const payload = await protheusFetch<
    ProtheusListResponse<ProtheusOrder> | ProtheusOrder[]
  >(config.ordersPath, {
    accessToken: params.accessToken,
    tokenType: params.tokenType,
    empresa: params.empresa,
    filial: params.filial,
    baseUrl: params.baseUrl,
    query: {
      page: params.page ?? 1,
      pageSize: params.pageSize ?? 50,
      limit: params.pageSize ?? 50,
    },
  });

  return unwrapList(payload);
}

export function customerCode(customer: ProtheusCustomer): string {
  return (
    customer.codigo ??
    customer.code ??
    customer.A1_COD ??
    ""
  ).trim();
}

export function customerName(customer: ProtheusCustomer): string {
  const name = (
    customer.nome ??
    customer.name ??
    customer.A1_NOME ??
    customer.nreduz ??
    customer.A1_NREDUZ ??
    ""
  ).trim();
  const code = customerCode(customer);
  return name || (code ? `Cliente ${code}` : "Cliente Protheus");
}

export function customerStore(customer: ProtheusCustomer): string | null {
  const value = (
    customer.loja ??
    customer.store ??
    customer.A1_LOJA ??
    ""
  ).trim();
  return value || null;
}

export function customerEmail(customer: ProtheusCustomer): string | null {
  const value = (customer.email ?? customer.A1_EMAIL ?? "").trim();
  return value || null;
}

export function customerPhone(customer: ProtheusCustomer): string | null {
  const value = (
    customer.telefone ??
    customer.phone ??
    customer.A1_TEL ??
    ""
  ).trim();
  return value || null;
}

export function customerDocument(customer: ProtheusCustomer): string | null {
  const value = (
    customer.cgc ??
    customer.document ??
    customer.A1_CGC ??
    ""
  ).trim();
  return value || null;
}

export function orderId(order: ProtheusOrder): string {
  return (
    order.id ??
    order.codigo ??
    order.number ??
    order.C5_NUM ??
    ""
  ).trim();
}

export function orderNumber(order: ProtheusOrder): string | null {
  const value = (order.number ?? order.C5_NUM ?? order.codigo ?? "").trim();
  return value || null;
}

export function orderStatus(order: ProtheusOrder): string {
  return (
    order.status ??
    order.C5_STATUS ??
    order.liberado ??
    "A"
  ).trim();
}

export function orderTotal(order: ProtheusOrder): number {
  const value = order.total ?? order.totalAmount ?? order.C5_TOTAL ?? 0;
  return typeof value === "number" ? value : Number(value) || 0;
}

export function orderDate(order: ProtheusOrder): Date {
  const raw = order.emissao ?? order.date ?? order.C5_EMISSAO;
  if (!raw) return new Date();

  // Protheus costuma enviar YYYYMMDD
  if (/^\d{8}$/.test(raw)) {
    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(4, 6)) - 1;
    const day = Number(raw.slice(6, 8));
    return new Date(year, month, day);
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function orderCustomerCode(order: ProtheusOrder): string | null {
  const value = (
    order.cliente ??
    order.customerCode ??
    order.C5_CLIENTE ??
    ""
  ).trim();
  return value || null;
}

export function orderCustomerName(order: ProtheusOrder): string | null {
  const value = (order.clienteNome ?? order.customerName ?? "").trim();
  return value || null;
}

export function orderFirstItem(order: ProtheusOrder) {
  const items = order.items ?? order.itens ?? [];
  const first = items[0];
  if (!first) return null;

  const title = (
    first.descricao ??
    first.description ??
    first.C6_DESCRI ??
    first.produto ??
    first.product ??
    first.C6_PRODUTO ??
    ""
  ).trim();

  const itemId = (
    first.produto ??
    first.product ??
    first.C6_PRODUTO ??
    ""
  ).trim();

  const quantity =
    first.quantidade ?? first.quantity ?? first.C6_QTDVEN ?? 1;

  return {
    title: title || null,
    itemId: itemId || null,
    quantity: typeof quantity === "number" ? quantity : Number(quantity) || 1,
  };
}

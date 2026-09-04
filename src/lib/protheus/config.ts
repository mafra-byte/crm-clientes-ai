export function isDemoMode() {
  return process.env.PROTHEUS_DEMO_MODE === "true";
}

export function getProtheusConfig() {
  const baseUrl = (process.env.PROTHEUS_BASE_URL ?? "").replace(/\/$/, "");
  const username = process.env.PROTHEUS_USERNAME ?? "";
  const password = process.env.PROTHEUS_PASSWORD ?? "";
  const clientId = process.env.PROTHEUS_CLIENT_ID ?? "";
  const clientSecret = process.env.PROTHEUS_CLIENT_SECRET ?? "";
  const empresa = process.env.PROTHEUS_EMPRESA ?? "99";
  const filial = process.env.PROTHEUS_FILIAL ?? "01";
  const tokenPath = process.env.PROTHEUS_TOKEN_PATH ?? "/api/oauth2/v1/token";
  const customersPath = process.env.PROTHEUS_CUSTOMERS_PATH ?? "/clientes";
  const ordersPath = process.env.PROTHEUS_ORDERS_PATH ?? "/pedidos";
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const demoMode = isDemoMode();

  return {
    baseUrl,
    username,
    password,
    clientId,
    clientSecret,
    empresa,
    filial,
    tokenPath,
    customersPath,
    ordersPath,
    appUrl,
    demoMode,
    isConfigured: demoMode || Boolean(baseUrl && username && password),
  };
}

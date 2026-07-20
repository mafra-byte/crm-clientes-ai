export function getMlConfig() {
  const appId = process.env.ML_APP_ID ?? "";
  const clientSecret = process.env.ML_CLIENT_SECRET ?? "";
  const redirectUri =
    process.env.ML_REDIRECT_URI ?? "http://localhost:3000/api/ml/callback";
  const authUrl =
    process.env.ML_AUTH_URL ??
    "https://auth.mercadolivre.com.br/authorization";
  const apiUrl = process.env.ML_API_URL ?? "https://api.mercadolibre.com";
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  return {
    appId,
    clientSecret,
    redirectUri,
    authUrl,
    apiUrl,
    appUrl,
    isConfigured: Boolean(appId && clientSecret),
  };
}

import { describe, expect, it } from "vitest";
import { buyerDisplayName, buildAuthorizationUrl } from "@/lib/ml/client";
import { formatMoney, statusLabel } from "@/lib/format";

describe("buyerDisplayName", () => {
  it("usa nome completo quando disponível", () => {
    expect(
      buyerDisplayName({
        id: 1,
        first_name: "Ana",
        last_name: "Silva",
        nickname: "aninha",
      }),
    ).toBe("Ana Silva");
  });

  it("cai para nickname e depois id", () => {
    expect(buyerDisplayName({ id: 99, nickname: "loja_x" })).toBe("loja_x");
    expect(buyerDisplayName({ id: 99 })).toBe("Comprador 99");
  });
});

describe("buildAuthorizationUrl", () => {
  it("monta URL de autorização do Brasil com state", () => {
    process.env.ML_APP_ID = "123456";
    process.env.ML_REDIRECT_URI = "http://localhost:3000/api/ml/callback";
    process.env.ML_AUTH_URL =
      "https://auth.mercadolivre.com.br/authorization";

    const url = new URL(buildAuthorizationUrl("abc123"));
    expect(url.origin).toBe("https://auth.mercadolivre.com.br");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBe("123456");
    expect(url.searchParams.get("state")).toBe("abc123");
  });
});

describe("format helpers", () => {
  it("formata BRL", () => {
    expect(formatMoney(10)).toContain("10");
  });

  it("traduz status conhecidos", () => {
    expect(statusLabel("paid")).toBe("Pago");
    expect(statusLabel("custom")).toBe("custom");
  });
});

import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  validatePortalLogin,
  verifySessionToken,
} from "@/lib/portal-auth";

describe("portal auth", () => {
  it("aceita credenciais padrão do portal", () => {
    expect(validatePortalLogin("Admin", "Protheus.123")).toBe(true);
    expect(validatePortalLogin("Admin", "errada")).toBe(false);
  });

  it("cria e valida token de sessão", () => {
    const token = createSessionToken("Admin");
    const session = verifySessionToken(token);
    expect(session?.username).toBe("Admin");
    expect(verifySessionToken("token.falso")).toBeNull();
  });
});

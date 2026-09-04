import { describe, expect, it } from "vitest";
import {
  buildBasicAuthHeader,
  customerCode,
  customerName,
  orderDate,
  orderId,
  orderTotal,
  unwrapList,
} from "@/lib/protheus/client";
import { formatMoney, statusLabel } from "@/lib/format";

describe("customer helpers", () => {
  it("lê código e nome nos formatos comuns do Protheus", () => {
    expect(customerCode({ A1_COD: "000123", A1_NOME: "ACME LTDA" })).toBe(
      "000123",
    );
    expect(customerName({ A1_COD: "000123", A1_NOME: "ACME LTDA" })).toBe(
      "ACME LTDA",
    );
    expect(customerName({ codigo: "9" })).toBe("Cliente 9");
  });
});

describe("order helpers", () => {
  it("normaliza id, total e data YYYYMMDD", () => {
    expect(orderId({ C5_NUM: "000001" })).toBe("000001");
    expect(orderTotal({ C5_TOTAL: 150.5 })).toBe(150.5);

    const date = orderDate({ C5_EMISSAO: "20260720" });
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(20);
  });
});

describe("unwrapList", () => {
  it("aceita array direto ou envelopes items/data/content", () => {
    expect(unwrapList([{ a: 1 }])).toEqual([{ a: 1 }]);
    expect(unwrapList({ items: [{ a: 2 }] })).toEqual([{ a: 2 }]);
    expect(unwrapList({ data: [{ a: 3 }] })).toEqual([{ a: 3 }]);
    expect(unwrapList({ content: [{ a: 4 }] })).toEqual([{ a: 4 }]);
  });
});

describe("buildBasicAuthHeader", () => {
  it("gera Basic auth em base64", () => {
    expect(buildBasicAuthHeader("id", "secret")).toBe(
      `Basic ${Buffer.from("id:secret").toString("base64")}`,
    );
  });
});

describe("format helpers", () => {
  it("formata BRL e status Protheus", () => {
    expect(formatMoney(10)).toContain("10");
    expect(statusLabel("F")).toBe("Faturado");
    expect(statusLabel("custom")).toBe("custom");
  });
});

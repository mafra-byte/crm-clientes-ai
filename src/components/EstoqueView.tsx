"use client";

import { useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

type Line = {
  id: string;
  productCode: string;
  description: string;
  warehouse: string;
  quantity: number;
  unit: string | null;
  unitCost: number;
  totalValue: number;
  reserved: number;
  available: number;
  purchasedQty: number;
};

export function EstoqueView() {
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");
  const [totals, setTotals] = useState({ items: 0, quantity: 0, value: 0 });

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const endpoint = `/api/stock/live${q ? `?q=${encodeURIComponent(q)}` : ""}`;
        const res = await fetch(endpoint, { signal });
        const data = await res.json();
        if (!res.ok) {
          setLines([]);
          setError(data.error || "Falha ao carregar estoque");
          setMeta("");
          return;
        }
        setLines(data.lines ?? []);
        setTotals(
          data.totals ?? {
            items: (data.lines ?? []).length,
            quantity: 0,
            value: 0,
          },
        );
        setMeta(
          `Protheus SB2 · empresa ${data.empresa ?? "99"} / filial ${data.filial ?? "01"}`,
        );
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    },
    [q],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void load(controller.signal);
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
            Estoque
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Saldo atual (SB2) dos produtos recebidos nas notas de entrada.
          </p>
          {meta ? (
            <p className="mt-1 text-xs text-[var(--accent)]">{meta}</p>
          ) : null}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar produto ou armazém…"
          className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm md:max-w-sm"
        />
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--line)] bg-white/80 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Itens
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">
            {totals.items}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-white/80 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Quantidade
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">
            {totals.quantity.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-white/80 px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Valor em estoque
          </p>
          <p className="mt-1 text-2xl font-semibold text-[var(--ink)]">
            {formatMoney(totals.value)}
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white/90">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f3f7fb] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Produto</th>
              <th className="px-4 py-3 font-semibold">Armazém</th>
              <th className="px-4 py-3 font-semibold">Saldo</th>
              <th className="px-4 py-3 font-semibold">Disponível</th>
              <th className="px-4 py-3 font-semibold">Comprado (NF)</th>
              <th className="px-4 py-3 font-semibold">Custo méd.</th>
              <th className="px-4 py-3 font-semibold">Valor</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-[var(--muted)]">
                  Carregando…
                </td>
              </tr>
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-[var(--muted)]">
                  Nenhum saldo em sb2990. Faça um recebimento ou rode o seed
                  SB2.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr
                  key={line.id}
                  className="border-t border-[var(--line)] align-top"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{line.description}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {line.productCode}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {line.warehouse}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {line.quantity} {line.unit ?? ""}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {line.available} {line.unit ?? ""}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {line.purchasedQty} {line.unit ?? ""}
                  </td>
                  <td className="px-4 py-3">{formatMoney(line.unitCost)}</td>
                  <td className="px-4 py-3 font-medium">
                    {formatMoney(line.totalValue)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

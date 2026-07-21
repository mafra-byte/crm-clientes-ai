"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

type Line = {
  id: string;
  document: string;
  series: string;
  item: string;
  productCode: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  total: number;
  supplierCode: string;
  supplierStore: string;
  purchaseOrderNumber: string | null;
  purchaseOrderItem: string | null;
  emission: string | null;
};

type OrderOption = {
  number: string;
  item: string;
  productCode: string;
  description: string;
  quantity: number;
  quantityDelivered: number;
  balance: number;
  unitPrice: number;
  supplierCode: string;
  supplierStore: string;
};

type FormState = {
  orderKey: string;
  quantity: string;
  document: string;
  series: string;
};

const emptyForm: FormState = {
  orderKey: "",
  quantity: "",
  document: "",
  series: "1",
};

export function RecebimentoView() {
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [orders, setOrders] = useState<OrderOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const endpoint = `/api/purchase-receipts/live${q ? `?q=${encodeURIComponent(q)}` : ""}`;
        const res = await fetch(endpoint, { signal });
        const data = await res.json();
        if (!res.ok) {
          setLines([]);
          setError(data.error || "Falha ao carregar recebimentos");
          setMeta("");
          return;
        }
        setLines(data.lines ?? []);
        setMeta(
          `Protheus SF1/SD1 · empresa ${data.empresa ?? "99"} / filial ${data.filial ?? "01"}`,
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
  }, [load, reloadKey]);

  useEffect(() => {
    fetch("/api/purchase-orders/live")
      .then((r) => r.json())
      .then((data) => {
        const open = (data.lines ?? [])
          .map(
            (l: {
              number: string;
              item: string;
              productCode: string;
              description: string;
              quantity: number;
              quantityDelivered?: number;
              unitPrice: number;
              supplierCode: string;
              supplierStore: string;
            }) => {
              const delivered = Number(l.quantityDelivered ?? 0) || 0;
              const quantity = Number(l.quantity ?? 0) || 0;
              return {
                number: l.number,
                item: l.item,
                productCode: l.productCode,
                description: l.description,
                quantity,
                quantityDelivered: delivered,
                balance: Math.max(quantity - delivered, 0),
                unitPrice: l.unitPrice,
                supplierCode: l.supplierCode,
                supplierStore: l.supplierStore,
              };
            },
          )
          .filter((o: OrderOption) => o.balance > 0);
        setOrders(open);
      })
      .catch(() => {
        /* optional */
      });
  }, [reloadKey]);

  function onOrderChange(value: string) {
    if (!value) {
      setForm({ ...form, orderKey: "", quantity: "" });
      return;
    }
    const order = orders.find((o) => `${o.number}|${o.item}` === value);
    setForm({
      ...form,
      orderKey: value,
      quantity: order ? String(order.balance) : "",
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const [purchaseOrderNumber, purchaseOrderItem] = form.orderKey.split("|");
    if (!purchaseOrderNumber || !purchaseOrderItem) {
      setSaveMsg("Selecione um pedido de compra com saldo.");
      return;
    }

    setSaving(true);
    setSaveMsg("");
    try {
      const res = await fetch("/api/purchase-receipts/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderNumber,
          purchaseOrderItem,
          quantity: Number(form.quantity),
          document: form.document.trim() || undefined,
          series: form.series.trim() || "1",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMsg(data.error || "Falha ao gravar recebimento");
        return;
      }
      setSaveMsg(
        `NF ${data.line?.document}/${data.line?.series} gravada · ${data.line?.quantity} un.`,
      );
      setForm(emptyForm);
      setShowForm(false);
      setReloadKey((k) => k + 1);
    } catch {
      setSaveMsg("Erro de rede ao gravar recebimento");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)]">
            Recebimento
          </h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            NF de entrada SF1/SD1 a partir do pedido de compras SC7
          </p>
          {meta ? (
            <p className="mt-1 text-xs text-[var(--muted)]">{meta}</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar doc, produto, PC…"
            className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white"
          >
            {showForm ? "Fechar" : "Novo recebimento"}
          </button>
        </div>
      </div>

      {showForm ? (
        <form
          onSubmit={onSubmit}
          className="grid gap-3 rounded-xl border border-[var(--line)] bg-white/80 p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-[var(--muted)]">Pedido SC7 (saldo)</span>
            <select
              value={form.orderKey}
              onChange={(e) => onOrderChange(e.target.value)}
              className="w-full rounded-lg border border-[var(--line)] px-3 py-2"
              required
            >
              <option value="">Selecione…</option>
              {orders.map((o) => (
                <option
                  key={`${o.number}-${o.item}`}
                  value={`${o.number}|${o.item}`}
                >
                  {o.number}/{o.item} · {o.productCode} · saldo {o.balance} ·{" "}
                  {o.supplierCode}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[var(--muted)]">Qtd. recebida</span>
            <input
              type="number"
              min="0.0001"
              step="any"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] px-3 py-2"
              required
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[var(--muted)]">Série</span>
            <input
              value={form.series}
              onChange={(e) => setForm({ ...form, series: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-[var(--muted)]">Nº documento (opcional)</span>
            <input
              value={form.document}
              onChange={(e) => setForm({ ...form, document: e.target.value })}
              placeholder="Gera automático se vazio"
              className="w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <div className="flex items-end gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Gravando…" : "Confirmar recebimento"}
            </button>
            {saveMsg ? (
              <p className="text-sm text-[var(--muted)]">{saveMsg}</p>
            ) : null}
          </div>
        </form>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white/80">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--line)] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-3 py-2">Doc/Série</th>
              <th className="px-3 py-2">Emissão</th>
              <th className="px-3 py-2">Fornecedor</th>
              <th className="px-3 py-2">Produto</th>
              <th className="px-3 py-2">Qtd</th>
              <th className="px-3 py-2">PC</th>
              <th className="px-3 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-[var(--muted)]">
                  Carregando…
                </td>
              </tr>
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-[var(--muted)]">
                  Nenhum recebimento em sf1990/sd1990.
                </td>
              </tr>
            ) : (
              lines.map((r) => (
                <tr key={r.id} className="border-t border-[var(--line)]">
                  <td className="px-3 py-2 font-medium">
                    {r.document}/{r.series}
                  </td>
                  <td className="px-3 py-2 text-[var(--muted)]">
                    {r.emission || "—"}
                  </td>
                  <td className="px-3 py-2">
                    {r.supplierCode}/{r.supplierStore}
                  </td>
                  <td className="px-3 py-2">{r.productCode}</td>
                  <td className="px-3 py-2">
                    {r.quantity} {r.unit || ""}
                  </td>
                  <td className="px-3 py-2 text-[var(--muted)]">
                    {r.purchaseOrderNumber
                      ? `${r.purchaseOrderNumber}/${r.purchaseOrderItem}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">{formatMoney(r.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

type Line = {
  id: string;
  number: string;
  item: string;
  productCode: string;
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  total: number;
  warehouse: string | null;
  requester: string | null;
  notes: string | null;
  emission: string | null;
  needDate: string | null;
  approved: string | null;
  quoteNumber: string | null;
  purchaseOrderNumber: string | null;
  closed: boolean;
};

type ProductOption = {
  code: string;
  description: string;
  unit: string | null;
  price: number;
};

type FormState = {
  productCode: string;
  quantity: string;
  unitPrice: string;
  requester: string;
  notes: string;
  needDate: string;
};

const emptyForm: FormState = {
  productCode: "",
  quantity: "1",
  unitPrice: "",
  requester: "Admin",
  notes: "",
  needDate: "",
};

export function SolicitacoesCompraView() {
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
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
        const endpoint = `/api/purchase-requests/live${q ? `?q=${encodeURIComponent(q)}` : ""}`;
        const res = await fetch(endpoint, { signal });
        const data = await res.json();
        if (!res.ok) {
          setLines([]);
          setError(data.error || "Falha ao carregar solicitações");
          setMeta("");
          return;
        }
        setLines(data.lines ?? []);
        setMeta(
          `Protheus SC1 · empresa ${data.empresa ?? "99"} / filial ${data.filial ?? "01"}`,
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
    fetch("/api/products/live")
      .then((res) => res.json())
      .then((data) => {
        const rows = (data.products ?? []) as Array<{
          code: string;
          description: string;
          unit: string | null;
          price: number;
        }>;
        setProducts(
          rows.map((p) => ({
            code: p.code,
            description: p.description,
            unit: p.unit,
            price: p.price,
          })),
        );
      })
      .catch(() => setProducts([]));
  }, []);

  function onProductChange(code: string) {
    const product = products.find((p) => p.code === code);
    setForm({
      ...form,
      productCode: code,
      unitPrice:
        product && product.price
          ? String(product.price)
          : form.unitPrice,
    });
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveMsg("");
    setError("");
    try {
      const res = await fetch("/api/purchase-requests/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: form.productCode,
          quantity: Number(form.quantity),
          unitPrice:
            form.unitPrice === "" ? undefined : Number(form.unitPrice),
          requester: form.requester,
          notes: form.notes,
          needDate: form.needDate || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha ao gravar solicitação");
        return;
      }
      setSaveMsg(
        `SC ${data.line.number} item ${data.line.item} gravada no Protheus.`,
      );
      setForm(emptyForm);
      setShowForm(false);
      setReloadKey((n) => n + 1);
    } catch {
      setError("Não foi possível gravar a solicitação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
            Solicitação de compras
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Cadastro SC1 gravado no Protheus (empresa 99).
          </p>
          {meta ? (
            <p className="mt-1 text-xs text-[var(--accent)]">{meta}</p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 md:max-w-md">
          <button
            type="button"
            onClick={() => {
              setShowForm((v) => !v);
              setSaveMsg("");
              setError("");
            }}
            className="self-start rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            {showForm ? "Fechar" : "Nova solicitação"}
          </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por SC, produto, solicitante…"
            className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
          />
        </div>
      </section>

      {showForm ? (
        <form
          onSubmit={onCreate}
          className="space-y-4 rounded-xl border border-[var(--line)] bg-white/90 p-5"
        >
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            Nova solicitação
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Gera número de SC automaticamente e grava o item na tabela SC1.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Produto *</span>
              <select
                required
                value={form.productCode}
                onChange={(e) => onProductChange(e.target.value)}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              >
                <option value="">Selecione…</option>
                {products.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.description}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Quantidade *</span>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Preço estimado</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Solicitante</span>
              <input
                value={form.requester}
                onChange={(e) => setForm({ ...form, requester: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Necessidade</span>
              <input
                type="date"
                value={form.needDate}
                onChange={(e) => setForm({ ...form, needDate: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Observação</span>
              <input
                value={form.notes}
                maxLength={30}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Gravando…" : "Gravar no Protheus"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {saveMsg ? (
        <p className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          {saveMsg}
        </p>
      ) : null}

      {error ? (
        <p className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white/90">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f3f7fb] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">SC</th>
              <th className="px-4 py-3 font-semibold">Produto</th>
              <th className="px-4 py-3 font-semibold">Qtd</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Solicitante</th>
              <th className="px-4 py-3 font-semibold">Necessidade</th>
              <th className="px-4 py-3 font-semibold">Status</th>
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
                  Nenhuma solicitação encontrada.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr
                  key={line.id}
                  className="border-t border-[var(--line)] align-top"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {line.number}/{line.item}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {line.emission ?? "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{line.description}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {line.productCode}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {line.quantity} {line.unit ?? ""}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatMoney(line.total)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {line.requester ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {line.needDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {line.closed
                      ? line.purchaseOrderNumber
                        ? `Fechada · PC ${line.purchaseOrderNumber}`
                        : `Fechada · Cot. ${line.quoteNumber}`
                      : "Aberta"}
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

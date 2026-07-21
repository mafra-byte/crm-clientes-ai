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
  quantityDelivered?: number;
  unit: string | null;
  unitPrice: number;
  total: number;
  supplierCode: string;
  supplierStore: string;
  purchaseRequestNumber: string | null;
  quoteNumber: string | null;
  tes?: string | null;
  emission: string | null;
  needDate: string | null;
  notes?: string | null;
  closed?: boolean;
};

type ProductOption = {
  code: string;
  description: string;
  entryTes: string | null;
};
type SupplierOption = { code: string; store: string; name: string };
type QuoteOption = {
  number: string;
  item: string;
  proposal: string;
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  supplierCode: string;
  purchaseRequestNumber: string | null;
  purchaseRequestItem: string | null;
  closed?: boolean;
};

type FormState = {
  productCode: string;
  supplierCode: string;
  quantity: string;
  unitPrice: string;
  purchaseRequestNumber: string;
  purchaseRequestItem: string;
  quoteNumber: string;
  quoteItem: string;
  quoteProposal: string;
  quoteKey: string;
  notes: string;
  tes: string;
  needDate: string;
};

const emptyForm: FormState = {
  productCode: "",
  supplierCode: "",
  quantity: "1",
  unitPrice: "",
  purchaseRequestNumber: "",
  purchaseRequestItem: "",
  quoteNumber: "",
  quoteItem: "",
  quoteProposal: "",
  quoteKey: "",
  notes: "",
  tes: "001",
  needDate: "",
};

export function PedidosCompraView() {
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [tesList, setTesList] = useState<
    { code: string; text: string; cfop: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const endpoint = `/api/purchase-orders/live${q ? `?q=${encodeURIComponent(q)}` : ""}`;
        const res = await fetch(endpoint, { signal });
        const data = await res.json();
        if (!res.ok) {
          setLines([]);
          setError(data.error || "Falha ao carregar pedidos");
          setMeta("");
          return;
        }
        setLines(data.lines ?? []);
        setMeta(
          `Protheus SC7 · empresa ${data.empresa ?? "99"} / filial ${data.filial ?? "01"}`,
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
    Promise.all([
      fetch("/api/products/live").then((r) => r.json()),
      fetch("/api/suppliers/live").then((r) => r.json()),
      fetch("/api/purchase-quotes/live").then((r) => r.json()),
      fetch("/api/tes/live?entry=1").then((r) => r.json()),
    ])
      .then(([productsData, suppliersData, quotesData, tesData]) => {
        setProducts(
          (productsData.products ?? []).map(
            (p: {
              code: string;
              description: string;
              entryTes?: string | null;
            }) => ({
              code: p.code,
              description: p.description,
              entryTes: p.entryTes || null,
            }),
          ),
        );
        setSuppliers(
          (suppliersData.suppliers ?? []).map(
            (s: {
              protheusCode: string;
              store: string | null;
              name: string;
            }) => ({
              code: s.protheusCode,
              store: s.store || "01",
              name: s.name,
            }),
          ),
        );
        setQuotes(
          (quotesData.lines ?? [])
            .filter((l: { closed?: boolean }) => !l.closed)
            .map(
              (l: {
                number: string;
                item: string;
                proposal: string;
                productCode: string;
                description: string;
                quantity: number;
                unitPrice: number;
                supplierCode: string;
                purchaseRequestNumber: string | null;
                purchaseRequestItem: string | null;
              }) => ({
                number: l.number,
                item: l.item,
                proposal: l.proposal,
                productCode: l.productCode,
                description: l.description,
                quantity: l.quantity,
                unitPrice: l.unitPrice,
                supplierCode: l.supplierCode,
                purchaseRequestNumber: l.purchaseRequestNumber,
                purchaseRequestItem: l.purchaseRequestItem,
              }),
            ),
        );
        setTesList(
          (tesData.lines ?? []).map(
            (t: { code: string; text: string; cfop: string }) => ({
              code: t.code,
              text: t.text,
              cfop: t.cfop,
            }),
          ),
        );
      })
      .catch(() => {
        /* optional */
      });
  }, [reloadKey]);

  function onQuoteChange(value: string) {
    if (!value) {
      setForm({
        ...form,
        quoteNumber: "",
        quoteItem: "",
        quoteProposal: "",
        quoteKey: "",
      });
      return;
    }
    const [number, item, proposal] = value.split("|");
    const quote = quotes.find(
      (qItem) =>
        qItem.number === number &&
        qItem.item === item &&
        qItem.proposal === proposal,
    );
    if (!quote) return;
    const product = products.find((p) => p.code === quote.productCode);
    setForm({
      ...form,
      quoteKey: value,
      quoteNumber: quote.number,
      quoteItem: quote.item,
      quoteProposal: quote.proposal,
      productCode: quote.productCode,
      supplierCode: quote.supplierCode,
      quantity: String(quote.quantity || 1),
      unitPrice: String(quote.unitPrice || ""),
      purchaseRequestNumber: quote.purchaseRequestNumber || "",
      purchaseRequestItem: quote.purchaseRequestItem || "",
      tes: product?.entryTes || form.tes || "001",
    });
  }

  function openCreate() {
    setEditingKey(null);
    setForm(emptyForm);
    setShowForm(true);
    setSaveMsg("");
    setError("");
  }

  function startEdit(line: Line) {
    if (line.closed) return;
    setEditingKey(`${line.number}|${line.item}`);
    setForm({
      productCode: line.productCode,
      supplierCode: line.supplierCode,
      quantity: String(line.quantity || 1),
      unitPrice: String(line.unitPrice || ""),
      purchaseRequestNumber: line.purchaseRequestNumber || "",
      purchaseRequestItem: "",
      quoteNumber: line.quoteNumber || "",
      quoteItem: "",
      quoteProposal: "",
      quoteKey: "",
      notes: line.notes ?? "",
      tes: line.tes || "001",
      needDate: line.needDate ?? "",
    });
    setShowForm(true);
    setSaveMsg("");
    setError("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveMsg("");
    setError("");
    try {
      const supplier = suppliers.find((s) => s.code === form.supplierCode);
      const [number, item] = editingKey ? editingKey.split("|") : ["", ""];
      const res = await fetch("/api/purchase-orders/live", {
        method: editingKey ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editingKey
            ? {
                number,
                item,
                quantity: Number(form.quantity),
                unitPrice: Number(form.unitPrice),
                tes: form.tes || undefined,
                notes: form.notes || undefined,
                needDate: form.needDate || undefined,
              }
            : {
                productCode: form.productCode,
                supplierCode: form.supplierCode,
                supplierStore: supplier?.store || "01",
                quantity: Number(form.quantity),
                unitPrice: Number(form.unitPrice),
                purchaseRequestNumber: form.purchaseRequestNumber || undefined,
                purchaseRequestItem: form.purchaseRequestItem || undefined,
                quoteNumber: form.quoteNumber || undefined,
                quoteItem: form.quoteItem || undefined,
                quoteProposal: form.quoteProposal || undefined,
                tes: form.tes || undefined,
                notes: form.notes || undefined,
              },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha ao gravar pedido");
        return;
      }
      setSaveMsg(
        editingKey
          ? `Pedido ${data.line.number} item ${data.line.item} atualizado no Protheus.`
          : `Pedido ${data.line.number} item ${data.line.item} gravado no Protheus.`,
      );
      setForm(emptyForm);
      setEditingKey(null);
      setShowForm(false);
      setReloadKey((n) => n + 1);
    } catch {
      setError("Não foi possível gravar o pedido.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
            Pedido de compras
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Cadastro SC7 gravado no Protheus (empresa 99).
          </p>
          {meta ? (
            <p className="mt-1 text-xs text-[var(--accent)]">{meta}</p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 md:max-w-md">
          <button
            type="button"
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                setEditingKey(null);
                setForm(emptyForm);
              } else {
                openCreate();
              }
            }}
            className="self-start rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            {showForm ? "Fechar" : "Novo pedido"}
          </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por PC, produto, fornecedor…"
            className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
          />
        </div>
      </section>

      {showForm ? (
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-xl border border-[var(--line)] bg-white/90 p-5"
        >
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            {editingKey
              ? `Editar pedido ${editingKey.replace("|", "/")}`
              : "Novo pedido"}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {editingKey
              ? "Atualiza quantidade, preço e TES do pedido aberto."
              : "Gera número de PC automaticamente. Pode partir de uma cotação."}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {!editingKey ? (
              <label className="text-sm md:col-span-2">
                <span className="mb-1 block text-[var(--muted)]">
                  Origem (cotação — opcional)
                </span>
                <select
                  value={form.quoteKey}
                  onChange={(e) => onQuoteChange(e.target.value)}
                  className="w-full rounded-md border border-[var(--line)] px-3 py-2"
                >
                  <option value="">Sem vínculo com cotação</option>
                  {quotes.map((quote) => (
                    <option
                      key={`${quote.number}-${quote.item}-${quote.proposal}`}
                      value={`${quote.number}|${quote.item}|${quote.proposal}`}
                    >
                      Cot {quote.number}/{quote.item} P{quote.proposal} —{" "}
                      {quote.productCode} · {quote.supplierCode}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Produto *</span>
              <select
                required
                value={form.productCode}
                disabled={Boolean(editingKey)}
                onChange={(e) => {
                  const code = e.target.value;
                  const product = products.find((p) => p.code === code);
                  setForm({
                    ...form,
                    productCode: code,
                    tes: product?.entryTes || form.tes || "001",
                  });
                }}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2 disabled:bg-[#f3f7fb]"
              >
                <option value="">Selecione…</option>
                {products.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.description}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Fornecedor *</span>
              <select
                required
                value={form.supplierCode}
                disabled={Boolean(editingKey)}
                onChange={(e) =>
                  setForm({ ...form, supplierCode: e.target.value })
                }
                className="w-full rounded-md border border-[var(--line)] px-3 py-2 disabled:bg-[#f3f7fb]"
              >
                <option value="">Selecione…</option>
                {suppliers.map((s) => (
                  <option key={`${s.code}-${s.store}`} value={s.code}>
                    {s.code}/{s.store} — {s.name}
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
              <span className="mb-1 block text-[var(--muted)]">Preço unitário *</span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.unitPrice}
                onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">
                TES entrada (C7_TES / SF4)
              </span>
              <select
                value={form.tes}
                onChange={(e) => setForm({ ...form, tes: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              >
                {tesList.length === 0 ? (
                  <option value="001">001</option>
                ) : (
                  tesList.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.code} · {t.text} · CFOP {t.cfop}
                    </option>
                  ))
                )}
              </select>
            </label>
            {editingKey ? (
              <label className="text-sm">
                <span className="mb-1 block text-[var(--muted)]">Necessidade</span>
                <input
                  type="date"
                  value={form.needDate}
                  onChange={(e) =>
                    setForm({ ...form, needDate: e.target.value })
                  }
                  className="w-full rounded-md border border-[var(--line)] px-3 py-2"
                />
              </label>
            ) : null}
            <label
              className={`text-sm ${editingKey ? "" : "md:col-span-2"}`}
            >
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
              onClick={() => {
                setShowForm(false);
                setEditingKey(null);
                setForm(emptyForm);
              }}
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
              <th className="px-4 py-3 font-semibold">Pedido</th>
              <th className="px-4 py-3 font-semibold">Produto</th>
              <th className="px-4 py-3 font-semibold">Fornecedor</th>
              <th className="px-4 py-3 font-semibold">Qtd</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Entrega</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-[var(--muted)]">
                  Carregando…
                </td>
              </tr>
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-[var(--muted)]">
                  Nenhum pedido encontrado.
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
                      {line.quoteNumber ? `Cot ${line.quoteNumber}` : "Sem cotação"}
                      {line.purchaseRequestNumber
                        ? ` · SC ${line.purchaseRequestNumber}`
                        : ""}
                      {line.tes ? ` · TES ${line.tes}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{line.description}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {line.productCode}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {line.supplierCode}/{line.supplierStore}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {line.quantity} {line.unit ?? ""}
                    {line.quantityDelivered
                      ? ` · ent. ${line.quantityDelivered}`
                      : ""}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatMoney(line.total)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {line.needDate ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {line.closed ? "Baixado" : "Aberto"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!line.closed ? (
                      <button
                        type="button"
                        onClick={() => startEdit(line)}
                        className="text-xs font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                      >
                        Editar
                      </button>
                    ) : null}
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

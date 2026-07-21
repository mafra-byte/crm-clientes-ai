"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

type Line = {
  id: string;
  number: string;
  item: string;
  proposal: string;
  productCode: string;
  description: string;
  quantity: number;
  unit: string | null;
  unitPrice: number;
  total: number;
  supplierCode: string;
  supplierStore: string;
  supplierName: string;
  purchaseRequestNumber: string | null;
  emission: string | null;
  validUntil: string | null;
  deliveryDays: number;
};

type ProductOption = { code: string; description: string; unit: string | null };
type SupplierOption = { code: string; store: string; name: string };
type ScOption = {
  number: string;
  item: string;
  productCode: string;
  description: string;
  quantity: number;
};

type FormState = {
  productCode: string;
  supplierCode: string;
  quantity: string;
  unitPrice: string;
  purchaseRequestNumber: string;
  purchaseRequestItem: string;
  deliveryDays: string;
  notes: string;
};

const emptyForm: FormState = {
  productCode: "",
  supplierCode: "",
  quantity: "1",
  unitPrice: "",
  purchaseRequestNumber: "",
  purchaseRequestItem: "",
  deliveryDays: "7",
  notes: "",
};

export function CotacoesCompraView() {
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [scs, setScs] = useState<ScOption[]>([]);
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
        const endpoint = `/api/purchase-quotes/live${q ? `?q=${encodeURIComponent(q)}` : ""}`;
        const res = await fetch(endpoint, { signal });
        const data = await res.json();
        if (!res.ok) {
          setLines([]);
          setError(data.error || "Falha ao carregar cotações");
          setMeta("");
          return;
        }
        setLines(data.lines ?? []);
        setMeta(
          `Protheus SC8 · empresa ${data.empresa ?? "99"} / filial ${data.filial ?? "01"}`,
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
      fetch("/api/purchase-requests/live").then((r) => r.json()),
    ])
      .then(([productsData, suppliersData, scData]) => {
        setProducts(
          (productsData.products ?? []).map(
            (p: { code: string; description: string; unit: string | null }) => ({
              code: p.code,
              description: p.description,
              unit: p.unit,
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
        setScs(
          (scData.lines ?? []).map(
            (l: {
              number: string;
              item: string;
              productCode: string;
              description: string;
              quantity: number;
            }) => ({
              number: l.number,
              item: l.item,
              productCode: l.productCode,
              description: l.description,
              quantity: l.quantity,
            }),
          ),
        );
      })
      .catch(() => {
        /* optional helpers */
      });
  }, []);

  function onScChange(value: string) {
    if (!value) {
      setForm({
        ...form,
        purchaseRequestNumber: "",
        purchaseRequestItem: "",
      });
      return;
    }
    const [number, item] = value.split("|");
    const sc = scs.find((s) => s.number === number && s.item === item);
    if (!sc) return;
    setForm({
      ...form,
      purchaseRequestNumber: sc.number,
      purchaseRequestItem: sc.item,
      productCode: sc.productCode,
      quantity: String(sc.quantity || 1),
    });
  }

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveMsg("");
    setError("");
    try {
      const supplier = suppliers.find((s) => s.code === form.supplierCode);
      const res = await fetch("/api/purchase-quotes/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productCode: form.productCode,
          supplierCode: form.supplierCode,
          supplierStore: supplier?.store || "01",
          quantity: Number(form.quantity),
          unitPrice: Number(form.unitPrice),
          purchaseRequestNumber: form.purchaseRequestNumber || undefined,
          purchaseRequestItem: form.purchaseRequestItem || undefined,
          deliveryDays:
            form.deliveryDays === "" ? undefined : Number(form.deliveryDays),
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha ao gravar cotação");
        return;
      }
      setSaveMsg(
        `Cotação ${data.line.number} item ${data.line.item} / proposta ${data.line.proposal} gravada.`,
      );
      setForm(emptyForm);
      setShowForm(false);
      setReloadKey((n) => n + 1);
    } catch {
      setError("Não foi possível gravar a cotação.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
            Cotação de compras
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Cadastro SC8 gravado no Protheus (empresa 99).
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
            {showForm ? "Fechar" : "Nova cotação"}
          </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por cotação, produto, fornecedor…"
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
            Nova cotação
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Gera número de cotação e grava proposta do fornecedor na SC8.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">
                Origem (SC — opcional)
              </span>
              <select
                value={
                  form.purchaseRequestNumber
                    ? `${form.purchaseRequestNumber}|${form.purchaseRequestItem}`
                    : ""
                }
                onChange={(e) => onScChange(e.target.value)}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              >
                <option value="">Sem vínculo com SC</option>
                {scs.map((sc) => (
                  <option
                    key={`${sc.number}-${sc.item}`}
                    value={`${sc.number}|${sc.item}`}
                  >
                    SC {sc.number}/{sc.item} — {sc.productCode} · {sc.description}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Produto *</span>
              <select
                required
                value={form.productCode}
                onChange={(e) =>
                  setForm({ ...form, productCode: e.target.value })
                }
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
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Fornecedor *</span>
              <select
                required
                value={form.supplierCode}
                onChange={(e) =>
                  setForm({ ...form, supplierCode: e.target.value })
                }
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
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
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Prazo entrega (dias)</span>
              <input
                type="number"
                min="0"
                value={form.deliveryDays}
                onChange={(e) =>
                  setForm({ ...form, deliveryDays: e.target.value })
                }
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Observação</span>
              <input
                value={form.notes}
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
              <th className="px-4 py-3 font-semibold">Cotação</th>
              <th className="px-4 py-3 font-semibold">Produto</th>
              <th className="px-4 py-3 font-semibold">Fornecedor</th>
              <th className="px-4 py-3 font-semibold">Qtd</th>
              <th className="px-4 py-3 font-semibold">Preço</th>
              <th className="px-4 py-3 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[var(--muted)]">
                  Carregando…
                </td>
              </tr>
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[var(--muted)]">
                  Nenhuma cotação encontrada.
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
                      {line.number}/{line.item} · P{line.proposal}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {line.purchaseRequestNumber
                        ? `SC ${line.purchaseRequestNumber}`
                        : "Sem SC"}
                      {line.validUntil ? ` · val. ${line.validUntil}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{line.description}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {line.productCode}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{line.supplierName}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {line.supplierCode}/{line.supplierStore}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {line.quantity} {line.unit ?? ""}
                  </td>
                  <td className="px-4 py-3">{formatMoney(line.unitPrice)}</td>
                  <td className="px-4 py-3 font-medium">
                    {formatMoney(line.total)}
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

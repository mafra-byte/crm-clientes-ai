"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

type Product = {
  id: string;
  code: string;
  description: string;
  type: string | null;
  unit: string | null;
  warehouse: string | null;
  group: string | null;
  price: number;
  entryTes: string | null;
  exitTes: string | null;
  source: string;
};

type TesOption = { code: string; text: string; cfop: string };

type FormState = {
  code: string;
  description: string;
  type: string;
  unit: string;
  warehouse: string;
  group: string;
  price: string;
  entryTes: string;
};

const emptyForm: FormState = {
  code: "",
  description: "",
  type: "PA",
  unit: "UN",
  warehouse: "01",
  group: "0001",
  price: "",
  entryTes: "001",
};

export function ProdutosView() {
  const [q, setQ] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [tesList, setTesList] = useState<TesOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const endpoint = `/api/products/live${q ? `?q=${encodeURIComponent(q)}` : ""}`;
        const res = await fetch(endpoint, { signal });
        const data = await res.json();
        if (!res.ok) {
          setProducts([]);
          setError(data.error || "Falha ao carregar produtos");
          setMeta("");
          return;
        }
        setProducts(data.products ?? []);
        setMeta(
          `Protheus SB1 · empresa ${data.empresa ?? "99"} / filial ${data.filial ?? "01"}`,
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
    fetch("/api/tes/live?entry=1")
      .then((r) => r.json())
      .then((data) => {
        setTesList(
          (data.lines ?? []).map(
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

  function openCreate() {
    setEditingKey(null);
    setForm(emptyForm);
    setShowForm(true);
    setSaveMsg("");
    setError("");
  }

  function startEdit(item: Product) {
    setEditingKey(item.code);
    setForm({
      code: item.code,
      description: item.description ?? "",
      type: item.type ?? "PA",
      unit: item.unit ?? "UN",
      warehouse: item.warehouse ?? "01",
      group: item.group ?? "0001",
      price: item.price ? String(item.price) : "",
      entryTes: item.entryTes ?? "001",
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
      const res = await fetch("/api/products/live", {
        method: editingKey ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          code: editingKey || form.code || undefined,
          price: form.price === "" ? undefined : Number(form.price),
          entryTes: form.entryTes || "001",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha ao gravar produto");
        return;
      }
      setSaveMsg(
        editingKey
          ? `Produto ${data.product.code} atualizado no Protheus.`
          : `Produto ${data.product.code} gravado no Protheus.`,
      );
      setForm(emptyForm);
      setEditingKey(null);
      setShowForm(false);
      setReloadKey((n) => n + 1);
    } catch {
      setError("Não foi possível gravar o produto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
            Produtos
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Cadastro SB1 gravado no Protheus (empresa 99).
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
            {showForm ? "Fechar" : "Novo produto"}
          </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código, descrição, tipo…"
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
            {editingKey ? `Editar produto ${editingKey}` : "Novo produto"}
          </h2>
          <p className="text-sm text-[var(--muted)]">
            {editingKey
              ? "Atualiza o registro na tabela SB1 do Protheus."
              : "Grava direto na tabela SB1 do Protheus. Se o código ficar em branco, o sistema gera automaticamente."}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Código</span>
              <input
                value={form.code}
                maxLength={15}
                disabled={Boolean(editingKey)}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                placeholder="Ex.: PA0009"
                className="w-full rounded-md border border-[var(--line)] px-3 py-2 disabled:bg-[#f3f7fb]"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Preço (B1_PRV1)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Descrição *</span>
              <input
                required
                value={form.description}
                maxLength={50}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Tipo</span>
              <input
                value={form.type}
                maxLength={2}
                onChange={(e) =>
                  setForm({ ...form, type: e.target.value.toUpperCase() })
                }
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Unidade</span>
              <input
                value={form.unit}
                maxLength={2}
                onChange={(e) =>
                  setForm({ ...form, unit: e.target.value.toUpperCase() })
                }
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Armazém</span>
              <input
                value={form.warehouse}
                maxLength={2}
                onChange={(e) =>
                  setForm({ ...form, warehouse: e.target.value })
                }
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">
                TES entrada (B1_TE / SF4)
              </span>
              <select
                value={form.entryTes}
                onChange={(e) => setForm({ ...form, entryTes: e.target.value })}
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
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Grupo</span>
              <input
                value={form.group}
                maxLength={4}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
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
              <th className="px-4 py-3 font-semibold">Produto</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">UM</th>
              <th className="px-4 py-3 font-semibold">TES</th>
              <th className="px-4 py-3 font-semibold">Grupo</th>
              <th className="px-4 py-3 font-semibold">Preço</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-[var(--muted)]">
                  Carregando…
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-[var(--muted)]">
                  Nenhum produto encontrado.
                </td>
              </tr>
            ) : (
              products.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-[var(--line)] align-top"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.description}</p>
                    <p className="text-xs text-[var(--muted)]">{item.code}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {item.type ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {item.unit ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {item.entryTes ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {item.group ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {formatMoney(item.price)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="text-xs font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      Editar
                    </button>
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

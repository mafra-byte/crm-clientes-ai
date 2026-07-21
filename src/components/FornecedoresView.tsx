"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Supplier = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  store: string | null;
  source: string;
  protheusCode: string | null;
};

type FormState = {
  name: string;
  tradeName: string;
  document: string;
  email: string;
  phone: string;
  address: string;
  district: string;
  city: string;
  state: string;
  zip: string;
};

const emptyForm: FormState = {
  name: "",
  tradeName: "",
  document: "",
  email: "",
  phone: "",
  address: "",
  district: "",
  city: "",
  state: "",
  zip: "",
};

export function FornecedoresView() {
  const [q, setQ] = useState("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
        const endpoint = `/api/suppliers/live${q ? `?q=${encodeURIComponent(q)}` : ""}`;
        const res = await fetch(endpoint, { signal });
        const data = await res.json();
        if (!res.ok) {
          setSuppliers([]);
          setError(data.error || "Falha ao carregar fornecedores");
          setMeta("");
          return;
        }
        setSuppliers(data.suppliers ?? []);
        setMeta(
          `Protheus SA2 · empresa ${data.empresa ?? "99"} / filial ${data.filial ?? "01"}`,
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

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveMsg("");
    setError("");
    try {
      const res = await fetch("/api/suppliers/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha ao gravar fornecedor");
        return;
      }
      setSaveMsg(
        `Fornecedor ${data.supplier.protheusCode}/${data.supplier.store} gravado no Protheus.`,
      );
      setForm(emptyForm);
      setShowForm(false);
      setReloadKey((n) => n + 1);
    } catch {
      setError("Não foi possível gravar o fornecedor.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
            Fornecedores
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Cadastro SA2 gravado no Protheus (empresa 99).
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
            {showForm ? "Fechar" : "Novo fornecedor"}
          </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, código, documento…"
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
            Novo fornecedor
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Grava direto na tabela SA2 do Protheus. Código gerado automaticamente.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Razão social *</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Nome fantasia</span>
              <input
                value={form.tradeName}
                onChange={(e) => setForm({ ...form, tradeName: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">CNPJ/CPF</span>
              <input
                value={form.document}
                onChange={(e) => setForm({ ...form, document: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">E-mail</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Telefone</span>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="mb-1 block text-[var(--muted)]">Endereço</span>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Bairro</span>
              <input
                value={form.district}
                onChange={(e) => setForm({ ...form, district: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">Cidade</span>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">UF</span>
              <input
                value={form.state}
                maxLength={2}
                onChange={(e) =>
                  setForm({ ...form, state: e.target.value.toUpperCase() })
                }
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-[var(--muted)]">CEP</span>
              <input
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
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
              <th className="px-4 py-3 font-semibold">Fornecedor</th>
              <th className="px-4 py-3 font-semibold">Contato</th>
              <th className="px-4 py-3 font-semibold">Documento</th>
              <th className="px-4 py-3 font-semibold">Origem</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-[var(--muted)]">
                  Carregando…
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-[var(--muted)]">
                  Nenhum fornecedor encontrado.
                </td>
              </tr>
            ) : (
              suppliers.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-[var(--line)] align-top"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {item.protheusCode
                        ? `Código ${item.protheusCode}${item.store ? ` / loja ${item.store}` : ""}`
                        : "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    <p>{item.email ?? "—"}</p>
                    <p className="text-xs">{item.phone ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {item.document ?? "—"}
                  </td>
                  <td className="px-4 py-3">Protheus</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

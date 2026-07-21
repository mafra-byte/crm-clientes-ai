"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { formatDate, formatMoney, sourceLabel } from "@/lib/format";

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  document: string | null;
  store: string | null;
  source: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  protheusCode: string | null;
};

type Mode = "live" | "local";

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
  personType: "F" | "J";
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
  personType: "J",
};

export function ClientesView() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("live");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const loadClients = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const endpoint =
        mode === "live"
          ? `/api/clients/live${q ? `?q=${encodeURIComponent(q)}` : ""}`
          : `/api/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(endpoint, { signal });
      const data = await res.json();
      if (!res.ok) {
        setClients([]);
        setError(data.error || "Falha ao carregar clientes");
        setMeta("");
        return;
      }
      setClients(data.clients ?? []);
      setMeta(
        mode === "live"
          ? `${
              data.source === "protheus-pg"
                ? "Protheus SA1"
                : data.demo
                  ? "Demo"
                  : "Ao vivo"
            } · empresa ${data.empresa ?? "99"} / filial ${data.filial ?? "01"}`
          : "Cache local",
      );
    } catch {
      /* aborted or network */
    } finally {
      setLoading(false);
    }
  }, [mode, q]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void loadClients(controller.signal);
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [loadClients, reloadKey]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveMsg("");
    setError("");
    try {
      const res = await fetch("/api/clients/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha ao gravar cliente");
        return;
      }
      setSaveMsg(
        `Cliente ${data.client.protheusCode}/${data.client.store} gravado no Protheus.`,
      );
      setForm(emptyForm);
      setShowForm(false);
      setMode("live");
      setReloadKey((n) => n + 1);
    } catch {
      setError("Não foi possível gravar o cliente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
            Clientes
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Cadastro SA1 gravado no Protheus (empresa 99).
          </p>
          {meta ? (
            <p className="mt-1 text-xs text-[var(--accent)]">{meta}</p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 md:max-w-md">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("live")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                mode === "live"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-white/80 text-[var(--muted)]"
              }`}
            >
              Ao vivo (API)
            </button>
            <button
              type="button"
              onClick={() => setMode("local")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                mode === "local"
                  ? "bg-[var(--accent)] text-white"
                  : "bg-white/80 text-[var(--muted)]"
              }`}
            >
              Cache local
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm((v) => !v);
                setSaveMsg("");
                setError("");
              }}
              className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
            >
              {showForm ? "Fechar" : "Novo cliente"}
            </button>
          </div>
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
            Novo cliente
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Grava direto na tabela SA1 do Protheus. Código gerado automaticamente.
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
              <span className="mb-1 block text-[var(--muted)]">Tipo pessoa</span>
              <select
                value={form.personType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    personType: e.target.value === "F" ? "F" : "J",
                  })
                }
                className="w-full rounded-md border border-[var(--line)] px-3 py-2"
              >
                <option value="J">Jurídica</option>
                <option value="F">Física</option>
              </select>
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
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Contato</th>
              <th className="px-4 py-3 font-semibold">Documento</th>
              <th className="px-4 py-3 font-semibold">Origem</th>
              <th className="px-4 py-3 font-semibold">Pedidos</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Último pedido</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-[var(--muted)]">
                  Carregando…
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-[var(--muted)]">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-t border-[var(--line)] align-top"
                >
                  <td className="px-4 py-3">
                    <p className="font-medium">{client.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {client.protheusCode
                        ? `Código ${client.protheusCode}${client.store ? ` / loja ${client.store}` : ""}`
                        : "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    <p>{client.email ?? "—"}</p>
                    <p className="text-xs">{client.phone ?? ""}</p>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {client.document ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {client.source === "protheus-live" ||
                    client.source === "protheus-pg"
                      ? "Protheus"
                      : sourceLabel(client.source)}
                  </td>
                  <td className="px-4 py-3">{client.totalOrders}</td>
                  <td className="px-4 py-3 font-medium">
                    {formatMoney(client.totalSpent)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {formatDate(client.lastOrderAt)}
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

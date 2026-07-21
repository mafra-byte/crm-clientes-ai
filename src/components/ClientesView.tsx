"use client";

import { useEffect, useState } from "react";
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

export function ClientesView() {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<Mode>("live");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const endpoint =
          mode === "live"
            ? `/api/clients/live${q ? `?q=${encodeURIComponent(q)}` : ""}`
            : `/api/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`;
        const res = await fetch(endpoint, { signal: controller.signal });
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
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, mode]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
            Clientes
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Cadastro SA1 via API REST do Protheus.
          </p>
          {meta ? (
            <p className="mt-1 text-xs text-[var(--accent)]">{meta}</p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 md:max-w-md">
          <div className="flex gap-2">
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
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, código, documento…"
            className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
          />
        </div>
      </section>

      {error ? (
        <p className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white/90">
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
                    {client.source === "protheus-live"
                      ? "Protheus (ao vivo)"
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

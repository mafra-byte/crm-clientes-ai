"use client";

import { useEffect, useState } from "react";
import { formatDate, formatMoney } from "@/lib/format";

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  nickname: string | null;
  source: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  mlBuyerId: string | null;
};

export function ClientesView() {
  const [q, setQ] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        setClients(data.clients ?? []);
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
  }, [q]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
            Clientes
          </h1>
          <p className="mt-1 text-[var(--muted)]">
            Compradores sincronizados do Mercado Livre e cadastros locais.
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome, e-mail, nickname…"
          className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm md:max-w-sm"
        />
      </section>

      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white/90">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f7fafc] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Contato</th>
              <th className="px-4 py-3 font-semibold">Origem</th>
              <th className="px-4 py-3 font-semibold">Pedidos</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Último pedido</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[var(--muted)]">
                  Carregando…
                </td>
              </tr>
            ) : clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[var(--muted)]">
                  Nenhum cliente encontrado. Conecte o Mercado Livre e sincronize
                  pedidos.
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
                      {client.nickname
                        ? `@${client.nickname}`
                        : client.mlBuyerId
                          ? `ML ${client.mlBuyerId}`
                          : "—"}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    <p>{client.email ?? "—"}</p>
                    <p>{client.phone ?? ""}</p>
                  </td>
                  <td className="px-4 py-3">
                    {client.source === "mercado_livre"
                      ? "Mercado Livre"
                      : "Manual"}
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

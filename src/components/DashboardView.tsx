"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Stat } from "@/components/Stat";
import { formatDate, formatMoney } from "@/lib/format";

type DashboardData = {
  stats: {
    clients: number;
    orders: number;
    revenue: number;
    connected: boolean;
    sellerNickname: string | null;
  };
  recentClients: Array<{
    id: string;
    name: string;
    source: string;
    totalOrders: number;
    totalSpent: number;
  }>;
  recentOrders: Array<{
    id: string;
    mlOrderId: string;
    status: string;
    totalAmount: number;
    currencyId: string;
    dateCreated: string;
    itemTitle: string | null;
    client: { id: string; name: string } | null;
  }>;
  recentSync: { message: string | null; createdAt: string; status: string } | null;
};

export function DashboardView() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard")
      .then(async (res) => {
        if (!res.ok) throw new Error("Falha ao carregar painel");
        return res.json();
      })
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) {
    return (
      <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
        {error}
      </p>
    );
  }

  if (!data) {
    return <p className="text-[var(--muted)]">Carregando painel…</p>;
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
          Painel
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          {data.stats.connected
            ? `Conta conectada: ${data.stats.sellerNickname}`
            : "Conecte sua conta do Mercado Livre para importar clientes e pedidos."}
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clientes" value={String(data.stats.clients)} />
        <Stat label="Pedidos" value={String(data.stats.orders)} />
        <Stat label="Receita sync" value={formatMoney(data.stats.revenue)} />
        <Stat
          label="Mercado Livre"
          value={data.stats.connected ? "Ativo" : "Pendente"}
          hint={
            data.recentSync?.message
              ? `${data.recentSync.message} · ${formatDate(data.recentSync.createdAt)}`
              : "Sem sincronização ainda"
          }
        />
      </section>

      {!data.stats.connected ? (
        <section className="rounded-xl border border-[var(--line)] bg-[var(--accent-soft)] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            Comece pela integração
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Autorize o aplicativo no Mercado Livre para puxar compradores e
            pedidos automaticamente para o CRM.
          </p>
          <Link
            href="/integracoes"
            className="mt-4 inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            Conectar Mercado Livre
          </Link>
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--line)] bg-white/90 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-xl">
              Clientes recentes
            </h2>
            <Link href="/clientes" className="text-sm text-[var(--accent)]">
              Ver todos
            </Link>
          </div>
          <ul className="space-y-3">
            {data.recentClients.length === 0 ? (
              <li className="text-sm text-[var(--muted)]">Nenhum cliente ainda.</li>
            ) : (
              data.recentClients.map((client) => (
                <li
                  key={client.id}
                  className="flex items-center justify-between border-b border-[var(--line)] pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">{client.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {client.source === "mercado_livre"
                        ? "Mercado Livre"
                        : "Manual"}{" "}
                      · {client.totalOrders} pedidos
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatMoney(client.totalSpent)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-white/90 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-xl">
              Pedidos recentes
            </h2>
            <Link href="/pedidos" className="text-sm text-[var(--accent)]">
              Ver todos
            </Link>
          </div>
          <ul className="space-y-3">
            {data.recentOrders.length === 0 ? (
              <li className="text-sm text-[var(--muted)]">Nenhum pedido ainda.</li>
            ) : (
              data.recentOrders.map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between border-b border-[var(--line)] pb-3 last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {order.client?.name ?? "Cliente"}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      #{order.mlOrderId} · {formatDate(order.dateCreated)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatMoney(order.totalAmount, order.currencyId)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}

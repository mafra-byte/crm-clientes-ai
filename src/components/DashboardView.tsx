"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Stat } from "@/components/Stat";
import { formatDate, formatMoney, sourceLabel } from "@/lib/format";

type DashboardData = {
  stats: {
    clients: number;
    orders: number;
    revenue: number;
    connected: boolean;
    demo?: boolean;
    empresa: string | null;
    filial: string | null;
    label: string | null;
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
    protheusId: string;
    number: string | null;
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

  const subtitle = data.stats.demo
    ? `Ambiente de demonstração · empresa ${data.stats.empresa ?? "99"} / filial ${data.stats.filial ?? "01"}`
    : data.stats.connected
      ? `Conectado · empresa ${data.stats.empresa} / filial ${data.stats.filial}`
      : "Conecte o Protheus para importar clientes e pedidos do ERP.";

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
          Painel
        </h1>
        <p className="mt-1 text-[var(--muted)]">{subtitle}</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Clientes" value={String(data.stats.clients)} />
        <Stat label="Pedidos" value={String(data.stats.orders)} />
        <Stat label="Receita importada" value={formatMoney(data.stats.revenue)} />
        <Stat
          label="Protheus"
          value={data.stats.demo ? "Demo" : data.stats.connected ? "Ativo" : "Pendente"}
          hint={
            data.recentSync?.message
              ? `${data.recentSync.message} · ${formatDate(data.recentSync.createdAt)}`
              : "Sem sincronização ainda"
          }
        />
      </section>

      {!data.stats.connected && !data.stats.demo ? (
        <section className="rounded-xl border border-[var(--line)] bg-[var(--accent-soft)] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            Comece pela integração
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Conecte o REST Adapter do Protheus para trazer clientes e pedidos
            automaticamente para o portal.
          </p>
          <Link
            href="/integracoes"
            className="mt-4 inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            Configurar Protheus
          </Link>
        </section>
      ) : null}

      {data.stats.demo ? (
        <section className="rounded-xl border border-[var(--line)] bg-[var(--accent-soft)] p-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            Roteiro rápido da demo
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Mostre o painel com números reais, abra Clientes e Pedidos, depois
            a tela Protheus para simular teste e sincronização — tudo sem
            depender do ERP no ar.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/clientes"
              className="inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              Ver clientes
            </Link>
            <Link
              href="/pedidos"
              className="inline-flex rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold"
            >
              Ver pedidos
            </Link>
          </div>
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
                      {sourceLabel(client.source)} · {client.totalOrders} pedidos
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
                      #{order.number ?? order.protheusId} ·{" "}
                      {formatDate(order.dateCreated)}
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

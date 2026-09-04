"use client";

import { useEffect, useState } from "react";
import { formatDate, formatMoney, statusLabel } from "@/lib/format";

type Order = {
  id: string;
  protheusId: string;
  number: string | null;
  status: string;
  totalAmount: number;
  currencyId: string;
  dateCreated: string;
  itemTitle: string | null;
  quantity: number;
  client: {
    id: string;
    name: string;
    email: string | null;
    protheusCode: string | null;
  } | null;
};

export function PedidosView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => setOrders(data.orders ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
          Pedidos
        </h1>
        <p className="mt-1 text-[var(--muted)]">
          Pedidos de venda importados do Protheus.
        </p>
      </section>

      <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white/90">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f3f7fb] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Pedido</th>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Valor</th>
              <th className="px-4 py-3 font-semibold">Emissão</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[var(--muted)]">
                  Carregando…
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-[var(--muted)]">
                  Nenhum pedido sincronizado ainda.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr
                  key={order.id}
                  className="border-t border-[var(--line)] align-top"
                >
                  <td className="px-4 py-3 font-medium">
                    #{order.number ?? order.protheusId}
                  </td>
                  <td className="px-4 py-3">
                    <p>{order.client?.name ?? "—"}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {order.client?.protheusCode
                        ? `Código ${order.client.protheusCode}`
                        : (order.client?.email ?? "")}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p>{order.itemTitle ?? "—"}</p>
                    <p className="text-xs text-[var(--muted)]">
                      Qtd {order.quantity}
                    </p>
                  </td>
                  <td className="px-4 py-3">{statusLabel(order.status)}</td>
                  <td className="px-4 py-3 font-medium">
                    {formatMoney(order.totalAmount, order.currencyId)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {formatDate(order.dateCreated)}
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

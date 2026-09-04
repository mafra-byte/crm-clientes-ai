"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type PipelineStage = "request" | "quote" | "order" | "receipt";

type PipelineCard = {
  id: string;
  stage: PipelineStage;
  title: string;
  productCode: string;
  description: string;
  quantity: number;
  unit: string | null;
  supplierCode: string | null;
  scNumber: string | null;
  quoteNumber: string | null;
  orderNumber: string | null;
  document: string | null;
  series: string | null;
  href: string;
  statusLabel: string;
  emission: string | null;
};

type PipelineColumn = {
  id: PipelineStage;
  title: string;
  subtitle: string;
  href: string;
  cards: PipelineCard[];
};

const stageAccent: Record<PipelineStage, string> = {
  request: "#1d4e89",
  quote: "#0f766e",
  order: "#a16207",
  receipt: "#166534",
};

function CardTrail({ card }: { card: PipelineCard }) {
  const steps = [
    card.scNumber ? `SC ${card.scNumber}` : null,
    card.quoteNumber ? `Cot ${card.quoteNumber}` : null,
    card.orderNumber ? `PC ${card.orderNumber}` : null,
    card.document ? `NF ${card.document}` : null,
  ].filter(Boolean);

  if (steps.length === 0) return null;
  return (
    <p className="mt-2 text-[11px] leading-relaxed text-[var(--muted)]">
      {steps.join(" → ")}
    </p>
  );
}

export function FluxoComprasView() {
  const [columns, setColumns] = useState<PipelineColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/purchase-pipeline/live", { signal });
      const data = await res.json();
      if (!res.ok) {
        setColumns([]);
        setError(data.error || "Falha ao carregar o fluxo");
        setMeta("");
        return;
      }
      setColumns(data.columns ?? []);
      setMeta(
        `Empresa ${data.empresa ?? "99"} · filial ${data.filial ?? "01"} · ${
          (data.columns ?? []).reduce(
            (n: number, c: PipelineColumn) => n + c.cards.length,
            0,
          )
        } itens`,
      );
    } catch {
      /* aborted */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="animate-rise">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
            Mapa do processo
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--ink)] md:text-4xl">
            Fluxo de compras
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Da solicitação até a nota fiscal de entrada — acompanhe cada item
            nas etapas SC → Cotação → Pedido → NF.
          </p>
          {meta ? (
            <p className="mt-2 text-xs text-[var(--accent)]">{meta}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="self-start rounded-md border border-[var(--line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--accent-soft)]"
        >
          Atualizar
        </button>
      </section>

      <div className="animate-fade flex items-center gap-2 overflow-x-auto pb-1 text-xs text-[var(--muted)]">
        {["Solicitação", "Cotação", "Pedido", "Nota fiscal"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            {i > 0 ? (
              <span className="text-[var(--line)]" aria-hidden>
                →
              </span>
            ) : null}
            <span className="rounded-full border border-[var(--line)] bg-white/80 px-2.5 py-1 font-medium text-[var(--ink)]">
              {i + 1}. {label}
            </span>
          </div>
        ))}
      </div>

      {error ? (
        <p className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Montando o quadro…</p>
      ) : (
        <div className="grid gap-4 xl:grid-cols-4">
          {columns.map((column, columnIndex) => (
            <section
              key={column.id}
              className="animate-rise flex min-h-[28rem] flex-col rounded-2xl border border-[var(--line)] bg-white/70 p-3 shadow-[0_10px_30px_rgba(18,32,51,0.04)]"
              style={{ animationDelay: `${columnIndex * 80}ms` }}
            >
              <header className="mb-3 border-b border-[var(--line)] pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--ink)]">
                      {column.title}
                    </h2>
                    <p className="text-xs text-[var(--muted)]">
                      {column.subtitle}
                    </p>
                  </div>
                  <span
                    className="rounded-md px-2 py-0.5 text-xs font-semibold text-white"
                    style={{ background: stageAccent[column.id] }}
                  >
                    {column.cards.length}
                  </span>
                </div>
                <Link
                  href={column.href}
                  className="mt-2 inline-block text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  Abrir módulo →
                </Link>
              </header>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
                {column.cards.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[var(--line)] px-3 py-6 text-center text-xs text-[var(--muted)]">
                    Nenhum item nesta etapa
                  </p>
                ) : (
                  column.cards.map((card, cardIndex) => (
                    <Link
                      key={card.id}
                      href={card.href}
                      className="group block rounded-xl border border-[var(--line)] bg-white p-3 transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md"
                      style={{
                        animationDelay: `${columnIndex * 80 + cardIndex * 40}ms`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--ink)]">
                          {card.title}
                        </p>
                        <span
                          className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                          style={{ background: stageAccent[card.stage] }}
                          aria-hidden
                        />
                      </div>
                      <p className="mt-1 text-sm text-[var(--ink)]">
                        {card.description}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {card.productCode} · {card.quantity} {card.unit || ""}
                        {card.supplierCode ? ` · forn. ${card.supplierCode}` : ""}
                      </p>
                      <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                        {card.statusLabel}
                      </p>
                      <CardTrail card={card} />
                    </Link>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

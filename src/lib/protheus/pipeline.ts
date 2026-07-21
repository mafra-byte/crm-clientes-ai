import { fetchReceiptsFromPg } from "@/lib/protheus/receipt";
import { fetchSc1FromPg } from "@/lib/protheus/sc1";
import { fetchSc7FromPg } from "@/lib/protheus/sc7";
import { fetchSc8FromPg } from "@/lib/protheus/sc8";

export type PipelineStage = "request" | "quote" | "order" | "receipt";

export type PipelineCard = {
  id: string;
  stage: PipelineStage;
  title: string;
  productCode: string;
  description: string;
  quantity: number;
  unit: string | null;
  supplierCode: string | null;
  scNumber: string | null;
  scItem: string | null;
  quoteNumber: string | null;
  orderNumber: string | null;
  orderItem: string | null;
  document: string | null;
  series: string | null;
  href: string;
  statusLabel: string;
  emission: string | null;
};

export type PipelineColumn = {
  id: PipelineStage;
  title: string;
  subtitle: string;
  href: string;
  cards: PipelineCard[];
};

function scKey(number: string, item: string) {
  return `sc:${number}:${item}`;
}

export async function fetchPurchasePipeline() {
  const [requests, quotes, orders, receipts] = await Promise.all([
    fetchSc1FromPg(),
    fetchSc8FromPg(),
    fetchSc7FromPg(),
    fetchReceiptsFromPg(),
  ]);

  const cardsById = new Map<string, PipelineCard>();

  // Base: cada item de SC vira um card e avança conforme vínculos
  for (const sc of requests.lines) {
    const id = scKey(sc.number, sc.item);
    let stage: PipelineStage = "request";
    let statusLabel = "Aguardando cotação";
    let href = "/solicitacoes-compra";
    let quoteNumber = sc.quoteNumber;
    let orderNumber = sc.purchaseOrderNumber;
    let orderItem = sc.purchaseOrderItem;
    let supplierCode: string | null = null;
    let document: string | null = null;
    let series: string | null = null;

    if (sc.purchaseOrderNumber) {
      const pc = orders.lines.find(
        (o) =>
          o.number === sc.purchaseOrderNumber &&
          (!sc.purchaseOrderItem || o.item === sc.purchaseOrderItem),
      );
      supplierCode = pc?.supplierCode ?? null;
      if (pc?.closed) {
        stage = "receipt";
        statusLabel = "Pedido baixado · NF";
        href = "/recebimento";
        const nf = receipts.lines.find(
          (r) =>
            r.purchaseOrderNumber === pc.number &&
            r.purchaseOrderItem === pc.item,
        );
        document = nf?.document ?? null;
        series = nf?.series ?? null;
      } else {
        stage = "order";
        statusLabel = "Pedido em aberto";
        href = "/pedidos-compra";
      }
      quoteNumber = sc.quoteNumber || pc?.quoteNumber || quoteNumber;
      orderNumber = pc?.number ?? orderNumber;
      orderItem = pc?.item ?? orderItem;
    } else {
      const linkedQuote =
        quotes.lines.find(
          (q) =>
            q.purchaseRequestNumber === sc.number &&
            q.purchaseRequestItem === sc.item,
        ) ||
        (sc.quoteNumber
          ? quotes.lines.find((q) => q.number === sc.quoteNumber)
          : undefined);

      if (linkedQuote || sc.quoteNumber) {
        stage = "quote";
        statusLabel = linkedQuote?.closed
          ? "Cotação fechada (sem PC na SC)"
          : "Em cotação";
        href = "/cotacoes-compra";
        quoteNumber = linkedQuote?.number || sc.quoteNumber;
        supplierCode = linkedQuote?.supplierCode ?? null;
      }
    }

    cardsById.set(id, {
      id,
      stage,
      title: `SC ${sc.number}/${sc.item}`,
      productCode: sc.productCode,
      description: sc.description,
      quantity: sc.quantity,
      unit: sc.unit,
      supplierCode,
      scNumber: sc.number,
      scItem: sc.item,
      quoteNumber,
      orderNumber,
      orderItem,
      document,
      series,
      href,
      statusLabel,
      emission: sc.emission,
    });
  }

  // Cotações sem SC (ou SC ainda não listada) aparecem na coluna Cotação se abertas
  for (const quote of quotes.lines) {
    if (quote.closed) continue;
    if (quote.purchaseRequestNumber && quote.purchaseRequestItem) {
      const key = scKey(quote.purchaseRequestNumber, quote.purchaseRequestItem);
      if (cardsById.has(key)) continue;
    }
    const id = `quote:${quote.number}:${quote.item}:${quote.proposal}:${quote.supplierCode}`;
    if (cardsById.has(id)) continue;
    cardsById.set(id, {
      id,
      stage: "quote",
      title: `Cot. ${quote.number}/${quote.item}`,
      productCode: quote.productCode,
      description: quote.description,
      quantity: quote.quantity,
      unit: quote.unit,
      supplierCode: quote.supplierCode,
      scNumber: quote.purchaseRequestNumber,
      scItem: quote.purchaseRequestItem,
      quoteNumber: quote.number,
      orderNumber: null,
      orderItem: null,
      document: null,
      series: null,
      href: "/cotacoes-compra",
      statusLabel: "Cotação aberta",
      emission: quote.emission,
    });
  }

  // Pedidos sem SC card
  for (const order of orders.lines) {
    if (order.closed) continue;
    if (order.purchaseRequestNumber && order.purchaseRequestItem) {
      const key = scKey(order.purchaseRequestNumber, order.purchaseRequestItem);
      const existing = cardsById.get(key);
      if (existing) {
        if (existing.stage === "request" || existing.stage === "quote") {
          existing.stage = "order";
          existing.statusLabel = "Pedido em aberto";
          existing.href = "/pedidos-compra";
          existing.orderNumber = order.number;
          existing.orderItem = order.item;
          existing.supplierCode = order.supplierCode;
          existing.quoteNumber = order.quoteNumber || existing.quoteNumber;
        }
        continue;
      }
    }
    const id = `order:${order.number}:${order.item}`;
    if (cardsById.has(id)) continue;
    cardsById.set(id, {
      id,
      stage: "order",
      title: `PC ${order.number}/${order.item}`,
      productCode: order.productCode,
      description: order.description,
      quantity: order.quantity,
      unit: order.unit,
      supplierCode: order.supplierCode,
      scNumber: order.purchaseRequestNumber,
      scItem: order.purchaseRequestItem,
      quoteNumber: order.quoteNumber,
      orderNumber: order.number,
      orderItem: order.item,
      document: null,
      series: null,
      href: "/pedidos-compra",
      statusLabel: "Pedido em aberto",
      emission: order.emission,
    });
  }

  // NFs: cards de pedidos baixados / documentos de entrada
  for (const order of orders.lines) {
    if (!order.closed) continue;
    if (order.purchaseRequestNumber && order.purchaseRequestItem) {
      const key = scKey(order.purchaseRequestNumber, order.purchaseRequestItem);
      if (cardsById.has(key)) continue;
    }
    const nf = receipts.lines.find(
      (r) =>
        r.purchaseOrderNumber === order.number &&
        r.purchaseOrderItem === order.item,
    );
    const id = `receipt-order:${order.number}:${order.item}`;
    cardsById.set(id, {
      id,
      stage: "receipt",
      title: nf
        ? `NF ${nf.document}/${nf.series}`
        : `PC ${order.number}/${order.item}`,
      productCode: order.productCode,
      description: order.description,
      quantity: order.quantityDelivered || order.quantity,
      unit: order.unit,
      supplierCode: order.supplierCode,
      scNumber: order.purchaseRequestNumber,
      scItem: order.purchaseRequestItem,
      quoteNumber: order.quoteNumber,
      orderNumber: order.number,
      orderItem: order.item,
      document: nf?.document ?? null,
      series: nf?.series ?? null,
      href: "/recebimento",
      statusLabel: "Recebido",
      emission: nf?.emission || order.emission,
    });
  }

  const columns: PipelineColumn[] = [
    {
      id: "request",
      title: "1. Solicitação",
      subtitle: "SC1 — abertas",
      href: "/solicitacoes-compra",
      cards: [],
    },
    {
      id: "quote",
      title: "2. Cotação",
      subtitle: "SC8 — em cotação",
      href: "/cotacoes-compra",
      cards: [],
    },
    {
      id: "order",
      title: "3. Pedido",
      subtitle: "SC7 — aguardando NF",
      href: "/pedidos-compra",
      cards: [],
    },
    {
      id: "receipt",
      title: "4. Nota fiscal",
      subtitle: "SF1/SD1 — recebidas",
      href: "/recebimento",
      cards: [],
    },
  ];

  for (const card of cardsById.values()) {
    const column = columns.find((c) => c.id === card.stage);
    if (column) column.cards.push(card);
  }

  for (const column of columns) {
    column.cards.sort((a, b) => {
      const ae = a.emission || "";
      const be = b.emission || "";
      return be.localeCompare(ae) || a.title.localeCompare(b.title);
    });
  }

  return {
    empresa: requests.empresa,
    filial: requests.filial,
    columns,
    totals: {
      request: columns[0].cards.length,
      quote: columns[1].cards.length,
      order: columns[2].cards.length,
      receipt: columns[3].cards.length,
    },
  };
}

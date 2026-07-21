export function formatMoney(value: number, currency = "BRL") {
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `R$ ${value.toFixed(2)}`;
  }
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function statusLabel(status: string) {
  const map: Record<string, string> = {
    A: "Aberto",
    B: "Bloqueado",
    C: "Cancelado",
    F: "Faturado",
    L: "Liberado",
    aberto: "Aberto",
    liberado: "Liberado",
    faturado: "Faturado",
    cancelado: "Cancelado",
    bloqueado: "Bloqueado",
  };
  return map[status] ?? status;
}

export function sourceLabel(source: string) {
  if (source === "protheus") return "Protheus";
  if (source === "protheus-live") return "Protheus (ao vivo)";
  if (source === "manual") return "Manual";
  return source;
}

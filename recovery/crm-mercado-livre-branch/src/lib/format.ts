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
    paid: "Pago",
    confirmed: "Confirmado",
    payment_required: "Aguardando pagamento",
    payment_in_process: "Pagamento em processo",
    partially_paid: "Parcialmente pago",
    cancelled: "Cancelado",
    invalid: "Inválido",
  };
  return map[status] ?? status;
}

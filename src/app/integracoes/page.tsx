import { Suspense } from "react";
import { IntegracoesView } from "@/components/IntegracoesView";

export default function IntegracoesPage() {
  return (
    <Suspense fallback={<p className="text-[var(--muted)]">Carregando…</p>}>
      <IntegracoesView />
    </Suspense>
  );
}

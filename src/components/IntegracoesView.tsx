"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { formatDate } from "@/lib/format";

type StatusResponse = {
  configured: boolean;
  connected: boolean;
  account: {
    id: string;
    mlUserId: string;
    nickname: string;
    email: string | null;
    expiresAt: string;
  } | null;
  recentSync: {
    message: string | null;
    status: string;
    createdAt: string;
  } | null;
};

export function IntegracoesView() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/ml/status");
    const data = (await res.json()) as StatusResponse;
    setStatus(data);
  }, []);

  useEffect(() => {
    load().catch(() => setError("Não foi possível carregar o status."));
  }, [load]);

  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      setMessage("Conta Mercado Livre conectada com sucesso.");
    }
    const err = searchParams.get("error");
    if (err) setError(err);
  }, [searchParams]);

  async function syncOrders() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/ml/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha na sincronização");
      setMessage(
        `Sincronização concluída: ${data.imported} pedidos importados de ${data.total} disponíveis.`,
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao sincronizar");
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      await fetch("/api/ml/status", { method: "DELETE" });
      setMessage("Conta desconectada.");
      await load();
    } catch {
      setError("Não foi possível desconectar.");
    } finally {
      setBusy(false);
    }
  }

  if (!status) {
    return <p className="text-[var(--muted)]">Carregando integração…</p>;
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
          Mercado Livre
        </h1>
        <p className="mt-1 max-w-2xl text-[var(--muted)]">
          Conecte sua conta de vendedor via OAuth 2.0, sincronize pedidos e
          transforme compradores em clientes do CRM.
        </p>
      </section>

      {message ? (
        <p className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-xl border border-[var(--line)] bg-white/90 p-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            Conta conectada
          </h2>

          {!status.configured ? (
            <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              <p>
                Configure as variáveis de ambiente antes de autorizar a conta:
              </p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <code>ML_APP_ID</code>
                </li>
                <li>
                  <code>ML_CLIENT_SECRET</code>
                </li>
                <li>
                  <code>ML_REDIRECT_URI</code> ={" "}
                  <code>http://localhost:3000/api/ml/callback</code>
                </li>
              </ul>
              <p>
                Crie o aplicativo em{" "}
                <a
                  className="text-[var(--accent)] underline"
                  href="https://developers.mercadolivre.com.br/"
                  target="_blank"
                  rel="noreferrer"
                >
                  developers.mercadolivre.com.br
                </a>
                .
              </p>
            </div>
          ) : status.connected && status.account ? (
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="text-[var(--muted)]">Nickname:</span>{" "}
                <strong>{status.account.nickname}</strong>
              </p>
              <p>
                <span className="text-[var(--muted)]">User ID:</span>{" "}
                {status.account.mlUserId}
              </p>
              {status.account.email ? (
                <p>
                  <span className="text-[var(--muted)]">E-mail:</span>{" "}
                  {status.account.email}
                </p>
              ) : null}
              <p>
                <span className="text-[var(--muted)]">Token expira em:</span>{" "}
                {formatDate(status.account.expiresAt)}
              </p>
              {status.recentSync ? (
                <p className="pt-2 text-[var(--muted)]">
                  Última sync ({status.recentSync.status}):{" "}
                  {status.recentSync.message} ·{" "}
                  {formatDate(status.recentSync.createdAt)}
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">
              Nenhuma conta autorizada ainda.
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {status.configured && !status.connected ? (
              <a
                href="/api/ml/connect"
                className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white"
              >
                Conectar conta
              </a>
            ) : null}
            {status.connected ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={syncOrders}
                  className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {busy ? "Sincronizando…" : "Sincronizar pedidos"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={disconnect}
                  className="rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  Desconectar
                </button>
              </>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-white/90 p-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            O que esta integração faz
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-[var(--muted)]">
            <li>Autoriza o app via OAuth (authorization code + refresh token).</li>
            <li>Busca pedidos recentes do vendedor na API `/orders/search`.</li>
            <li>Cria/atualiza clientes no CRM a partir dos compradores.</li>
            <li>
              Aceita webhooks em <code>/api/ml/notifications</code> para
              sincronizar pedidos novos.
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}

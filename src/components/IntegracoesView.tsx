"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDate } from "@/lib/format";

type StatusResponse = {
  configured: boolean;
  connected: boolean;
  connection: {
    id: string;
    label: string;
    baseUrl: string;
    empresa: string;
    filial: string;
    username: string;
    expiresAt: string | null;
    lastTestAt: string | null;
    lastTestOk: boolean;
  } | null;
  paths: {
    token: string;
    customers: string;
    orders: string;
  };
  recentSync: {
    message: string | null;
    status: string;
    createdAt: string;
  } | null;
};

export function IntegracoesView() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/protheus/status");
    const data = (await res.json()) as StatusResponse;
    setStatus(data);
  }, []);

  useEffect(() => {
    load().catch(() => setError("Não foi possível carregar o status."));
  }, [load]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na operação");
    } finally {
      setBusy(false);
    }
  }

  async function testConnection() {
    await run(async () => {
      const res = await fetch("/api/protheus/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha no teste");
      setMessage("Conexão autenticada com sucesso.");
    });
  }

  async function connect() {
    await run(async () => {
      const res = await fetch("/api/protheus/connect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao conectar");
      setMessage("Ambiente Protheus conectado.");
    });
  }

  async function sync(type: "customers" | "orders" | "all") {
    await run(async () => {
      const res = await fetch("/api/protheus/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha na sincronização");

      if (type === "all") {
        setMessage(
          `Sync concluída: ${data.customers} clientes e ${data.orders} pedidos.`,
        );
      } else {
        setMessage(`Sincronização concluída: ${data.imported} registros.`);
      }
    });
  }

  async function disconnect() {
    await run(async () => {
      await fetch("/api/protheus/status", { method: "DELETE" });
      setMessage("Sessão Protheus desconectada.");
    });
  }

  if (!status) {
    return <p className="text-[var(--muted)]">Carregando integração…</p>;
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
          Protheus
        </h1>
        <p className="mt-1 max-w-2xl text-[var(--muted)]">
          Autentique no REST Adapter TOTVS, teste a conexão e sincronize
          clientes (SA1) e pedidos de venda.
        </p>
      </section>

      {message ? (
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
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
            Ambiente conectado
          </h2>

          {!status.configured ? (
            <div className="mt-4 space-y-3 text-sm text-[var(--muted)]">
              <p>Configure o `.env` antes de autenticar:</p>
              <ul className="list-disc space-y-1 pl-5">
                <li>
                  <code>PROTHEUS_BASE_URL</code> — ex.{" "}
                  <code>http://servidor:8080/rest</code>
                </li>
                <li>
                  <code>PROTHEUS_USERNAME</code> / <code>PROTHEUS_PASSWORD</code>
                </li>
                <li>
                  <code>PROTHEUS_EMPRESA</code> / <code>PROTHEUS_FILIAL</code>
                </li>
                <li>
                  Opcional: <code>PROTHEUS_CLIENT_ID</code> e{" "}
                  <code>PROTHEUS_CLIENT_SECRET</code>
                </li>
              </ul>
            </div>
          ) : status.connection ? (
            <div className="mt-4 space-y-2 text-sm">
              <p>
                <span className="text-[var(--muted)]">URL:</span>{" "}
                <strong>{status.connection.baseUrl}</strong>
              </p>
              <p>
                <span className="text-[var(--muted)]">Empresa / Filial:</span>{" "}
                {status.connection.empresa} / {status.connection.filial}
              </p>
              <p>
                <span className="text-[var(--muted)]">Usuário:</span>{" "}
                {status.connection.username}
              </p>
              <p>
                <span className="text-[var(--muted)]">Status:</span>{" "}
                {status.connected ? "Autenticado" : "Aguardando autenticação"}
              </p>
              {status.connection.expiresAt ? (
                <p>
                  <span className="text-[var(--muted)]">Token expira em:</span>{" "}
                  {formatDate(status.connection.expiresAt)}
                </p>
              ) : null}
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
              Ambiente configurado no `.env`, mas ainda sem sessão salva.
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {status.configured ? (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={testConnection}
                  className="rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
                >
                  {busy ? "Aguarde…" : "Testar conexão"}
                </button>
                {!status.connected ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={connect}
                    className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    Conectar
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => sync("all")}
                      className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      Sincronizar tudo
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => sync("customers")}
                      className="rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
                    >
                      Só clientes
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => sync("orders")}
                      className="rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-60"
                    >
                      Só pedidos
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
                )}
              </>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--line)] bg-white/90 p-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl">
            Endpoints usados
          </h2>
          <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-[var(--muted)]">
            <li>
              Token OAuth password grant em <code>{status.paths.token}</code>
            </li>
            <li>
              Clientes via <code>{status.paths.customers}</code>
            </li>
            <li>
              Pedidos via <code>{status.paths.orders}</code>
            </li>
            <li>
              Headers de tenant: <code>tenantId</code>, <code>Company</code>,{" "}
              <code>Branch</code>
            </li>
          </ol>
          <p className="mt-4 text-sm text-[var(--muted)]">
            Ajuste os paths no `.env` conforme o Adapter REST do seu ambiente.
          </p>
        </div>
      </section>
    </div>
  );
}

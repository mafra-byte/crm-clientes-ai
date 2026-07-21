"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/clientes";

  const [username, setUsername] = useState("Admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha no login");
        return;
      }
      router.replace(next.startsWith("/") ? next : "/clientes");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao portal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-10">
      <div className="animate-rise rounded-2xl border border-[var(--line)] bg-white/90 p-8 shadow-[0_20px_60px_rgba(18,32,51,0.08)]">
        <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)]">
          Protheus
        </p>
        <div className="brand-underline mt-2 h-[3px] w-20 rounded-full bg-[var(--accent)]" />
        <p className="mt-4 text-sm text-[var(--muted)]">
          Portal CRM via API REST — empresa 99.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Usuário</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-[var(--muted)]">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2"
              required
            />
          </label>

          {error ? (
            <p className="rounded-md bg-[#fef2f2] px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-medium text-white transition hover:brightness-110 disabled:opacity-60"
          >
            {loading ? "Entrando…" : "Entrar no portal"}
          </button>
        </form>
      </div>
    </div>
  );
}

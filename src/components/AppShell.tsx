"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Painel" },
  { href: "/clientes", label: "Clientes" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/integracoes", label: "Protheus" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 md:px-8 md:py-8">
      <header className="mb-8 flex flex-col gap-6 md:mb-10 md:flex-row md:items-end md:justify-between">
        <div className="animate-rise">
          <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)] md:text-5xl">
            Protheus
          </p>
          <div className="brand-underline mt-2 h-[3px] w-24 rounded-full bg-[var(--accent)]" />
          <p className="mt-3 max-w-md text-sm text-[var(--muted)]">
            CRM conectado ao ERP TOTVS via REST Adapter.
          </p>
        </div>
        <nav className="animate-fade flex flex-wrap gap-2">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-[var(--accent)] text-white"
                    : "bg-white/75 text-[var(--foreground)] hover:bg-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="animate-rise flex-1" style={{ animationDelay: "80ms" }}>
        {children}
      </main>
    </div>
  );
}

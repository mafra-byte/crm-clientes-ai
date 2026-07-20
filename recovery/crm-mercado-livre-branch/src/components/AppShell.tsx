"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/", label: "Painel" },
  { href: "/clientes", label: "Clientes" },
  { href: "/pedidos", label: "Pedidos" },
  { href: "/integracoes", label: "Mercado Livre" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 py-6 md:px-8 md:py-8">
      <header className="mb-8 flex flex-col gap-6 md:mb-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--foreground)] md:text-4xl">
            Clientela
          </p>
          <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
            CRM de clientes com sincronização do Mercado Livre.
          </p>
        </div>
        <nav className="flex flex-wrap gap-2">
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
                    : "bg-white/70 text-[var(--foreground)] hover:bg-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

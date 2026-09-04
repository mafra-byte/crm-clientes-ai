type Props = {
  label: string;
  value: string;
  hint?: string;
};

export function Stat({ label, value, hint }: Props) {
  return (
    <div className="rounded-xl border border-[var(--line)] bg-white/90 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--foreground)]">
        {value}
      </p>
      {hint ? <p className="mt-2 text-sm text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

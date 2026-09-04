"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Line = {
  id: string;
  code: string;
  type: string;
  text: string;
  cfop: string;
  updatesStock: boolean;
  generatesDuplicate: boolean;
  calculatesIcms: boolean;
  creditIcms: boolean;
  purpose: string | null;
};

type FormState = {
  code: string;
  type: "E" | "S";
  text: string;
  cfop: string;
  updatesStock: boolean;
  generatesDuplicate: boolean;
  calculatesIcms: boolean;
  creditIcms: boolean;
  purpose: string;
};

const emptyForm: FormState = {
  code: "",
  type: "E",
  text: "",
  cfop: "1102",
  updatesStock: true,
  generatesDuplicate: true,
  calculatesIcms: true,
  creditIcms: true,
  purpose: "",
};

export function TesView() {
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const endpoint = `/api/tes/live${q ? `?q=${encodeURIComponent(q)}` : ""}`;
        const res = await fetch(endpoint, { signal });
        const data = await res.json();
        if (!res.ok) {
          setLines([]);
          setError(data.error || "Falha ao carregar TES");
          setMeta("");
          return;
        }
        setLines(data.lines ?? []);
        setMeta(
          `Protheus SF4 · empresa ${data.empresa ?? "99"} / filial ${data.filial ?? "01"}`,
        );
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    },
    [q],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void load(controller.signal);
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load, reloadKey]);

  function openCreate() {
    setEditingKey(null);
    setForm(emptyForm);
    setShowForm(true);
    setSaveMsg("");
    setError("");
  }

  function startEdit(line: Line) {
    setEditingKey(line.code);
    setForm({
      code: line.code,
      type: line.type === "S" ? "S" : "E",
      text: line.text ?? "",
      cfop: line.cfop ?? "",
      updatesStock: Boolean(line.updatesStock),
      generatesDuplicate: Boolean(line.generatesDuplicate),
      calculatesIcms: Boolean(line.calculatesIcms),
      creditIcms: Boolean(line.creditIcms),
      purpose: line.purpose ?? "",
    });
    setShowForm(true);
    setSaveMsg("");
    setError("");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaveMsg("");
    setError("");
    try {
      const res = await fetch("/api/tes/live", {
        method: editingKey ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          code: editingKey || form.code || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Falha ao gravar TES");
        return;
      }
      setSaveMsg(
        editingKey
          ? `TES ${data.line.code} atualizada · CFOP ${data.line.cfop}.`
          : `TES ${data.line.code} gravada · CFOP ${data.line.cfop}.`,
      );
      setForm(emptyForm);
      setEditingKey(null);
      setShowForm(false);
      setReloadKey((n) => n + 1);
    } catch {
      setError("Não foi possível gravar a TES.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl">
            TES
          </h1>
          <p className="mt-1 max-w-2xl text-[var(--muted)]">
            Tipos de Entrada/Saída (SF4). No recebimento, a TES define CFOP e se
            a NF atualiza estoque.
          </p>
          {meta ? (
            <p className="mt-1 text-xs text-[var(--accent)]">{meta}</p>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 md:max-w-md">
          <button
            type="button"
            onClick={() => {
              if (showForm) {
                setShowForm(false);
                setEditingKey(null);
                setForm(emptyForm);
              } else {
                openCreate();
              }
            }}
            className="self-start rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
          >
            {showForm ? "Fechar" : "Nova TES"}
          </button>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar código, texto ou CFOP…"
            className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm"
          />
        </div>
      </section>

      {showForm ? (
        <form
          onSubmit={onSubmit}
          className="grid gap-3 rounded-xl border border-[var(--line)] bg-white/80 p-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="sm:col-span-2 lg:col-span-4">
            <h2 className="font-[family-name:var(--font-display)] text-xl">
              {editingKey ? `Editar TES ${editingKey}` : "Nova TES"}
            </h2>
          </div>
          <label className="space-y-1 text-sm">
            <span className="text-[var(--muted)]">Código (opcional)</span>
            <input
              value={form.code}
              disabled={Boolean(editingKey)}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] px-3 py-2 disabled:bg-[#f3f7fb]"
              placeholder="Ex.: 005"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[var(--muted)]">Tipo</span>
            <select
              value={form.type}
              onChange={(e) =>
                setForm({
                  ...form,
                  type: e.target.value === "S" ? "S" : "E",
                  updatesStock:
                    e.target.value === "S" ? false : form.updatesStock,
                })
              }
              className="w-full rounded-lg border border-[var(--line)] px-3 py-2"
            >
              <option value="E">E — Entrada</option>
              <option value="S">S — Saída</option>
            </select>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="text-[var(--muted)]">Texto *</span>
            <input
              required
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-[var(--muted)]">CFOP *</span>
            <input
              required
              value={form.cfop}
              onChange={(e) => setForm({ ...form, cfop: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-3">
            <input
              type="checkbox"
              checked={form.updatesStock}
              disabled={form.type === "S"}
              onChange={(e) =>
                setForm({ ...form, updatesStock: e.target.checked })
              }
            />
            Atualiza estoque (F4_ESTOQUE)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.generatesDuplicate}
              onChange={(e) =>
                setForm({ ...form, generatesDuplicate: e.target.checked })
              }
            />
            Gera duplicata
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.calculatesIcms}
              onChange={(e) =>
                setForm({ ...form, calculatesIcms: e.target.checked })
              }
            />
            Calcula ICMS
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.creditIcms}
              onChange={(e) =>
                setForm({ ...form, creditIcms: e.target.checked })
              }
            />
            Credita ICMS
          </label>
          <label className="space-y-1 text-sm sm:col-span-4">
            <span className="text-[var(--muted)]">Finalidade</span>
            <input
              value={form.purpose}
              onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              className="w-full rounded-lg border border-[var(--line)] px-3 py-2"
            />
          </label>
          <div className="flex flex-wrap gap-3 sm:col-span-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Gravando…" : "Salvar TES"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingKey(null);
                setForm(emptyForm);
              }}
              className="rounded-lg border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {saveMsg ? (
        <p className="rounded-md border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          {saveMsg}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-md border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-[var(--line)] bg-white/90">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f3f7fb] text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Código</th>
              <th className="px-4 py-3 font-semibold">Tipo</th>
              <th className="px-4 py-3 font-semibold">Texto</th>
              <th className="px-4 py-3 font-semibold">CFOP</th>
              <th className="px-4 py-3 font-semibold">Estoque</th>
              <th className="px-4 py-3 font-semibold">Dupl.</th>
              <th className="px-4 py-3 font-semibold">ICMS</th>
              <th className="px-4 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-[var(--muted)]">
                  Carregando…
                </td>
              </tr>
            ) : lines.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-[var(--muted)]">
                  Nenhuma TES em sf4990.
                </td>
              </tr>
            ) : (
              lines.map((line) => (
                <tr key={line.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-medium">{line.code}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {line.type === "E" ? "Entrada" : "Saída"}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{line.text}</p>
                    {line.purpose ? (
                      <p className="text-xs text-[var(--muted)]">
                        {line.purpose}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{line.cfop}</td>
                  <td className="px-4 py-3">
                    {line.updatesStock ? "Sim" : "Não"}
                  </td>
                  <td className="px-4 py-3">
                    {line.generatesDuplicate ? "Sim" : "Não"}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {line.calculatesIcms ? "Calc." : "—"}
                    {line.creditIcms ? " · crédito" : ""}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => startEdit(line)}
                      className="text-xs font-medium text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

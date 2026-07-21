#!/usr/bin/env python3
"""Gera SQL de seed de TES SF4 (empresa 99 → SF4990)."""

from __future__ import annotations

import subprocess
import sys

PSQL = [
    "psql",
    "-h",
    "127.0.0.1",
    "-U",
    "protheus",
    "-d",
    "protheus",
    "-At",
    "-F",
    "\t",
    "-c",
]

# codigo, tipo(E/S), texto, cf, estoque(S/N), duplic(S/N), icm, ipi, credicm, credipi, finalid
TES = [
    ("001", "E", "Compra c/estoque", "1102", "S", "S", "S", "N", "S", "N", "Compra mercadoria para revenda/estoque"),
    ("002", "E", "Compra s/estoque", "1102", "N", "S", "S", "N", "S", "N", "Compra sem atualizar estoque"),
    ("003", "E", "Compra uso/consumo", "1556", "N", "S", "S", "N", "N", "N", "Compra para uso e consumo"),
    ("004", "E", "Compra ativo imob.", "1551", "N", "S", "S", "N", "N", "N", "Compra de ativo imobilizado"),
    ("501", "S", "Venda mercadoria", "5102", "S", "S", "S", "N", "N", "N", "Venda de mercadoria"),
]


def fetch_fields() -> list[tuple[str, str, int, int]]:
    sql = (
        "SELECT rtrim(x3_campo), x3_tipo, x3_tamanho::int, x3_decimal::int "
        "FROM sx3990 WHERE rtrim(x3_arquivo)='SF4' AND d_e_l_e_t_=' ' "
        "ORDER BY x3_ordem, r_e_c_n_o_;"
    )
    out = subprocess.check_output([*PSQL, sql], text=True)
    rows: list[tuple[str, str, int, int]] = []
    seen: set[str] = set()
    for line in out.splitlines():
        if not line.strip():
            continue
        name, tipo, tam, dec = line.split("\t")
        name = name.strip()
        if not name or name in seen:
            continue
        seen.add(name)
        rows.append((name, tipo.strip(), int(tam or 0), int(dec or 0)))
    return rows


def pg_type(tipo: str, tam: int) -> tuple[str, str]:
    if tipo == "C":
        n = max(tam, 1)
        return f"character({n})", f"'{' ' * n}'::bpchar"
    if tipo == "D":
        return "character(8)", "'        '::bpchar"
    if tipo == "N":
        return "double precision", "0.0"
    if tipo == "M":
        return "text", "''::text"
    n = max(tam, 1)
    return f"character({n})", f"'{' ' * n}'::bpchar"


def pad(val: str, n: int) -> str:
    s = (val or "")[:n]
    return s + (" " * (n - len(s)))


def esc(s: str) -> str:
    return s.replace("'", "''")


def build_sql(rows: list[tuple[str, str, int, int]]) -> str:
    out: list[str] = [
        "BEGIN;",
        "DROP TABLE IF EXISTS sf4990 CASCADE;",
        "DROP SEQUENCE IF EXISTS sf4990_r_e_c_n_o__seq;",
        "CREATE TABLE sf4990 (",
    ]
    cols = []
    for name, tipo, tam, _dec in rows:
        pg_t, default = pg_type(tipo, tam)
        cols.append(f"  {name.lower()} {pg_t} NOT NULL DEFAULT {default}")
    cols += [
        "  d_e_l_e_t_ character(1) NOT NULL DEFAULT ' '::bpchar",
        "  r_e_c_n_o_ bigint NOT NULL",
        "  r_e_c_d_e_l_ bigint NOT NULL DEFAULT 0",
    ]
    out.append(",\n".join(cols))
    out.append(");")
    out += [
        "CREATE SEQUENCE sf4990_r_e_c_n_o__seq;",
        "ALTER TABLE sf4990 ALTER COLUMN r_e_c_n_o_ SET DEFAULT nextval('sf4990_r_e_c_n_o__seq');",
        "ALTER SEQUENCE sf4990_r_e_c_n_o__seq OWNED BY sf4990.r_e_c_n_o_;",
        "ALTER TABLE sf4990 ADD CONSTRAINT sf4990_pk PRIMARY KEY (r_e_c_n_o_);",
        "CREATE UNIQUE INDEX sf4990_unq ON sf4990 (f4_filial, f4_codigo, r_e_c_d_e_l_);",
        "CREATE INDEX sf49901 ON sf4990 (f4_filial, f4_codigo, r_e_c_n_o_, d_e_l_e_t_);",
        "DELETE FROM top_field WHERE field_table='SF4990';",
    ]
    for name, tipo, tam, dec in rows:
        out.append(
            "INSERT INTO top_field (field_table, field_name, field_type, field_prec, field_dec) "
            f"VALUES ('SF4990','{name}','{tipo}','{tam}','{dec}');"
        )

    sizes = {n: t for n, _tipo, t, _d in rows}
    existing = {n.lower() for n, *_ in rows}

    for codigo, tipo, texto, cf, estoque, duplic, icm, ipi, credicm, credipi, finalid in TES:
        data = {
            "f4_filial": pad("01", sizes.get("F4_FILIAL", 2)),
            "f4_codigo": pad(codigo, sizes.get("F4_CODIGO", 3)),
            "f4_tipo": pad(tipo, sizes.get("F4_TIPO", 1)),
            "f4_texto": pad(texto, sizes.get("F4_TEXTO", 20)),
            "f4_cf": pad(cf, sizes.get("F4_CF", 5)),
            "f4_estoque": pad(estoque, sizes.get("F4_ESTOQUE", 1)),
            "f4_duplic": pad(duplic, sizes.get("F4_DUPLIC", 1)),
            "f4_icm": pad(icm, sizes.get("F4_ICM", 1)),
            "f4_ipi": pad(ipi, sizes.get("F4_IPI", 1)),
            "f4_credicm": pad(credicm, sizes.get("F4_CREDICM", 1)),
            "f4_credipi": pad(credipi, sizes.get("F4_CREDIPI", 1)),
            "f4_msblql": pad("2", sizes.get("F4_MSBLQL", 1)),  # 2=ativo
            "f4_lficm": pad("S" if icm == "S" else "N", sizes.get("F4_LFICM", 1)),
            "f4_lfipi": pad("N", sizes.get("F4_LFIPI", 1)),
            "f4_poder3": pad("N", sizes.get("F4_PODER3", 1)),
            "f4_atuatf": pad("S" if codigo == "004" else "N", sizes.get("F4_ATUATF", 1)),
        }
        if "f4_finalid" in existing:
            data["f4_finalid"] = pad(finalid, sizes.get("F4_FINALID", 254))
        pairs = [(c, v) for c, v in data.items() if c in existing]
        cols_sql = ",".join(c for c, _ in pairs)
        vals_sql = ",".join(f"'{esc(v)}'" for _, v in pairs)
        out.append(f"INSERT INTO sf4990 ({cols_sql}) VALUES ({vals_sql});")

    out.append("COMMIT;")
    return "\n".join(out)


def main() -> int:
    try:
        rows = fetch_fields()
    except Exception as exc:  # noqa: BLE001
        print(f"-- erro: {exc}", file=sys.stderr)
        return 1
    print(build_sql(rows))
    print(f"-- fields={len(rows)} tes={len(TES)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

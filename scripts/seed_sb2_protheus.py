#!/usr/bin/env python3
"""Gera SQL de seed de estoque SB2 (empresa 99 → SB2990) a partir das NFs SD1."""

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


def fetch_fields() -> list[tuple[str, str, int, int]]:
    sql = (
        "SELECT rtrim(x3_campo), x3_tipo, x3_tamanho::int, x3_decimal::int "
        "FROM sx3990 WHERE rtrim(x3_arquivo)='SB2' AND d_e_l_e_t_=' ' "
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


def fetch_balances() -> list[tuple[str, str, str, float, float]]:
    """produto, armazem, descricao, quantidade, valor."""
    sql = (
        "SELECT rtrim(d.d1_cod), COALESCE(NULLIF(rtrim(d.d1_local),''),'01'), "
        "COALESCE(NULLIF(rtrim(b.b1_desc),''), rtrim(d.d1_cod)), "
        "SUM(d.d1_quant)::float8, SUM(d.d1_total)::float8 "
        "FROM sd1990 d "
        "LEFT JOIN sb1990 b ON b.d_e_l_e_t_=' ' AND rtrim(b.b1_cod)=rtrim(d.d1_cod) "
        "WHERE d.d_e_l_e_t_=' ' "
        "GROUP BY 1,2,3 ORDER BY 1,2;"
    )
    try:
        out = subprocess.check_output([*PSQL, sql], text=True)
    except subprocess.CalledProcessError:
        return []
    rows: list[tuple[str, str, str, float, float]] = []
    for line in out.splitlines():
        if not line.strip():
            continue
        parts = line.split("\t")
        if len(parts) < 5:
            continue
        cod, local, desc, qtd, val = parts[:5]
        rows.append((cod.strip(), local.strip() or "01", desc.strip(), float(qtd or 0), float(val or 0)))
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


def build_sql(rows: list[tuple[str, str, int, int]], balances: list[tuple[str, str, str, float, float]]) -> str:
    out: list[str] = [
        "BEGIN;",
        "DROP TABLE IF EXISTS sb2990 CASCADE;",
        "DROP SEQUENCE IF EXISTS sb2990_r_e_c_n_o__seq;",
        "CREATE TABLE sb2990 (",
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
        "CREATE SEQUENCE sb2990_r_e_c_n_o__seq;",
        "ALTER TABLE sb2990 ALTER COLUMN r_e_c_n_o_ SET DEFAULT nextval('sb2990_r_e_c_n_o__seq');",
        "ALTER SEQUENCE sb2990_r_e_c_n_o__seq OWNED BY sb2990.r_e_c_n_o_;",
        "ALTER TABLE sb2990 ADD CONSTRAINT sb2990_pk PRIMARY KEY (r_e_c_n_o_);",
        "CREATE UNIQUE INDEX sb2990_unq ON sb2990 (b2_filial, b2_cod, b2_local, r_e_c_d_e_l_);",
        "CREATE INDEX sb29901 ON sb2990 (b2_filial, b2_cod, r_e_c_n_o_, d_e_l_e_t_);",
        "DELETE FROM top_field WHERE field_table='SB2990';",
    ]
    for name, tipo, tam, dec in rows:
        out.append(
            "INSERT INTO top_field (field_table, field_name, field_type, field_prec, field_dec) "
            f"VALUES ('SB2990','{name}','{tipo}','{tam}','{dec}');"
        )

    sizes = {n: t for n, _tipo, t, _d in rows}
    existing = {n.lower() for n, *_ in rows}

    for cod, local, desc, qtd, val in balances:
        cm = round(val / qtd, 6) if qtd else 0.0
        data_c = {
            "b2_filial": pad("01", sizes["B2_FILIAL"]),
            "b2_cod": pad(cod, sizes["B2_COD"]),
            "b2_local": pad(local, sizes["B2_LOCAL"]),
        }
        if "b2_dprod" in existing:
            data_c["b2_dprod"] = pad(desc, sizes.get("B2_DPROD", 50))
        pairs = [(c, v) for c, v in data_c.items() if c in existing]
        col_sql = ",".join(c for c, _ in pairs)
        val_sql = ",".join(f"'{esc(v)}'" for _, v in pairs)
        extras = ""
        extra_vals = ""
        if "b2_qatu" in existing:
            extras += ",b2_qatu"
            extra_vals += f",{qtd}"
        if "b2_vatu1" in existing:
            extras += ",b2_vatu1"
            extra_vals += f",{val}"
        if "b2_cm1" in existing:
            extras += ",b2_cm1"
            extra_vals += f",{cm}"
        if "b2_qfim" in existing:
            extras += ",b2_qfim"
            extra_vals += f",{qtd}"
        out.append(
            f"INSERT INTO sb2990 ({col_sql}{extras}) VALUES ({val_sql}{extra_vals});"
        )

    out.append("COMMIT;")
    return "\n".join(out)


def main() -> int:
    try:
        rows = fetch_fields()
        balances = fetch_balances()
    except Exception as exc:  # noqa: BLE001
        print(f"-- erro: {exc}", file=sys.stderr)
        return 1
    print(build_sql(rows, balances))
    print(f"-- fields={len(rows)} balances={len(balances)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

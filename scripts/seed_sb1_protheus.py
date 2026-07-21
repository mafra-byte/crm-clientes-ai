#!/usr/bin/env python3
"""Gera SQL de seed de produtos SB1 (empresa 99 → SB1990).

Uso:
  export PGPASSWORD=Protheus.123
  python3 scripts/seed_sb1_protheus.py | psql -h 127.0.0.1 -U protheus -d protheus -v ON_ERROR_STOP=1
"""

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
        "FROM sx3990 WHERE rtrim(x3_arquivo)='SB1' AND d_e_l_e_t_=' ' "
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


# cod, desc, tipo, um, locpad, grupo, prv1
PRODUCTS = [
    ("PA0001", "Parafuso sextavado M8", "PA", "UN", "01", "0001", 1.50),
    ("PA0002", "Porca sextavada M8", "PA", "UN", "01", "0001", 0.80),
    ("MP0001", "Chapa aco 1mm", "MP", "KG", "01", "0002", 12.90),
    ("MP0002", "Tinta epoxi branca 3,6L", "MP", "LT", "01", "0002", 89.90),
    ("SV0001", "Servico de instalacao", "SV", "HR", "01", "0003", 150.00),
    ("MC0001", "Caixa embalar 40x30x20", "MC", "UN", "01", "0004", 4.25),
    ("EQ0001", "Furadeira 750W", "EQ", "UN", "01", "0005", 429.00),
    ("AI0001", "Oleo lubrificante 1L", "AI", "LT", "01", "0006", 32.50),
]


def build_sql(rows: list[tuple[str, str, int, int]]) -> str:
    out: list[str] = [
        "BEGIN;",
        "DROP TABLE IF EXISTS sb1990 CASCADE;",
        "DROP SEQUENCE IF EXISTS sb1990_r_e_c_n_o__seq;",
        "CREATE TABLE sb1990 (",
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
        "CREATE SEQUENCE sb1990_r_e_c_n_o__seq;",
        "ALTER TABLE sb1990 ALTER COLUMN r_e_c_n_o_ SET DEFAULT nextval('sb1990_r_e_c_n_o__seq');",
        "ALTER SEQUENCE sb1990_r_e_c_n_o__seq OWNED BY sb1990.r_e_c_n_o_;",
        "ALTER TABLE sb1990 ADD CONSTRAINT sb1990_pk PRIMARY KEY (r_e_c_n_o_);",
        "CREATE UNIQUE INDEX sb1990_unq ON sb1990 (b1_filial, b1_cod, r_e_c_d_e_l_);",
        "CREATE INDEX sb19901 ON sb1990 (b1_filial, b1_cod, r_e_c_n_o_, d_e_l_e_t_);",
        "CREATE INDEX sb19902 ON sb1990 (b1_filial, b1_desc, r_e_c_n_o_, d_e_l_e_t_);",
        "DELETE FROM top_field WHERE field_table='SB1990';",
    ]
    for name, tipo, tam, dec in rows:
        out.append(
            "INSERT INTO top_field (field_table, field_name, field_type, field_prec, field_dec) "
            f"VALUES ('SB1990','{name}','{tipo}','{tam}','{dec}');"
        )

    sizes = {n: t for n, _tipo, t, _d in rows}
    existing = {n.lower() for n, *_ in rows}
    for cod, desc, tipo, um, locpad, grupo, prv1 in PRODUCTS:
        data_c = {
            "b1_filial": pad("", sizes["B1_FILIAL"]),
            "b1_cod": pad(cod, sizes["B1_COD"]),
            "b1_desc": pad(desc, sizes["B1_DESC"]),
            "b1_tipo": pad(tipo, sizes["B1_TIPO"]),
            "b1_um": pad(um, sizes["B1_UM"]),
            "b1_locpad": pad(locpad, sizes["B1_LOCPAD"]),
            "b1_grupo": pad(grupo, sizes["B1_GRUPO"]),
            "b1_msblql": pad("2", sizes.get("B1_MSBLQL", 1)),
        }
        pairs = [(c, v) for c, v in data_c.items() if c in existing]
        col_sql = ",".join(c for c, _ in pairs)
        val_sql = ",".join(f"'{esc(v)}'" for _, v in pairs)
        # numeric price if column exists
        extra_cols = ""
        extra_vals = ""
        if "b1_prv1" in existing:
            extra_cols += ",b1_prv1"
            extra_vals += f",{float(prv1)}"
        out.append(
            f"INSERT INTO sb1990 ({col_sql}{extra_cols}) VALUES ({val_sql}{extra_vals});"
        )
    out.append("COMMIT;")
    return "\n".join(out)


def main() -> int:
    try:
        rows = fetch_fields()
    except Exception as exc:  # noqa: BLE001
        print(f"-- erro ao ler SX3: {exc}", file=sys.stderr)
        return 1
    print(build_sql(rows))
    print(f"-- fields={len(rows)} products={len(PRODUCTS)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env python3
"""Gera SQL de seed de solicitações de compra SC1 (empresa 99 → SC1990)."""

from __future__ import annotations

import subprocess
import sys
from datetime import date, timedelta

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
        "FROM sx3990 WHERE rtrim(x3_arquivo)='SC1' AND d_e_l_e_t_=' ' "
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


def dtos(d: date) -> str:
    return d.strftime("%Y%m%d")


# num, item, produto, descri, um, quant, vunit, solicit, obs
today = date.today()
need = today + timedelta(days=7)
SCS = [
    ("000001", "0001", "PA0001", "Parafuso sextavado M8", "UN", 100.0, 1.50, "Admin", "Repos inicial"),
    ("000001", "0002", "PA0002", "Porca sextavada M8", "UN", 100.0, 0.80, "Admin", "Repos inicial"),
    ("000002", "0001", "MP0002", "Tinta epoxi branca 3,6L", "LT", 12.0, 89.90, "Compras", "Obra torre B"),
    ("000003", "0001", "EQ0001", "Furadeira 750W", "UN", 2.0, 429.00, "Manutencao", "Repos oficina"),
    ("000004", "0001", "AI0001", "Oleo lubrificante 1L", "LT", 20.0, 32.50, "Producao", ""),
]


def build_sql(rows: list[tuple[str, str, int, int]]) -> str:
    out: list[str] = [
        "BEGIN;",
        "DROP TABLE IF EXISTS sc1990 CASCADE;",
        "DROP SEQUENCE IF EXISTS sc1990_r_e_c_n_o__seq;",
        "CREATE TABLE sc1990 (",
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
        "CREATE SEQUENCE sc1990_r_e_c_n_o__seq;",
        "ALTER TABLE sc1990 ALTER COLUMN r_e_c_n_o_ SET DEFAULT nextval('sc1990_r_e_c_n_o__seq');",
        "ALTER SEQUENCE sc1990_r_e_c_n_o__seq OWNED BY sc1990.r_e_c_n_o_;",
        "ALTER TABLE sc1990 ADD CONSTRAINT sc1990_pk PRIMARY KEY (r_e_c_n_o_);",
        "CREATE UNIQUE INDEX sc1990_unq ON sc1990 (c1_filial, c1_num, c1_item, c1_itemgrd, r_e_c_d_e_l_);",
        "CREATE INDEX sc19901 ON sc1990 (c1_filial, c1_num, c1_item, r_e_c_n_o_, d_e_l_e_t_);",
        "CREATE INDEX sc19902 ON sc1990 (c1_filial, c1_produto, r_e_c_n_o_, d_e_l_e_t_);",
        "DELETE FROM top_field WHERE field_table='SC1990';",
    ]
    for name, tipo, tam, dec in rows:
        out.append(
            "INSERT INTO top_field (field_table, field_name, field_type, field_prec, field_dec) "
            f"VALUES ('SC1990','{name}','{tipo}','{tam}','{dec}');"
        )

    sizes = {n: t for n, _tipo, t, _d in rows}
    existing = {n.lower() for n, *_ in rows}
    emis = dtos(today)
    datprf = dtos(need)

    for num, item, produto, descri, um, quant, vunit, solicit, obs in SCS:
        total = round(quant * vunit, 2)
        data_c = {
            "c1_filial": pad("01", sizes["C1_FILIAL"]),
            "c1_num": pad(num, sizes["C1_NUM"]),
            "c1_item": pad(item, sizes["C1_ITEM"]),
            "c1_itemgrd": pad("", sizes.get("C1_ITEMGRD", 3)),
            "c1_produto": pad(produto, sizes["C1_PRODUTO"]),
            "c1_descri": pad(descri, sizes["C1_DESCRI"]),
            "c1_um": pad(um, sizes["C1_UM"]),
            "c1_local": pad("01", sizes.get("C1_LOCAL", 2)),
            "c1_emissao": pad(emis, 8),
            "c1_datprf": pad(datprf, 8),
            "c1_solicit": pad(solicit, sizes.get("C1_SOLICIT", 25)),
            "c1_obs": pad(obs, sizes.get("C1_OBS", 30)),
            "c1_aprov": pad("L", sizes.get("C1_APROV", 1)),
        }
        pairs = [(c, v) for c, v in data_c.items() if c in existing]
        col_sql = ",".join(c for c, _ in pairs)
        val_sql = ",".join(f"'{esc(v)}'" for _, v in pairs)
        extras = ""
        extra_vals = ""
        if "c1_quant" in existing:
            extras += ",c1_quant"
            extra_vals += f",{quant}"
        if "c1_vunit" in existing:
            extras += ",c1_vunit"
            extra_vals += f",{vunit}"
        if "c1_total" in existing:
            extras += ",c1_total"
            extra_vals += f",{total}"
        out.append(
            f"INSERT INTO sc1990 ({col_sql}{extras}) VALUES ({val_sql}{extra_vals});"
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
    print(f"-- fields={len(rows)} lines={len(SCS)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

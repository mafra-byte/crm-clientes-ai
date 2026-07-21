#!/usr/bin/env python3
"""Gera SQL de seed de pedidos de compra SC7 (empresa 99 → SC7990)."""

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
        "FROM sx3990 WHERE rtrim(x3_arquivo)='SC7' AND d_e_l_e_t_=' ' "
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


today = date.today()
need = today + timedelta(days=10)

# num, item, produto, descri, um, quant, preco, fornece, loja, numsc, itemsc, numcot
PCS = [
    ("000001", "0001", "PA0001", "Parafuso sextavado M8", "UN", 100.0, 1.45, "000001", "01", "000001", "0001", "000001"),
    ("000001", "0002", "PA0002", "Porca sextavada M8", "UN", 100.0, 0.75, "000001", "01", "000001", "0002", "000001"),
    ("000002", "0001", "MP0002", "Tinta epoxi branca 3,6L", "LT", 12.0, 85.00, "000004", "01", "000002", "0001", "000002"),
    ("000003", "0001", "EQ0001", "Furadeira 750W", "UN", 2.0, 399.00, "000005", "01", "000003", "0001", "000003"),
]


def build_sql(rows: list[tuple[str, str, int, int]]) -> str:
    out: list[str] = [
        "BEGIN;",
        "DROP TABLE IF EXISTS sc7990 CASCADE;",
        "DROP SEQUENCE IF EXISTS sc7990_r_e_c_n_o__seq;",
        "CREATE TABLE sc7990 (",
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
        "CREATE SEQUENCE sc7990_r_e_c_n_o__seq;",
        "ALTER TABLE sc7990 ALTER COLUMN r_e_c_n_o_ SET DEFAULT nextval('sc7990_r_e_c_n_o__seq');",
        "ALTER SEQUENCE sc7990_r_e_c_n_o__seq OWNED BY sc7990.r_e_c_n_o_;",
        "ALTER TABLE sc7990 ADD CONSTRAINT sc7990_pk PRIMARY KEY (r_e_c_n_o_);",
        "CREATE UNIQUE INDEX sc7990_unq ON sc7990 (c7_filial, c7_num, c7_item, c7_sequen, c7_itemgrd, r_e_c_d_e_l_);",
        "CREATE INDEX sc79901 ON sc7990 (c7_filial, c7_num, c7_item, r_e_c_n_o_, d_e_l_e_t_);",
        "CREATE INDEX sc79902 ON sc7990 (c7_filial, c7_produto, r_e_c_n_o_, d_e_l_e_t_);",
        "DELETE FROM top_field WHERE field_table='SC7990';",
    ]
    for name, tipo, tam, dec in rows:
        out.append(
            "INSERT INTO top_field (field_table, field_name, field_type, field_prec, field_dec) "
            f"VALUES ('SC7990','{name}','{tipo}','{tam}','{dec}');"
        )

    sizes = {n: t for n, _tipo, t, _d in rows}
    existing = {n.lower() for n, *_ in rows}
    emis = dtos(today)
    datprf = dtos(need)

    for num, item, produto, descri, um, quant, preco, fornece, loja, numsc, itemsc, numcot in PCS:
        total = round(quant * preco, 2)
        data_c = {
            "c7_filial": pad("01", sizes["C7_FILIAL"]),
            "c7_num": pad(num, sizes["C7_NUM"]),
            "c7_item": pad(item, sizes["C7_ITEM"]),
            "c7_sequen": pad("001", sizes.get("C7_SEQUEN", 4)),
            "c7_itemgrd": pad("", sizes.get("C7_ITEMGRD", 3)),
            "c7_produto": pad(produto, sizes["C7_PRODUTO"]),
            "c7_descri": pad(descri, sizes["C7_DESCRI"]),
            "c7_um": pad(um, sizes["C7_UM"]),
            "c7_fornece": pad(fornece, sizes["C7_FORNECE"]),
            "c7_loja": pad(loja, sizes["C7_LOJA"]),
            "c7_numsc": pad(numsc, sizes.get("C7_NUMSC", 6)),
            "c7_itemsc": pad(itemsc, sizes.get("C7_ITEMSC", 4)),
            "c7_numcot": pad(numcot, sizes.get("C7_NUMCOT", 6)),
            "c7_emissao": pad(emis, 8),
            "c7_datprf": pad(datprf, 8),
            "c7_local": pad("01", sizes.get("C7_LOCAL", 2)),
            "c7_cond": pad("001", sizes.get("C7_COND", 3)),
            "c7_obs": pad("Pedido demo", sizes.get("C7_OBS", 30)),
            "c7_conapro": pad("L", sizes.get("C7_CONAPRO", 1)),
        }
        pairs = [(c, v) for c, v in data_c.items() if c in existing]
        col_sql = ",".join(c for c, _ in pairs)
        val_sql = ",".join(f"'{esc(v)}'" for _, v in pairs)
        extras = ""
        extra_vals = ""
        if "c7_quant" in existing:
            extras += ",c7_quant"
            extra_vals += f",{quant}"
        if "c7_preco" in existing:
            extras += ",c7_preco"
            extra_vals += f",{preco}"
        if "c7_total" in existing:
            extras += ",c7_total"
            extra_vals += f",{total}"
        if "c7_quje" in existing:
            extras += ",c7_quje"
            extra_vals += ",0"
        out.append(
            f"INSERT INTO sc7990 ({col_sql}{extras}) VALUES ({val_sql}{extra_vals});"
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
    print(f"-- fields={len(rows)} lines={len(PCS)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

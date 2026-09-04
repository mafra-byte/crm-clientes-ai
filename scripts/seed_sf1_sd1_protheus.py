#!/usr/bin/env python3
"""Gera SQL de seed de recebimento (SF1/SD1) empresa 99 → SF1990/SD1990."""

from __future__ import annotations

import subprocess
import sys
from datetime import date

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


def fetch_fields(alias: str) -> list[tuple[str, str, int, int]]:
    sql = (
        "SELECT rtrim(x3_campo), x3_tipo, x3_tamanho::int, x3_decimal::int "
        f"FROM sx3990 WHERE rtrim(x3_arquivo)='{alias}' AND d_e_l_e_t_=' ' "
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


def create_table_sql(table: str, alias_label: str, rows: list[tuple[str, str, int, int]], uniques: list[str], indexes: list[str]) -> list[str]:
    out = [
        f"DROP TABLE IF EXISTS {table} CASCADE;",
        f"DROP SEQUENCE IF EXISTS {table}_r_e_c_n_o__seq;",
        f"CREATE TABLE {table} (",
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
        f"CREATE SEQUENCE {table}_r_e_c_n_o__seq;",
        f"ALTER TABLE {table} ALTER COLUMN r_e_c_n_o_ SET DEFAULT nextval('{table}_r_e_c_n_o__seq');",
        f"ALTER SEQUENCE {table}_r_e_c_n_o__seq OWNED BY {table}.r_e_c_n_o_;",
        f"ALTER TABLE {table} ADD CONSTRAINT {table}_pk PRIMARY KEY (r_e_c_n_o_);",
        f"CREATE UNIQUE INDEX {table}_unq ON {table} ({', '.join(uniques)}, r_e_c_d_e_l_);",
    ]
    for i, idx in enumerate(indexes, start=1):
        out.append(f"CREATE INDEX {table}{i:02d} ON {table} ({idx}, r_e_c_n_o_, d_e_l_e_t_);")
    out.append(f"DELETE FROM top_field WHERE field_table='{alias_label}';")
    for name, tipo, tam, dec in rows:
        out.append(
            "INSERT INTO top_field (field_table, field_name, field_type, field_prec, field_dec) "
            f"VALUES ('{alias_label}','{name}','{tipo}','{tam}','{dec}');"
        )
    return out


today = date.today()
emis = dtos(today)

# doc, serie, item, produto, um, quant, vunit, fornece, loja, pedido, itempc
DOCS = [
    ("000000001", "1", "0001", "PA0001", "UN", 100.0, 1.45, "000001", "01", "000001", "0001"),
    ("000000001", "1", "0002", "PA0002", "UN", 100.0, 0.75, "000001", "01", "000001", "0002"),
    ("000000002", "1", "0001", "MP0002", "LT", 12.0, 85.00, "000004", "01", "000002", "0001"),
]


def main() -> int:
    try:
        sf1 = fetch_fields("SF1")
        sd1 = fetch_fields("SD1")
    except Exception as exc:  # noqa: BLE001
        print(f"-- erro ao ler SX3: {exc}", file=sys.stderr)
        return 1

    out: list[str] = ["BEGIN;"]
    out += create_table_sql(
        "sf1990",
        "SF1990",
        sf1,
        ["f1_filial", "f1_doc", "f1_serie", "f1_fornece", "f1_loja", "f1_formul"],
        ["f1_filial, f1_doc, f1_serie"],
    )
    out += create_table_sql(
        "sd1990",
        "SD1990",
        sd1,
        ["d1_filial", "d1_doc", "d1_serie", "d1_fornece", "d1_loja", "d1_item", "d1_formul", "d1_itemgrd"],
        ["d1_filial, d1_doc, d1_serie", "d1_filial, d1_pedido, d1_itempc"],
    )

    sf1_sizes = {n: t for n, _tipo, t, _d in sf1}
    sd1_sizes = {n: t for n, _tipo, t, _d in sd1}
    sf1_exist = {n.lower() for n, *_ in sf1}
    sd1_exist = {n.lower() for n, *_ in sd1}

    # group headers
    headers: dict[tuple[str, str, str, str], float] = {}
    for doc, serie, _item, _prod, _um, quant, vunit, fornece, loja, _pc, _itempc in DOCS:
        key = (doc, serie, fornece, loja)
        headers[key] = headers.get(key, 0.0) + round(quant * vunit, 2)

    for (doc, serie, fornece, loja), total in headers.items():
        data = {
            "f1_filial": pad("01", sf1_sizes["F1_FILIAL"]),
            "f1_doc": pad(doc, sf1_sizes["F1_DOC"]),
            "f1_serie": pad(serie, sf1_sizes["F1_SERIE"]),
            "f1_fornece": pad(fornece, sf1_sizes["F1_FORNECE"]),
            "f1_loja": pad(loja, sf1_sizes["F1_LOJA"]),
            "f1_formul": pad("", sf1_sizes.get("F1_FORMUL", 1)),
            "f1_tipo": pad("N", sf1_sizes.get("F1_TIPO", 1)),
            "f1_emissao": pad(emis, 8),
            "f1_dtdigit": pad(emis, 8),
            "f1_especie": pad("NF", sf1_sizes.get("F1_ESPECIE", 5)),
            "f1_cond": pad("001", sf1_sizes.get("F1_COND", 3)),
            "f1_status": pad("A", sf1_sizes.get("F1_STATUS", 1)),
        }
        pairs = [(c, v) for c, v in data.items() if c in sf1_exist]
        cols = ",".join(c for c, _ in pairs)
        vals = ",".join(f"'{esc(v)}'" for _, v in pairs)
        extras = ""
        extra_vals = ""
        if "f1_valmerc" in sf1_exist:
            extras += ",f1_valmerc"
            extra_vals += f",{total}"
        if "f1_valbrut" in sf1_exist:
            extras += ",f1_valbrut"
            extra_vals += f",{total}"
        out.append(f"INSERT INTO sf1990 ({cols}{extras}) VALUES ({vals}{extra_vals});")

    for doc, serie, item, produto, um, quant, vunit, fornece, loja, pedido, itempc in DOCS:
        total = round(quant * vunit, 2)
        data = {
            "d1_filial": pad("01", sd1_sizes["D1_FILIAL"]),
            "d1_doc": pad(doc, sd1_sizes["D1_DOC"]),
            "d1_serie": pad(serie, sd1_sizes["D1_SERIE"]),
            "d1_item": pad(item, sd1_sizes["D1_ITEM"]),
            "d1_formul": pad("", sd1_sizes.get("D1_FORMUL", 1)),
            "d1_itemgrd": pad("", sd1_sizes.get("D1_ITEMGRD", 3)),
            "d1_cod": pad(produto, sd1_sizes["D1_COD"]),
            "d1_um": pad(um, sd1_sizes["D1_UM"]),
            "d1_fornece": pad(fornece, sd1_sizes["D1_FORNECE"]),
            "d1_loja": pad(loja, sd1_sizes["D1_LOJA"]),
            "d1_local": pad("01", sd1_sizes.get("D1_LOCAL", 2)),
            "d1_pedido": pad(pedido, sd1_sizes.get("D1_PEDIDO", 6)),
            "d1_itempc": pad(itempc, sd1_sizes.get("D1_ITEMPC", 4)),
            "d1_emissao": pad(emis, 8),
            "d1_dtdigit": pad(emis, 8),
            "d1_tipo": pad("N", sd1_sizes.get("D1_TIPO", 1)),
            "d1_tes": pad("001", sd1_sizes.get("D1_TES", 3)),
            "d1_cf": pad("1102", sd1_sizes.get("D1_CF", 5)),
        }
        pairs = [(c, v) for c, v in data.items() if c in sd1_exist]
        cols = ",".join(c for c, _ in pairs)
        vals = ",".join(f"'{esc(v)}'" for _, v in pairs)
        extras = ""
        extra_vals = ""
        if "d1_quant" in sd1_exist:
            extras += ",d1_quant"
            extra_vals += f",{quant}"
        if "d1_vunit" in sd1_exist:
            extras += ",d1_vunit"
            extra_vals += f",{vunit}"
        if "d1_total" in sd1_exist:
            extras += ",d1_total"
            extra_vals += f",{total}"
        out.append(f"INSERT INTO sd1990 ({cols}{extras}) VALUES ({vals}{extra_vals});")
        # atualiza quantidade entregue no PC
        out.append(
            "UPDATE sc7990 SET c7_quje = "
            f"{quant} WHERE d_e_l_e_t_=' ' AND rtrim(c7_num)='{pedido}' AND rtrim(c7_item)='{itempc}';"
        )

    out.append("COMMIT;")
    print("\n".join(out))
    print(f"-- sf1={len(sf1)} sd1={len(sd1)} docs={len(headers)} lines={len(DOCS)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

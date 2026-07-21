#!/usr/bin/env python3
"""Gera SQL de seed de cotações de compra SC8 (empresa 99 → SC8990)."""

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
        "FROM sx3990 WHERE rtrim(x3_arquivo)='SC8' AND d_e_l_e_t_=' ' "
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
valid = today + timedelta(days=15)

# num, item, numpro, produto, descri, um, quant, preco, fornece, loja, fornome, numsc, itemsc
COTACOES = [
    ("000001", "0001", "01", "PA0001", "Parafuso sextavado M8", "UN", 100.0, 1.45, "000001", "01", "Fornecedora Alpha Pecas LTDA", "000001", "0001"),
    ("000001", "0001", "02", "PA0001", "Parafuso sextavado M8", "UN", 100.0, 1.55, "000002", "01", "Beta Embalagens ME", "000001", "0001"),
    ("000001", "0002", "01", "PA0002", "Porca sextavada M8", "UN", 100.0, 0.75, "000001", "01", "Fornecedora Alpha Pecas LTDA", "000001", "0002"),
    ("000002", "0001", "01", "MP0002", "Tinta epoxi branca 3,6L", "LT", 12.0, 85.00, "000004", "01", "Delta Insumos Quimicos", "000002", "0001"),
    ("000003", "0001", "01", "EQ0001", "Furadeira 750W", "UN", 2.0, 399.00, "000005", "01", "Epsilon TI Servicos", "000003", "0001"),
]


def build_sql(rows: list[tuple[str, str, int, int]]) -> str:
    out: list[str] = [
        "BEGIN;",
        "DROP TABLE IF EXISTS sc8990 CASCADE;",
        "DROP SEQUENCE IF EXISTS sc8990_r_e_c_n_o__seq;",
        "CREATE TABLE sc8990 (",
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
        "CREATE SEQUENCE sc8990_r_e_c_n_o__seq;",
        "ALTER TABLE sc8990 ALTER COLUMN r_e_c_n_o_ SET DEFAULT nextval('sc8990_r_e_c_n_o__seq');",
        "ALTER SEQUENCE sc8990_r_e_c_n_o__seq OWNED BY sc8990.r_e_c_n_o_;",
        "ALTER TABLE sc8990 ADD CONSTRAINT sc8990_pk PRIMARY KEY (r_e_c_n_o_);",
        "CREATE UNIQUE INDEX sc8990_unq ON sc8990 (c8_filial, c8_num, c8_item, c8_itemgrd, c8_fornece, c8_loja, c8_fornome, c8_numpro, r_e_c_d_e_l_);",
        "CREATE INDEX sc89901 ON sc8990 (c8_filial, c8_num, c8_item, r_e_c_n_o_, d_e_l_e_t_);",
        "CREATE INDEX sc89902 ON sc8990 (c8_filial, c8_produto, r_e_c_n_o_, d_e_l_e_t_);",
        "DELETE FROM top_field WHERE field_table='SC8990';",
    ]
    for name, tipo, tam, dec in rows:
        out.append(
            "INSERT INTO top_field (field_table, field_name, field_type, field_prec, field_dec) "
            f"VALUES ('SC8990','{name}','{tipo}','{tam}','{dec}');"
        )

    sizes = {n: t for n, _tipo, t, _d in rows}
    existing = {n.lower() for n, *_ in rows}
    emis = dtos(today)
    valida = dtos(valid)

    for num, item, numpro, produto, descri, um, quant, preco, fornece, loja, fornome, numsc, itemsc in COTACOES:
        total = round(quant * preco, 2)
        data_c = {
            "c8_filial": pad("01", sizes["C8_FILIAL"]),
            "c8_num": pad(num, sizes["C8_NUM"]),
            "c8_item": pad(item, sizes["C8_ITEM"]),
            "c8_itemgrd": pad("", sizes.get("C8_ITEMGRD", 3)),
            "c8_numpro": pad(numpro, sizes["C8_NUMPRO"]),
            "c8_produto": pad(produto, sizes["C8_PRODUTO"]),
            "c8_descri": pad(descri, sizes["C8_DESCRI"]),
            "c8_um": pad(um, sizes["C8_UM"]),
            "c8_fornece": pad(fornece, sizes["C8_FORNECE"]),
            "c8_loja": pad(loja, sizes["C8_LOJA"]),
            "c8_fornome": pad(fornome, sizes["C8_FORNOME"]),
            "c8_numsc": pad(numsc, sizes.get("C8_NUMSC", 6)),
            "c8_itemsc": pad(itemsc, sizes.get("C8_ITEMSC", 4)),
            "c8_emissao": pad(emis, 8),
            "c8_valida": pad(valida, 8),
            "c8_cond": pad("001", sizes.get("C8_COND", 3)),
        }
        pairs = [(c, v) for c, v in data_c.items() if c in existing]
        col_sql = ",".join(c for c, _ in pairs)
        val_sql = ",".join(f"'{esc(v)}'" for _, v in pairs)
        extras = ""
        extra_vals = ""
        if "c8_quant" in existing:
            extras += ",c8_quant"
            extra_vals += f",{quant}"
        if "c8_preco" in existing:
            extras += ",c8_preco"
            extra_vals += f",{preco}"
        if "c8_total" in existing:
            extras += ",c8_total"
            extra_vals += f",{total}"
        if "c8_prazo" in existing:
            extras += ",c8_prazo"
            extra_vals += ",7"
        if "c8_obs" in existing:
            extras += ",c8_obs"
            extra_vals += f",'{esc('Cotacao demo')}'"
        out.append(
            f"INSERT INTO sc8990 ({col_sql}{extras}) VALUES ({val_sql}{extra_vals});"
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
    print(f"-- fields={len(rows)} lines={len(COTACOES)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

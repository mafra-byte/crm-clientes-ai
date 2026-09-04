#!/usr/bin/env python3
"""Gera SQL de seed de fornecedores SA2 (empresa 99 → SA2990).

Uso:
  export PGPASSWORD=Protheus.123
  python3 scripts/seed_sa2_protheus.py | psql -h 127.0.0.1 -U protheus -d protheus -v ON_ERROR_STOP=1
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
        "FROM sx3990 WHERE rtrim(x3_arquivo)='SA2' AND d_e_l_e_t_=' ' "
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


SUPPLIERS = [
    ("000001", "01", "Fornecedora Alpha Pecas LTDA", "Alpha Pecas", "J", "Rua das Pecas 10", "Centro", "SP", "Sao Paulo", "50308", "01002000", "1133334444", "11122233000110", "vendas@alphapecas.demo.br"),
    ("000002", "01", "Beta Embalagens ME", "Beta Emb", "J", "Av Embalar 200", "Industrial", "SP", "Guarulhos", "09200", "07010000", "1122223333", "22233344000121", "contato@betaemb.demo.br"),
    ("000003", "01", "Gamma Transportes SA", "Gamma Trans", "J", "Rod Anhanguera km 30", "Logistica", "SP", "Jundiai", "23200", "13201000", "1144445555", "33344455000132", "ops@gammatrans.demo.br"),
    ("000004", "01", "Delta Insumos Quimicos", "Delta Quim", "J", "Rua Quimica 55", "Distrito", "RJ", "Duque de Caxias", "33000", "25010000", "2133332211", "44455566000143", "comercial@deltaq.demo.br"),
    ("000005", "01", "Epsilon TI Servicos", "Epsilon TI", "J", "Av Paulista 1000", "Bela Vista", "SP", "Sao Paulo", "50308", "01310000", "11988887777", "55566677000154", "suporte@epsilonti.demo.br"),
]


def build_sql(rows: list[tuple[str, str, int, int]]) -> str:
    out: list[str] = [
        "BEGIN;",
        "DROP TABLE IF EXISTS sa2990 CASCADE;",
        "DROP SEQUENCE IF EXISTS sa2990_r_e_c_n_o__seq;",
        "CREATE TABLE sa2990 (",
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
        "CREATE SEQUENCE sa2990_r_e_c_n_o__seq;",
        "ALTER TABLE sa2990 ALTER COLUMN r_e_c_n_o_ SET DEFAULT nextval('sa2990_r_e_c_n_o__seq');",
        "ALTER SEQUENCE sa2990_r_e_c_n_o__seq OWNED BY sa2990.r_e_c_n_o_;",
        "ALTER TABLE sa2990 ADD CONSTRAINT sa2990_pk PRIMARY KEY (r_e_c_n_o_);",
        "CREATE UNIQUE INDEX sa2990_unq ON sa2990 (a2_filial, a2_cod, a2_loja, r_e_c_d_e_l_);",
        "CREATE INDEX sa29901 ON sa2990 (a2_filial, a2_cod, a2_loja, r_e_c_n_o_, d_e_l_e_t_);",
        "CREATE INDEX sa29903 ON sa2990 (a2_filial, a2_cgc, r_e_c_n_o_, d_e_l_e_t_);",
        "DELETE FROM top_field WHERE field_table='SA2990';",
    ]
    for name, tipo, tam, dec in rows:
        out.append(
            "INSERT INTO top_field (field_table, field_name, field_type, field_prec, field_dec) "
            f"VALUES ('SA2990','{name}','{tipo}','{tam}','{dec}');"
        )

    sizes = {n: t for n, _tipo, t, _d in rows}
    existing = {n.lower() for n, *_ in rows}
    for cod, loja, nome, nreduz, tipo, end, bairro, est, mun, codmun, cep, tel, cgc, email in SUPPLIERS:
        data = {
            "a2_filial": pad("", sizes["A2_FILIAL"]),
            "a2_cod": pad(cod, sizes["A2_COD"]),
            "a2_loja": pad(loja, sizes["A2_LOJA"]),
            "a2_nome": pad(nome, sizes["A2_NOME"]),
            "a2_nreduz": pad(nreduz, sizes["A2_NREDUZ"]),
            "a2_tipo": pad(tipo, sizes["A2_TIPO"]),
            "a2_end": pad(end, sizes["A2_END"]),
            "a2_bairro": pad(bairro, sizes["A2_BAIRRO"]),
            "a2_est": pad(est, sizes["A2_EST"]),
            "a2_mun": pad(mun, sizes["A2_MUN"]),
            "a2_cod_mun": pad(codmun, sizes["A2_COD_MUN"]),
            "a2_cep": pad(cep, sizes["A2_CEP"]),
            "a2_tel": pad(tel, sizes["A2_TEL"]),
            "a2_cgc": pad(cgc, sizes["A2_CGC"]),
            "a2_email": pad(email, sizes["A2_EMAIL"]),
            "a2_msblql": pad("2", sizes.get("A2_MSBLQL", 1)),
            "a2_codpais": pad("105", sizes.get("A2_CODPAIS", 5)),
        }
        pairs = [(c, v) for c, v in data.items() if c in existing]
        out.append(
            f"INSERT INTO sa2990 ({','.join(c for c, _ in pairs)}) VALUES ("
            + ",".join(f"'{esc(v)}'" for _, v in pairs)
            + ");"
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
    print(f"-- fields={len(rows)} suppliers={len(SUPPLIERS)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

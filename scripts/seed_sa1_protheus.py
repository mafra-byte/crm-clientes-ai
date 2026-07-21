#!/usr/bin/env python3
"""Gera e aplica seed de clientes SA1 no PostgreSQL do Protheus (empresa 99 → SA1990).

Uso no Contabo:
  export PGPASSWORD=Protheus.123
  python3 scripts/seed_sa1_protheus.py | psql -h 127.0.0.1 -U protheus -d protheus -v ON_ERROR_STOP=1
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

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
        "FROM sx3990 WHERE rtrim(x3_arquivo)='SA1' AND d_e_l_e_t_=' ' "
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


CLIENTS = [
    ("000001", "01", "Casa Max Distribuidora LTDA", "Casa Max", "J", "R", "Rua das Industrias 100", "Centro", "SP", "Sao Paulo", "50308", "01001000", "1134567800", "12345678000190", "compras@casamax.demo.br"),
    ("000002", "01", "Mercado Bom Preco ME", "Bom Preco", "J", "F", "Av Brasil 250", "Centro", "SP", "Campinas", "09502", "13010000", "19998871122", "23456789000111", "contato@bompreco.demo.br"),
    ("000003", "01", "Construtora Horizonte SA", "Horizonte", "J", "R", "Rua da Construcao 50", "Savassi", "MG", "Belo Horizonte", "06200", "30110000", "3132214455", "34567890000122", "suprimentos@horizonte.demo.br"),
    ("000004", "01", "Padaria Pao Quente LTDA", "Pao Quente", "J", "F", "Rua do Paomeiro 12", "Mooca", "SP", "Sao Paulo", "50308", "03101000", "11987654321", "45678901000133", "financeiro@paoquente.demo.br"),
    ("000005", "01", "Tech Norte Solucoes", "Tech Norte", "J", "S", "Av Eduardo Ribeiro 800", "Centro", "AM", "Manaus", "02603", "69005040", "9233445566", "56789012000144", "ops@technorte.demo.br"),
    ("000006", "01", "Clinica Vida Plena", "Vida Plena", "J", "S", "Rua XV de Novembro 400", "Batel", "PR", "Curitiba", "06902", "80420090", "4130102020", "67890123000155", "admin@vidaplena.demo.br"),
    ("000007", "01", "Agro Sul Cooperativa", "Agro Sul", "J", "R", "Rodovia BR-116 km 20", "Distrito", "RS", "Porto Alegre", "14902", "90010000", "5135558899", "78901234000166", "comercial@agrosul.demo.br"),
    ("000008", "01", "Hotel Atlantico Plaza", "Atlantico", "J", "S", "Av Atlantica 1500", "Copacabana", "RJ", "Rio de Janeiro", "04557", "22021000", "2121991000", "89012345000177", "compras@atlantico.demo.br"),
]


def build_sql(rows: list[tuple[str, str, int, int]]) -> str:
    out: list[str] = ["BEGIN;", "DROP TABLE IF EXISTS sa1990 CASCADE;", "DROP SEQUENCE IF EXISTS sa1990_r_e_c_n_o__seq;", "CREATE TABLE sa1990 ("]
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
        "CREATE SEQUENCE sa1990_r_e_c_n_o__seq;",
        "ALTER TABLE sa1990 ALTER COLUMN r_e_c_n_o_ SET DEFAULT nextval('sa1990_r_e_c_n_o__seq');",
        "ALTER SEQUENCE sa1990_r_e_c_n_o__seq OWNED BY sa1990.r_e_c_n_o_;",
        "ALTER TABLE sa1990 ADD CONSTRAINT sa1990_pk PRIMARY KEY (r_e_c_n_o_);",
        "CREATE UNIQUE INDEX sa1990_unq ON sa1990 (a1_filial, a1_cod, a1_loja, r_e_c_d_e_l_);",
        "CREATE INDEX sa19901 ON sa1990 (a1_filial, a1_cod, a1_loja, r_e_c_n_o_, d_e_l_e_t_);",
        "CREATE INDEX sa19903 ON sa1990 (a1_filial, a1_cgc, r_e_c_n_o_, d_e_l_e_t_);",
        "CREATE INDEX sa19905 ON sa1990 (a1_filial, a1_nreduz, r_e_c_n_o_, d_e_l_e_t_);",
        "DELETE FROM top_field WHERE field_table='SA1990';",
    ]
    for name, tipo, tam, dec in rows:
        out.append(
            "INSERT INTO top_field (field_table, field_name, field_type, field_prec, field_dec) "
            f"VALUES ('SA1990','{name}','{tipo}','{tam}','{dec}');"
        )

    sizes = {n: t for n, _tipo, t, _d in rows}
    existing = {n.lower() for n, *_ in rows}
    for cod, loja, nome, nreduz, pessoa, tipo, end, bairro, est, mun, codmun, cep, tel, cgc, email in CLIENTS:
        data = {
            "a1_filial": pad("", sizes["A1_FILIAL"]),
            "a1_cod": pad(cod, sizes["A1_COD"]),
            "a1_loja": pad(loja, sizes["A1_LOJA"]),
            "a1_nome": pad(nome, sizes["A1_NOME"]),
            "a1_nreduz": pad(nreduz, sizes["A1_NREDUZ"]),
            "a1_pessoa": pad(pessoa, sizes["A1_PESSOA"]),
            "a1_tipo": pad(tipo, sizes["A1_TIPO"]),
            "a1_end": pad(end, sizes["A1_END"]),
            "a1_bairro": pad(bairro, sizes["A1_BAIRRO"]),
            "a1_est": pad(est, sizes["A1_EST"]),
            "a1_mun": pad(mun, sizes["A1_MUN"]),
            "a1_cod_mun": pad(codmun, sizes["A1_COD_MUN"]),
            "a1_cep": pad(cep, sizes["A1_CEP"]),
            "a1_tel": pad(tel, sizes["A1_TEL"]),
            "a1_cgc": pad(cgc, sizes["A1_CGC"]),
            "a1_email": pad(email, sizes["A1_EMAIL"]),
            "a1_msblql": pad("2", sizes.get("A1_MSBLQL", 1)),
            "a1_codpais": pad("105", sizes.get("A1_CODPAIS", 5)),
        }
        pairs = [(c, v) for c, v in data.items() if c in existing]
        out.append(
            f"INSERT INTO sa1990 ({','.join(c for c, _ in pairs)}) VALUES ("
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
    sql = build_sql(rows)
    if len(sys.argv) > 1 and sys.argv[1] == "--write":
        target = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("scripts/seed_sa1990_demo.sql")
        target.write_text(sql)
        print(f"wrote {target} fields={len(rows)} clients={len(CLIENTS)}", file=sys.stderr)
        return 0
    print(sql)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

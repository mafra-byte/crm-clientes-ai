## Dados no Protheus (não só no portal)

Os clientes de demo comerciais estão na tabela física **`SA1990`** do PostgreSQL
(`protheus` / empresa 99), criados a partir do dicionário SX3:

```bash
export PGPASSWORD=Protheus.123
python3 scripts/seed_sa1_protheus.py | psql -h 127.0.0.1 -U protheus -d protheus -v ON_ERROR_STOP=1
# ou no servidor: /totvs/protheus_2410/tools/seed_sa1990_demo.sql
```

O portal, com `PROTHEUS_PG_*` no `.env`, lista e **cria** clientes em
`/clientes` → **Novo cliente** (`POST /api/clients/live`), gravando na `SA1990`.

## Fornecedores SA2

Tabela física **`SA2990`**:

```bash
export PGPASSWORD=Protheus.123
python3 scripts/seed_sa2_protheus.py | psql -h 127.0.0.1 -U protheus -d protheus -v ON_ERROR_STOP=1
```

Portal: `/fornecedores` → listar e **Novo fornecedor** (`POST /api/suppliers/live`).

## Produtos SB1

Tabela física **`SB1990`**:

```bash
export PGPASSWORD=Protheus.123
python3 scripts/seed_sb1_protheus.py | psql -h 127.0.0.1 -U protheus -d protheus -v ON_ERROR_STOP=1
```

Portal: `/produtos` → listar e **Novo produto** (`POST /api/products/live`).

## Solicitação de compras SC1

Tabela física **`SC1990`**:

```bash
export PGPASSWORD=Protheus.123
python3 scripts/seed_sc1_protheus.py | psql -h 127.0.0.1 -U protheus -d protheus -v ON_ERROR_STOP=1
```

Portal: `/solicitacoes-compra` → listar e **Nova solicitação** (`POST /api/purchase-requests/live`).

## Cotação de compras SC8

Tabela física **`SC8990`**:

```bash
export PGPASSWORD=Protheus.123
python3 scripts/seed_sc8_protheus.py | psql -h 127.0.0.1 -U protheus -d protheus -v ON_ERROR_STOP=1
```

Portal: `/cotacoes-compra` → listar e **Nova cotação** (`POST /api/purchase-quotes/live`).

## Pedido de compras SC7

Tabela física **`SC7990`**:

```bash
export PGPASSWORD=Protheus.123
python3 scripts/seed_sc7_protheus.py | psql -h 127.0.0.1 -U protheus -d protheus -v ON_ERROR_STOP=1
```

Portal: `/pedidos-compra` → listar e **Novo pedido** (`POST /api/purchase-orders/live`).

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

Pedidos de venda (`SC5`) ainda não foram seedados no ERP (dependem de produto,
TES etc.). O painel pode continuar mostrando pedidos do cache demo do portal.

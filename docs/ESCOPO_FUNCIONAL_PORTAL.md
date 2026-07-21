# Escopo funcional do portal CRM → Protheus (empresa 99)

Complemento ao handoff de infraestrutura. O portal **já existe** em
`https://protheus.ccskf.net` (repo `crm-clientes-ai`, app em `/var/www/protheus`).
Não instalar Protheus genérico do zero — o ERP 12.1.2410 + empresa 99 já estão no ar.

## Objetivo de integração (alvo)

Gravações oficiais via **REST/WebService + `MsExecAuto`** (não `INSERT` direto no PG).
Hoje as writes live ainda vão por PostgreSQL; leituras live também.

## Módulos / rotas do portal

| Portal | Rota UI | API | Tabela PG | Rotina MsExecAuto (alvo) | CRUD hoje |
|--------|---------|-----|-----------|--------------------------|-----------|
| Clientes | `/clientes` | `/api/clients/live` | `SA1990` | `MATA030` | list / create / **edit** (PUT) via PG |
| Fornecedores | `/fornecedores` | `/api/suppliers/live` | `SA2990` | `MATA020` | list / create / edit via PG |
| Produtos | `/produtos` | `/api/products/live` | `SB1990` | `MATA010` | list / create / edit via PG |
| TES | `/tes` | `/api/tes/live` | `SF4990` | (cadastro SF4 — rotina padrão TES) | list / create / edit via PG |
| Solic. compras | `/solicitacoes-compra` | `/api/purchase-requests/live` | `SC1990` | (SC / compras — ex. Mata110-like) | list / create / edit* via PG |
| Cotação | `/cotacoes-compra` | `/api/purchase-quotes/live` | `SC8990` | (cotação compras) | list / create / edit* via PG |
| Ped. compras | `/pedidos-compra` | `/api/purchase-orders/live` | `SC7990` | (pedido compras) | list / create / edit* via PG |
| Recebimento NF | `/recebimento` | `/api/purchase-receipts/live` | `SF1990`/`SD1990` | `MATA103` (alvo) | list / create via PG — **sem edit livre** |
| Estoque | `/estoque` | `/api/stock/live` | `SB2990` | (saldo; sobe via NF se `F4_ESTOQUE=S`) | **somente leitura** |
| Kanban compras | `/fluxo-compras` | `/api/purchase-pipeline/live` | agregado SC1/SC8/SC7/SF1 | — | leitura |
| Integrações | `/integracoes` | `/api/protheus/*` | — | OAuth/sync REST (legado) | status / test / sync |
| Login portal | `/login` | `/api/auth/*` | Prisma local | — | Admin / `Protheus.123` |

\* Edit só se documento ainda não estiver fechado/encadeado (cotação/pedido/encerrado).

## Encadeamento de negócio (compras)

```
SC1 (solicitação)
  → SC8 (cotação)        grava C1_COTACAO
    → SC7 (pedido)       grava C8_NUMPED/C8_ITEMPED + C1_PEDIDO/C1_ITEMPED/C1_QUJE
      → SF1/SD1 (NF)     atualiza C7_QUJE; C7_ENCER='E' se saldo zero
        → SB2 (estoque)  só se TES F4_ESTOQUE='S'
```

## Integração TES no fluxo

1. Produto `B1_TE` → valida SF4  
2. Pedido `C7_TES` herda `B1_TE` (ou override)  
3. NF `D1_TES`/`D1_CF` herdam `C7_TES` → SF4 (`F4_CF`, `F4_ESTOQUE`)  
Resolução no recebimento: override tela → `C7_TES` → `B1_TE` → `001`

## Ambiente / paths

| Item | Valor |
|------|-------|
| Host | `213.199.51.121` |
| Portal | `https://protheus.ccskf.net` → PM2 `protheus` :3010 |
| AppServer | `/totvs/protheus_2410/protheus/bin/appserver` |
| Data | `/totvs/protheus_2410/protheus_data` |
| Empresa / Filial | `99` / `01` |
| PG | db/user `protheus` |
| REST alvo | `https://protheus.ccskf.net/rest/` → `127.0.0.1:8081` |
| Branch git | `cursor/protheus-crm-b431` (PR #2) |

## Libs do portal (código)

- REST client legado: `src/lib/protheus/client.ts` (OAuth + GET customers/orders)  
- Writes atuais: `src/lib/protheus/{pg,sa2,sb1,sf4,sc1,sc8,sc7,receipt,sb2,pipeline}.ts`  
- UI com Editar: `ClientesView`, `FornecedoresView`, `ProdutosView`, `TesView`, `SolicitacoesCompraView`, `CotacoesCompraView`, `PedidosCompraView`

## Fora de escopo (não quebrar / não “reinstalar”)

- Casamax, Davi, noite-*, agendamento e demais sites no mesmo host  
- License Server Virtual  
- WebApp/SIGACFG da empresa 99 já bootstrapada  
- Snapshot antes de mudar `appserver.ini` / HTTPJOB / containers  

## Critério de sucesso (integração oficial)

1. `POST/PUT` de cliente no portal → REST Protheus → `MsExecAuto`/`MATA030` → registro em `SA1990` com regras do ERP  
2. Mesmo padrão para fornecedor, produto e, em seguida, fluxo de compras  
3. Leituras podem continuar via PG no curto prazo; writes **não** podem ser SQL direto no estado final  

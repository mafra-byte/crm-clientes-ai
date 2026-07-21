# Roteiro de demo comercial

URL: https://protheus.ccskf.net/login  
Usuário: **Admin** · Senha: **Protheus.123**

## Pitch em 5 minutos

1. **Login** — portal próprio, sem SmartClient / WebApp.
2. **Painel** — clientes, pedidos e receita importada do ERP.
3. **Clientes** — busca; dados vêm da tabela **SA1 do Protheus** (não só do portal).
4. **Pedidos** — status e valores (cache demo no portal até seed SC5).
5. **Protheus** — testar conexão e sincronizar.

## Mensagem central

> O time comercial e administrativo acessa o Protheus por um portal web moderno via API REST — sem instalar cliente, sem depender da tela do ERP.

## Fluxo de compras (ao vivo no PostgreSQL)

1. Fornecedores SA2 → Produtos SB1  
2. Solic. compras SC1 → Cotação SC8 → Pedido SC7  
3. **Recebimento SF1/SD1** (`/recebimento`) a partir do PC  

## Próximos módulos (roadmap)

Plano de contas · Pedidos de venda SC5 ao vivo · Estoque.

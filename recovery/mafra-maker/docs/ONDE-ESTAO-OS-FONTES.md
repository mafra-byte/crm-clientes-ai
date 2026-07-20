# Onde estão os fontes (recuperação)

## Produção (NÃO apagada)
- URL: https://maker.ccskf.com.br
- Alias: https://ccskf.com.br/maker
- Hosting: KingHost `web36f63.kinghost.net` (177.12.171.138)
- FTP DNS: ftp.ccskf.com.br
- Health: `/api/v1/health` → version 1.3.8, database online, 7 agents, 46 tools

## Caminho no servidor (indicado pela própria API)
- Pasta do app: `maker/`
- Token IA: `maker/data/ia.token`

## VPS (Cursor Desktop / SSH)
- Pasta observada no IDE: `/home/administrador/`
- CRM local aparente: `/home/administrador/crm-clientes-ai/` (tem migrations até 029 — mais avançado que o GitHub)
- Procurar também: `/home/administrador/maker`, `/home/administrador/mafra-maker`, `/home/administrador/www/maker`

## GitHub
- Maker: **nunca foi commitado** (até este snapshot de recuperação)
- CRM ML: https://github.com/mafra-byte/crm-clientes-ai/pull/1 (branch `cursor/mercado-livre-integracao-77e0`)

## Como baixar os PHP agora (obrigatório)
1. Painel KingHost → Gerenciador de Arquivos **ou** FTP `ftp.ccskf.com.br`
2. Entrar na pasta `maker/` (ou www/maker)
3. Compactar TUDO (php, data, api, assets) e baixar
4. Enviar o zip neste repositório / abrir agente Cursor com a pasta local

Este diretório `recovery/` guarda o que dá para salvar **sem FTP**: HTML público, CSS, OpenAPI completo, manual de estoque e inventário.

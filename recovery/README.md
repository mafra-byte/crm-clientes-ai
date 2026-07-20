# Backup de emergência — CCSKF / Mafra Maker + CRM

Snapshot gerado em 2026-07-20 a partir da **produção** (HTTP), porque este Cloud Agent não tem acesso ao VPS `/home/administrador` nem ao FTP KingHost.

## O que está salvo aqui
- `mafra-maker/api-specs/` — OpenAPI completo (ChatGPT gateway 1.3.8, estoque 1.4.2, API v1)
- `mafra-maker/public/` — páginas públicas (HTML/CSS) do portal
- `mafra-maker/docs/INVENTARIO-API.md` — lista de endpoints recuperados
- `mafra-maker/docs/ONDE-ESTAO-OS-FONTES.md` — mapa de onde pegar o PHP
- `crm-status/STATUS.md` — o que já está no GitHub vs VPS

## O que AINDA precisa baixar (fontes PHP + banco)
1. **KingHost FTP** `ftp.ccskf.com.br` → pasta `maker/` (código PHP, `data/`, configs)
2. **VPS** `/home/administrador/maker*` e `/home/administrador/crm-clientes-ai`
3. Dump do MySQL/MariaDB do Maker no painel KingHost

## Produção verificado OK
```
GET https://maker.ccskf.com.br/api/v1/health
→ status ok, database online, version 1.3.8, agents 7, tools 46
```

Nada foi apagado em produção. Este pacote evita perda do **contrato da API** e da **UI pública** enquanto os PHP não forem baixados.

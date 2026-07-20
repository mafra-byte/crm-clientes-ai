# Ambiente apartado do Protheus

O Protheus **não deve alterar** Casamax, Davi nem demais sistemas do servidor.

## Escopo permitido

| Recurso | Caminho / nome |
|---------|----------------|
| ERP | `/totvs/protheus_2410/**` |
| CRM | `/var/www/protheus/**` |
| ODBC | `/totvs/protheus_2410/odbc/**` (`ODBCINI`) |
| systemd | `protheus-dbaccess`, `protheus-appserver`, `protheus-sandbox-firewall` |
| nginx | somente site `protheus.ccskf.net` |
| PostgreSQL | somente database/user `protheus` |
| PM2 | somente processo `protheus` |

## Não alterar

- Docker: `casamax_*`, `davi_caminhoes`, Supabase, etc.
- Nginx: `casamax*`, `davi_caminhoes.conf`, `agendasync`, …
- PM2: `agendamento`, `noite-backend`, `noite-frontend`
- Bancos: `casamax`, `davi`, e demais databases existentes
- `/etc/odbc.ini` global (DSN do Protheus fica só no sandbox)

## Portas (localhost na borda)

`1234`, `4321`, `8081`, `7890`, `3010` — bloqueadas de fora via iptables (`protheus-sandbox`).  
Acesso público apenas por HTTPS no nginx (`protheus.ccskf.net`).

## Checklist rápido

```bash
# apps existentes
curl -skI https://casamax.i16br.com/ | head -1
curl -skI https://davicaminhoes.i16br.com/ | head -1

# sandbox
systemctl is-active protheus-dbaccess protheus-appserver
curl -skI https://protheus.ccskf.net/ | head -1
```

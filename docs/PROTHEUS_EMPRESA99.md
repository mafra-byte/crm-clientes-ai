# Protheus ERP 12.1.2410 — Empresa 99 (Linux)

Instalação no servidor Contabo (`213.199.51.121`) com grupo de empresas **99** (ambiente de testes).

## Serviços (systemd)

```bash
systemctl status protheus-dbaccess protheus-appserver
systemctl restart protheus-dbaccess protheus-appserver
```

| Serviço | Porta | Função |
|---------|-------|--------|
| DBAccess | 7890 | Ponte ODBC → PostgreSQL |
| AppServer TCP | 1234 | SmartClient |
| WebApp | 4321 | SmartClient browser |
| REST 2.0 | 8081 | APIs `/rest` |

## URLs públicas

- CRM: https://protheus.ccskf.net
- WebApp: https://protheus.ccskf.net/webapp/
- REST (login): https://protheus.ccskf.net/rest/

## Banco

- PostgreSQL: database/user `protheus` / senha `Protheus.123`
- ODBC DSN: `protheus`
- ClientLibrary: `/usr/lib/x86_64-linux-gnu/libodbc.so.2`

## Paths

- AppServer: `/totvs/protheus_2410/protheus/bin/appserver`
- Data: `/totvs/protheus_2410/protheus_data`
- DBAccess: `/totvs/protheus_2410/dbaccess`
- RPO: `/totvs/protheus_2410/protheus/apo/tttm120.rpo`

## Criar empresa 99

1. Abra https://protheus.ccskf.net/webapp/
2. Ambiente: `environment`
3. Módulo **SIGACFG** (Configurador)
4. Cadastre grupo de empresas **99** (teste, até 2 usuários sem consumir licença)
5. Cadastre filial **01**
6. Defina usuário Admin + senha (REST usa `SECURITY=1`)

## Referências usadas

- TDN: Instalador Protheus Linux 12.1.2410
- TDN / Docker EngPro: Postgres + unixODBC + DBAccess + AppServer
- Central TOTVS: base de teste grupo empresas 99
- REST 2.0: seções `HTTPV11`, `HTTPREST`, `HTTPURI`, `HTTPJOB`, `ONSTART`

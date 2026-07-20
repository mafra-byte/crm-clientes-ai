# Protheus ERP 12.1.2410 — Empresa 99 (Linux)

Instalação no servidor Contabo (`213.199.51.121`) com grupo de empresas **99** (ambiente de testes). Isolado do Casamax/Davi.

## Serviços (systemd)

```bash
systemctl status protheus-dbaccess protheus-appserver protheus-license
systemctl restart protheus-dbaccess protheus-appserver protheus-license
```

| Serviço | Porta | Função |
|---------|-------|--------|
| DBAccess | 7890 | Ponte ODBC → PostgreSQL |
| AppServer TCP / MPP | 1234 | SmartClient + TFace `/app-root` |
| WebApp | 4321 | SmartClient browser |
| REST 2.0 | 8081 | APIs `/rest` |
| License Server Virtual | 5555 (listener), 2234 (TCP), 8020 (monitor) | Licenciamento local |

Portas ERP/License bloqueadas de fora via iptables; acesso público só via nginx HTTPS.

## URLs públicas

- CRM: https://protheus.ccskf.net
- WebApp: https://protheus.ccskf.net/webapp/
- REST (login): https://protheus.ccskf.net/rest/
- License monitor (localhost): http://127.0.0.1:8020/

## Banco

- PostgreSQL: database/user `protheus` / senha `Protheus.123`
- ODBC DSN isolado: `/totvs/protheus_2410/odbc/` (`ODBCINI` / `ODBCSYSINI`)
- ClientLibrary: `/usr/lib/x86_64-linux-gnu/libodbc.so.2`

## Paths

- AppServer: `/totvs/protheus_2410/protheus/bin/appserver`
- Data: `/totvs/protheus_2410/protheus_data`
- DBAccess: `/totvs/protheus_2410/dbaccess`
- RPO: `/totvs/protheus_2410/protheus/apo/tttm120.rpo`
- License Server: `/totvs/totvslicensevirtual/`

## Empresa 99 — estado atual

Já no banco (`sys_company`):

| Campo | Valor |
|-------|-------|
| Grupo / código | `99` |
| Filial | `01` |
| Nome empresa | `TESTE` |
| Nome filial | `MATRIZ` |
| SpecialKey AppServer | `EMPRESA99` |

License Server Virtual instalado e AppServer apontando `[LICENSECLIENT] 127.0.0.1:5555`. Para empresa 99 de teste **não é necessário TOTVS ID**.

### Pendente (login / Admin)

O WebApp abre a tela de login TFace, mas o login Admin ainda falha porque as tabelas `SYS_USR_*` / `SYS_GRP_*` foram criadas como stubs (existência) e o OpenTable do framework exige índices/metadados TOP nativos.

Próximo passo manual ou automatizado:

1. Abrir https://protheus.ccskf.net/webapp/ → `SIGACFG` / `ENVIRONMENT`
2. Se o login falhar com “Index not found” em `SYS_USR_GROUPS`, dropar as stubs `sys_usr_*` / `sys_grp_*` (exceto `sys_usr`, `sys_usr_paneis`, `sys_grp_paneis`) e deixar o SIGACFG recriar via **Ambiente → Base de Dados → Atualizar** numa sessão que já tenha Admin — ou recriar Admin pelo fluxo oficial TOTVS (reset com token se necessário)
3. Criar usuário **Admin** + senha e gravar no `.env` do CRM (`PROTHEUS_PASSWORD`)
4. Testar sync em https://protheus.ccskf.net → Protheus

Scripts de automação no servidor: `/totvs/protheus_2410/tools/` (`sigacfg*.js`).

## Referências usadas

- TDN: Instalador Protheus Linux 12.1.2410
- TDN: License Server Virtual (silent `install 2` / IzPack `-options-auto`)
- Central TOTVS: base de teste grupo empresas 99 (`01 - MATRIZ`)
- REST 2.0: seções `HTTPV11`, `HTTPREST`, `HTTPURI`, `HTTPJOB`, `ONSTART`

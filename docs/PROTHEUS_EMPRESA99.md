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
- Atalho: https://protheus.ccskf.net/abrir-protheus.html
- WebApp (Configurador): https://protheus.ccskf.net/webapp/?StartProg=SIGACFG&Env=ENVIRONMENT
- REST (login): https://protheus.ccskf.net/rest/
- License monitor (localhost): http://127.0.0.1:8020/

### Nginx (HTTPS / acesso remoto)

O WebApp atrás do nginx HTTPS precisa de três ajustes (só no site `protheus.ccskf.net`):

1. **CSP `upgrade-insecure-requests`** em `/webapp/` — o AppServer manda o iframe TFACE como `http://host:443/app-root/...`; sem isso o Chrome/Safari bloqueia (tela branca / Mixed Content).
2. **`proxy_set_header Origin ""`** em `/app-root/` — com header `Origin` (scripts `type=module`) o AppServer responde **401** nos JS do login.
3. **WebSocket**: `proxy_http_version 1.1` + `Upgrade` / `Connection $connection_upgrade` e timeouts longos em `/webapp/`.

No hotel/Wi‑Fi instável: preferir **4G/hotspot**, Chrome anônimo, e esperar o primeiro **Entrar** (pode ficar em “Carregando...” vários minutos enquanto cria o dicionário `SX*990` da empresa 99).

## Banco

- PostgreSQL: database/user `protheus` / senha `Protheus.123`
- Encoding `LATIN1`, collation/ctype `C`
- ODBC DSN isolado: `/totvs/protheus_2410/odbc/` (`ODBCINI` / `ODBCSYSINI`)
- Driver: PostgreSQL **ANSI** (`psqlodbca.so`) + `ODBC30=1` no `dbaccess.ini`
- ClientLibrary: `/usr/lib/x86_64-linux-gnu/libodbc.so.2`

### TOP_FIELD (crítico)

O DBAccess lê `FIELD_PREC` / `FIELD_DEC` com `FieldAsPChar`. Se essas colunas forem `smallint`, o thread cai com:

`Invalid Null ContentPrt on FieldAsPChar(4)` → `NO CONNECTION` no `FWTBLCREATE`.

Schema correto (script no servidor: `/totvs/protheus_2410/tools/ensure_top_field.sql`):

```sql
CREATE TABLE public.TOP_FIELD (
  FIELD_TABLE varchar(50) NOT NULL,
  FIELD_NAME  varchar(50) NOT NULL,
  FIELD_TYPE  char(1) NOT NULL,
  FIELD_PREC  varchar(4) NOT NULL,
  FIELD_DEC   varchar(4) NOT NULL
);
CREATE UNIQUE INDEX TOP_FIELDI ON public.TOP_FIELD (FIELD_TABLE, FIELD_NAME);
```

Deixar o DBAccess criar as demais `TOP_*` no `InitialCheckUp`. Não inventar stubs `SYS_*`.

## Paths

- AppServer: `/totvs/protheus_2410/protheus/bin/appserver`
- Data: `/totvs/protheus_2410/protheus_data`
- DBAccess: `/totvs/protheus_2410/dbaccess`
- RPO: `/totvs/protheus_2410/protheus/apo/tttm120.rpo`
- License Server: `/totvs/totvslicensevirtual/`

## Empresa 99 — estado

| Campo | Valor |
|-------|-------|
| Grupo / código | `99` |
| Filial | `01` |
| Nome empresa | `TESTE` |
| Nome filial | `MATRIZ` |
| SpecialKey AppServer | `EMPRESA99` |
| StartSysInDB | `1` |

License Server Virtual em `[LICENSECLIENT] 127.0.0.1:5555`. Para empresa 99 de teste **não é necessário TOTVS ID**.

## Login Admin (PO UI / Protheus Séries)

Na interface nova (PO UI), o botão **Entrar** só habilita com senha preenchida.

1. Primeiro acesso: usuário `Admin`, senha **em branco** → digitar um **espaço** no campo senha (como nos vídeos Protheus Séries / TDN PO UI).
2. O sistema abre **Alterar senha** (usuário `Administrador`).
3. Senha atual: espaço; nova senha: a desejada (sandbox: `Protheus.123`).
4. Em **session-settings**: Grupo `99` / Filial `01` / Ambiente Configurador → **Entrar**.

Credenciais CRM (`.env` em `/var/www/protheus`):

- `PROTHEUS_USERNAME=Admin`
- `PROTHEUS_PASSWORD=Protheus.123`
- `PROTHEUS_EMPRESA=99`
- `PROTHEUS_FILIAL=01`

## Próximos passos opcionais

1. Em SIGACFG: Ambiente → Base de Dados → Atualizar (dicionário SX completo, se ainda faltar).
2. Configurar REST OAuth / rotas de clientes e pedidos conforme APIs disponíveis.
3. Testar sync no CRM: https://protheus.ccskf.net → Protheus.

Scripts de automação no servidor: `/totvs/protheus_2410/tools/`.

## Referências

- TDN: Nova interface PO UI (senha em branco = digitar espaço)
- TDN: StartSysInDB / dicionário no banco
- TDN: ODBC PostgreSQL Linux (ANSI + ByteaAsLongVarBinary etc.)
- Central TOTVS: base de teste grupo 99 (`01 - MATRIZ`)
- Protheus Séries (YouTube): primeiro login Admin + espaço

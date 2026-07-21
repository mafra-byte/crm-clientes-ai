# Handoff Protheus → Cursor (estado + diagnóstico)

Documento operacional no repo. O handoff completo de 216 linhas do Mac
**ainda não foi colado** neste chat; este arquivo registra o que o Cursor
validou no servidor e aponta o escopo funcional.

Escopo do portal: [`ESCOPO_FUNCIONAL_PORTAL.md`](./ESCOPO_FUNCIONAL_PORTAL.md).

## Regra: não quebrar

Não tocar sem snapshot / plano explícito:

- Casamax, Davi caminhões, noite-backend/frontend, agendamento
- License Server Virtual (`/totvs/totvslicensevirtual`)
- PostgreSQL dados empresa 99 já populados
- Portal PM2 `protheus` em `/var/www/protheus` (portal CRM)

Host: `213.199.51.121` · Portal: `https://protheus.ccskf.net`  
AppServer: `/totvs/protheus_2410/protheus/bin/appserver`

## Passo 1 — religar REST (EXECUTADO)

| Antes | Agora |
|-------|--------|
| 502 / nada na 8081 (`HTTPV11 Enable=0` `;temp disabled`) | **8081 escuta**, `HTTPV11 is ready` |
| — | `GET http://127.0.0.1:8081/rest/` → **timeout** (0 bytes) |

Config atual relevante:

```
[HTTPV11] Enable=1 / Sockets=HTTPREST
[HTTPREST] Port=8081 SECURITY=0
[HTTPURI] URL=/rest PrepareIn=99,01 Instances=1,2 Stateless=1
[ONSTART] Jobs=HTTPJOB
[HTTPJOB] MAIN=HTTP_START ENVIRONMENT=environment
```

Pool observado em restart anterior: `HTTPREST.TP|HTTPREST|HTTPURI@99|FALSE`
(Prepare da empresa 99 **não** fica pronto).

## Verificação pós-trava (21/07/2026 ~17:02 BRT)

Comando pedido no handoff, logo após chamada travada:

```bash
tail -50 console.log | grep -iE "homologado|THREAD ERROR|LSPULSE|Sync error"
```

**Resultado:** nenhum match de `homologado`, `THREAD ERROR`, `LSPULSE` ou
`Sync error` no `console.log` durante a trava.

O que o log mostrou na trava: spam de `*** Loading .../dbapi.so` em threads
novas — pedido fica pendurado sem resposta HTTP.

Host OS: **Ubuntu 22.04.3 LTS** (`/etc/os-release`).

### Evidência histórica (não confundir com a trava de agora)

Em `/totvs/protheus_2410/protheus_data/system/error.log` (madrugada):

- `THREAD ERROR (... TP|HTTPREST|HTTPURI@99|FALSE ...)`
- `Ctree Error - ctThrdAttach failed - Error: 738`

Isso é compatível com falha de **LocalFiles=CTREE** no job REST, não prova
sozinha a mensagem “SO não homologado”.

### Leitura (honesta)

| Hipótese | Status |
|----------|--------|
| SO não homologado (JobThread REST) | **Não confirmada** no `console.log` desta trava |
| PrepareIn 99 nunca completa (`@99\|FALSE`) | **Observada** |
| Ctree 738 no HTTPJOB / pool REST | **Histórica** (error.log madrugada) |
| Sync error WebSocket | Não apareceu nesta trava REST |

**Conclusão do passo 1:** falhou (trava ≠ 502).  
**Conclusão para passo 2 (contêiner OL8):** **bloqueado pela ETAPA 0.**

Roteiro completo: [`INSTALACAO_OL8_CONTAINER.md`](./INSTALACAO_OL8_CONTAINER.md).

ETAPA 0 refeita (exata do roteiro, ~17:12 BRT): grep → **nada** →
interpretação oficial = *REST não está nem tentando / investigar PrepareIn*
→ **não montar contêiner**.

Próximo barato (sem contêiner):

1. Investigar PrepareIn `99,01` e pool `HTTPURI@99|FALSE`
2. Investigar Ctree 738 nos jobs REST (`LocalFiles=CTREE`)
3. Só retomar ETAPA 1 (snapshot + OL8) se aparecer `não homologado`

## O que funciona hoje

- WebApp / login Admin empresa 99
- Dicionário / SX*990
- Portal CRM com writes **via PostgreSQL** (SA1/SA2/SB1/SC1/SC8/SC7/SF1/SD1/SB2/SF4)
- Botão Editar nos cadastros (PUT live)

## O que não funciona

- REST oficial `/rest/` respondendo
- Portal → WebService → `MsExecAuto` (ainda não implementado; depende do REST)

## Escopo funcional (atendível?)

Sim, pelo ambiente atual **via PG**. Alvo oficial (`MsExecAuto`) exige REST
saudável + fontes WSRESTFUL compiladas. Ver tabela completa em
`ESCOPO_FUNCIONAL_PORTAL.md`.

Prioridade de rotinas alvo quando REST estiver ok:

1. `MATA030` clientes · `MATA020` fornecedores · `MATA010` produtos  
2. Fluxo compras + `MATA103` NF  
3. TES / estoque conforme regras SF4  

## Segurança (pendências conhecidas)

- Senha Admin / root já circulou em docs e chats — rotacionar  
- Página pública com senha (se ainda existir) — remover  
- Sem swap no host (23 Gi RAM)  
- Não republicar credenciais em HTML estático  

## Para quem escreveu o handoff de 216 linhas

Cole o markdown completo neste arquivo (substituindo/mesclando) ou em
mensagem no Cursor. Sem o texto integral, o Cursor registrou só o
diagnóstico acima + link ao escopo funcional.

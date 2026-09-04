# Instalação — contêiner Oracle Linux 8 para Protheus

Roteiro colado pelo time. **ETAPA 0 é obrigatória** antes de qualquer obra.

## ETAPA 0 — resultado Cursor (2026-07-21 ~17:12 BRT)

```text
curl -m 20 http://127.0.0.1:8081/rest/  → timeout (travou)
tail -80 console.log | grep -iE "homologado|THREAD ERROR|LSPULSE|Sync error|PrepareIn"
→ (nenhum match)
```

Linha nova no console durante a trava: apenas `*** Loading .../dbapi.so`.

**Interpretação pela tabela do roteiro: caso `nada`.**

| Aparece | Ação prescrita |
|---------|----------------|
| `não homologado` | seguir etapa 1 (contêiner) |
| `Sync error` | **parar** |
| `THREAD ERROR` sem SO | **parar** |
| **nada** ← **atual** | **parar** — verificar `[HTTPURI] PrepareIn` e `Instances` |

**Decisão: NÃO montar contêiner.** Montar agora viola a ETAPA 0.

Evidência lateral (não substitui a ETAPA 0):

- Pool histórico: `HTTPURI@99|FALSE` + `Ctree Error 738` em `error.log` (madrugada)
- Host: Ubuntu 22.04.3; `dpkg -V base-files` ainda acusa `/usr/lib/os-release` modificado
- Nested virt: ausente (contêiner seria LXC/Docker se um dia autorizado)
- Casamax/portal em 200 durante o teste

## Próximo (barato, sem contêiner)

1. Investigar por que PrepareIn da empresa 99 não completa (`@99|FALSE`)
2. Avalidar Ctree nos jobs REST (`LocalFiles=CTREE`)
3. Só retomar ETAPA 1 se a ETAPA 0 passar a mostrar `não homologado`

---

## Texto original do roteiro (referência)

### ETAPA 0 — Confirmar a causa antes de construir (obrigatório)

Não montar contêiner sem isto. Se a causa não for a trava de SO, o contêiner
não resolve e o trabalho é perdido.

```bash
cd /totvs/protheus_2410/protheus/bin/appserver
wc -l console.log
curl -m 20 -i http://127.0.0.1:8081/rest/ ; echo "---travou acima---"
tail -80 console.log | grep -iE "homologado|THREAD ERROR|LSPULSE|Sync error|PrepareIn"
```

Só prosseguir no primeiro caso (`não homologado`).

### ETAPA 1 — Snapshot Contabo

### ETAPA 2 — Nested virt (opcional)

### ETAPA 3 — Contêiner OL8 (LXC recomendado / Docker alternativa)

### ETAPA 4 — Migrar `/totvs/protheus_2410` + PG host (sem recarregar dicionário)

### ETAPA 5 — Validar REST respondendo

### LIMITES

- Nada fora de `/totvs` e `/var/www/protheus`
- Casamax, Davi, AgendaSync em 200
- Reverter os-release: `apt-get install --reinstall base-files`
- Se travar, parar e reportar

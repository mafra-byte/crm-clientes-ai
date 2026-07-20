# Manual — API de Estoque (qualquer IA)

Schema OpenAPI dedicado (recomendado para Claude, Gemini, Cursor, custom tools):

https://ccskf.com.br/maker/api/openapi-estoque.json?v=1.4.0

Schema GPT Actions (único, inclui estoque + demais):

https://ccskf.com.br/maker/api/openapi-chatgpt.json?v=1.3.7

Base da API: `https://ccskf.com.br/maker/api/v1`

## Auth

```
Authorization: Bearer mk_ia_...
```

- Token em `maker/data/ia.token`
- No ChatGPT: Authentication = API Key, Auth Type = Bearer, cole **só** o token (sem a palavra Bearer)

## Agente

Em toda chamada autenticada, informe o agente:

| Forma | Exemplo |
|-------|---------|
| Query | `?agente=estoque` |
| Body | `"agente": "estoque"` |
| Header | `X-Agent-Code: estoque` |

Valores úteis: `estoque`, `producao`, `supervisor`

## Escrita (token IA)

Inclua no JSON:

```json
"usuario_origem": "mafra"
```

Valores: `mafra` | `luciana`

---

## Endpoints

### 1) Consultar estoque (saldo + custos)

`GET /estoque?agente=estoque`

Retorna por filamento:

| Campo | Significado |
|-------|-------------|
| `quantidade` | Saldo em **gramas** |
| `avg_cost_per_kg` | Custo médio (R$/kg) |
| `last_purchase_cost_per_kg` | Último preço de compra (R$/kg) |
| `valor_estoque` | `(quantidade/1000) × médio` |
| `valor_estoque_filamentos` | Soma total |

**Sempre comece por aqui** para descobrir o `material_id` / `filament_id`.

### 2) Compra / entrada (atualiza custo)

`POST /estoque/movimentos?agente=estoque`

JSON:

```json
{
  "agente": "estoque",
  "usuario_origem": "mafra",
  "material_kind": "filament",
  "material_id": 1,
  "tipo": "entrada",
  "quantidade": 1000,
  "custo_kg": 70,
  "data_compra": "2026-07-16",
  "fornecedor": "3Dfila",
  "fonte": "Mercado Livre",
  "numero_nf": "NF 12345",
  "referencia": "NF 12345"
}
```

Multipart (com arquivo da NF): mesmos campos + arquivo no campo `nota` (PDF/JPG/PNG/WEBP/XML, até 12 MB).

- `quantidade` = gramas (1000 = 1 kg)
- `custo_kg` = preço da compra em R$/kg (**obrigatório**)
- `data_compra`, `fornecedor`, `fonte` = rastreio da compra
- Atualiza `last_purchase_cost_per_kg` e recalcula o médio

### 2b) Listar compras / anexar NF depois

`GET /estoque/movimentos?agente=estoque&tipo=entrada`

`POST /estoque/movimentos/{id}/nota` — multipart campo `nota`

`GET /estoque/movimentos/{id}/nota` — baixa/visualiza a NF

### 3) Ajuste por pesagem do rolo

`POST /estoque/movimentos?agente=estoque`

```json
{
  "agente": "estoque",
  "usuario_origem": "mafra",
  "material_kind": "filament",
  "material_id": 1,
  "tipo": "ajuste",
  "quantidade": 780,
  "referencia": "pesagem_balanca"
}
```

Define o saldo absoluto = 780 g. **Não** altera o custo médio.

### 4) Saída manual

```json
{
  "agente": "estoque",
  "usuario_origem": "mafra",
  "material_kind": "filament",
  "material_id": 1,
  "tipo": "saida",
  "quantidade": 42,
  "referencia": "consumo_manual"
}
```

### 5) Cadastro de filamento

`POST /materiais/filamentos?agente=estoque`

```json
{
  "agente": "estoque",
  "usuario_origem": "mafra",
  "material": "PLA",
  "marca": "3Dfila",
  "cor": "Preto",
  "estoque_g": 1000,
  "custo_kg": 70
}
```

### 6) Baixa pela peça pesada (produção)

`POST /producao/baixar-peca?agente=producao`

```json
{
  "agente": "producao",
  "usuario_origem": "mafra",
  "ordem_id": 3,
  "filament_id": 1,
  "gramas_peca": 42
}
```

Baixa o estoque e grava o custo do material na OP com o custo médio atual.

---

## Fluxos prontos para a IA

### “Quanto vale o estoque de PLA?”
1. `GET /estoque?agente=estoque`
2. Somar `valor_estoque` dos itens com `material=PLA` (ou usar `valor_estoque_filamentos` para o total)

### “Comprei 1 kg de PETG a R$85”
1. `GET /estoque` → achar `id` do PETG
2. `POST /estoque/movimentos` com `tipo=entrada`, `quantidade=1000`, `custo_kg=85`
3. Conferir `avg_cost_per_kg` e `last_purchase_cost_per_kg` na resposta

### “Peca pronta pesou 42 g”
1. `GET /producao/ordens?agente=producao&tipo=3d` → `ordem_id`
2. `GET /estoque` → `filament_id`
3. `POST /producao/baixar-peca` com `gramas_peca=42`

---

## Erros comuns

| Situação | Causa |
|----------|--------|
| 401 | Token ausente/inválido ou digitou Bearer duas vezes |
| 403 | Agente sem permissão (`agente=estoque` ou `supervisor`) |
| 400 “informe custo_kg” | Entrada sem preço de compra |
| 400 “Estoque insuficiente” | Saída/baixa maior que o saldo |
| quantidade em kg | Errado — use gramas (1 kg = 1000) |

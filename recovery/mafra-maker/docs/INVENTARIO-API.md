# Maker ERP AI Gateway — inventário recuperado da produção

- Título: Maker ERP AI Gateway
- Versão: 1.3.8
- Gerado em: snapshot HTTP de maker.ccskf.com.br
- Paths no OpenAPI ChatGPT: 19

## Endpoints

- `GET /capabilities` — Agentes, tools e permissoes [Base]
- `GET /clientes` — Listar clientes [Comercial]
- `POST /clientes` — Criar cliente [Comercial]
- `GET /clientes/{id}` — Obter cliente [Comercial]
- `GET /estoque` — Consultar estoque com custos [Operacao]
- `POST /estoque/movimentos` — Movimento estoque (compra/saida/ajuste) [Operacao]
- `GET /health` — Saude da API [Base]
- `GET /maquinas` — Listar maquinas [Operacao]
- `GET /materiais` — Listar materiais (filamento/laser) [Operacao]
- `POST /materiais/filamentos` — Cadastrar filamento [Operacao]
- `GET /me` — Sessao autenticada [Base]
- `GET /parametros/impressao` — Parametros impressao 3D [Operacao]
- `GET /parametros/laser` — Parametros laser [Operacao]
- `GET /pedidos` — Listar pedidos [Comercial]
- `POST /pedidos` — Criar pedido [Comercial]
- `GET /pedidos/{id}` — Obter pedido [Comercial]
- `POST /producao/baixar-peca` — Baixar estoque pelo peso da peca [Producao]
- `POST /producao/iniciar` — Iniciar producao [Producao]
- `GET /producao/ordens` — Listar ordens de producao [Producao]
- `POST /producao/ordens` — Criar ordem de producao [Producao]
- `PUT /producao/ordens/{tipo}/{id}` — Atualizar status da ordem [Producao]
- `GET /test/chatgpt` — Teste de conexao ChatGPT [Base]

## Spec extra: api_openapi-estoque.json — Maker ERP — Estoque e Custos v1.4.2
- `GET /estoque` — Consultar estoque atual com custos
- `POST /estoque/movimentos` — Movimento de estoque (entrada, saida ou ajuste)
- `GET /materiais` — Listar materiais (filamento e/ou laser)
- `POST /materiais/filamentos` — Cadastrar novo filamento
- `POST /materiais/laser` — Cadastrar material laser
- `POST /producao/baixar-peca` — Baixar estoque pelo peso da peça fabricada
- `GET /producao/ordens` — Listar OPs (útil antes de baixar peça)

## Spec extra: api_openapi.json — Mafra Maker API v1.0.0
- `POST /chat` — Camada de interpretação NL (preparada — 501)
- `GET /clientes` — Lista clientes
- `POST /clientes` — Cria cliente
- `GET /clientes/{id}` — Obtém cliente
- `PUT /clientes/{id}` — Atualiza cliente
- `GET /health` — Health check
- `POST /ia` — Atalho genérico desativado (501)
- `GET /pedidos` — Lista pedidos
- `POST /pedidos` — Cria pedido (cliente → item → status → valor → prazo)
- `GET /pedidos/{id}` — Obtém pedido
- `PUT /pedidos/{id}` — Atualiza pedido

## Spec extra: api_v1_openapi.json — Mafra Maker API v1.4.0
- `POST /chat` — Bloco C — preparado (501)
- `GET /clientes` — Lista clientes
- `POST /clientes` — Cria cliente
- `DELETE /clientes/{id}` — Exclusão lógica
- `GET /clientes/{id}` — Obtém cliente
- `PUT /clientes/{id}` — Atualiza cliente
- `GET /estoque` — Consulta estoque com custos (saldo g, médio, último preço, valor)
- `POST /estoque/movimentos` — Movimento (entrada/saida/ajuste). Entrada exige custo_kg e atualiza custo médio.
- `GET /health` — Health
- `POST /laser/parametros` — Alias de POST /parametros/laser
- `GET /maquinas` — Lista máquinas (3D + laser)
- `POST /maquinas` — Cadastra máquina
- `DELETE /maquinas/{tipo}/{id}` — Exclusão lógica
- `GET /maquinas/{tipo}/{id}` — Obtém máquina
- `PUT /maquinas/{tipo}/{id}` — Atualiza máquina
- `GET /materiais` — Lista materiais
- `POST /materiais/filamentos` — Cadastra filamento
- `POST /materiais/laser` — Cadastra material laser
- `GET /parametros/impressao` — Parâmetros de impressão 3D
- `POST /parametros/impressao` — Grava parâmetro de impressão 3D
- `GET /parametros/laser` — Parâmetros laser
- `POST /parametros/laser` — Grava parâmetro laser
- `GET /pedidos` — Lista pedidos
- `POST /pedidos` — Cria pedido + itens
- `PUT /pedidos/{id}` — Atualiza pedido
- `POST /producao/baixar-peca` — Baixa estoque pelo peso da peça fabricada
- `POST /producao/iniciar` — Inicia produção
- `GET /producao/ordens` — Lista ordens 3D e laser
- `POST /producao/ordens` — Cria ordem de produção

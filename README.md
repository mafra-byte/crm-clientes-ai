# Protheus — CRM com ERP TOTVS

CRM de clientes com integração REST ao Protheus (OAuth password grant, clientes SA1 e pedidos de venda).

## O que está incluso

- Login do portal (cookie de sessão) em `/login`
- **Modo demo comercial** (`PROTHEUS_DEMO_MODE=true`) com dados seed
- Listagem de clientes **ao vivo** via REST (`/api/clients/live`) + cache local
- Autenticação no REST Adapter (`/api/oauth2/v1/token`)
- Teste de conexão e sessão com refresh de token
- Sincronização de clientes e pedidos para o CRM
- Painel com clientes, pedidos e status da integração
- Paths configuráveis por ambiente (`.env`)

### Login do portal

```env
PORTAL_USERNAME=Admin
PORTAL_PASSWORD=Protheus.123
PORTAL_SESSION_SECRET=troque-este-segredo
```

Abra `/login`. Também aceita as credenciais `PROTHEUS_USERNAME` / `PROTHEUS_PASSWORD`.

### Demo para vendas

```env
PROTHEUS_DEMO_MODE=true
```

```bash
npm run db:seed
```

Roteiro sugerido: Login → Painel → Clientes → Pedidos → Protheus (testar / sincronizar).
Em demo, as ações de integração não dependem do REST real.

## Setup rápido

```bash
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Credenciais Protheus

1. Preencha no `.env`:

```env
PROTHEUS_BASE_URL=http://servidor:8080/rest
PROTHEUS_USERNAME=usuario
PROTHEUS_PASSWORD=senha
PROTHEUS_EMPRESA=99
PROTHEUS_FILIAL=01
```

2. (Opcional) Se o ambiente exigir Basic Auth no token:

```env
PROTHEUS_CLIENT_ID=seu_client_id
PROTHEUS_CLIENT_SECRET=seu_client_secret
```

3. Ajuste os paths se o Adapter REST do ambiente for diferente:

```env
PROTHEUS_TOKEN_PATH=/api/oauth2/v1/token
PROTHEUS_CUSTOMERS_PATH=/clientes
PROTHEUS_ORDERS_PATH=/pedidos
```

4. Em **Protheus**, clique em **Testar conexão** e depois **Sincronizar tudo**.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build |
| `npm test` | Testes unitários |
| `npm run lint` | ESLint |
| `npm run db:migrate` | Migrações Prisma |

## Stack

Next.js 15 · Prisma · SQLite · TypeScript · Tailwind CSS

## Deploy (servidor)

Ambiente de produção neste servidor Contabo:

- App CRM: `/var/www/protheus` · PM2 `protheus` (porta `3010`)
- ERP Protheus 12.1.2410: `/totvs/protheus_2410` · systemd `protheus-dbaccess` + `protheus-appserver`
- URL CRM: https://protheus.ccskf.net
- WebApp ERP: https://protheus.ccskf.net/webapp/
- REST ERP: https://protheus.ccskf.net/rest/
- Empresa padrão: **99** / filial **01**

Guia completo do ERP: [`docs/PROTHEUS_EMPRESA99.md`](docs/PROTHEUS_EMPRESA99.md)  
Isolamento (não mexer em Casamax/Davi): [`docs/ISOLAMENTO.md`](docs/ISOLAMENTO.md)

```bash
# atualizar CRM
cd /var/www/protheus && npm install && npx prisma migrate deploy && npm run build && pm2 restart protheus

# reiniciar ERP
systemctl restart protheus-dbaccess protheus-appserver
```

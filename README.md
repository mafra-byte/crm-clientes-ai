# Protheus — CRM com ERP TOTVS

CRM de clientes com integração REST ao Protheus (OAuth password grant, clientes SA1 e pedidos de venda).

## O que está incluso

- Autenticação no REST Adapter (`/api/oauth2/v1/token`)
- Teste de conexão e sessão com refresh de token
- Sincronização de clientes e pedidos para o CRM
- Painel com clientes, pedidos e status da integração
- Paths configuráveis por ambiente (`.env`)

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

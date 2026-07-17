# Clientela — CRM com Mercado Livre

CRM de clientes com integração oficial à API do Mercado Livre (OAuth 2.0, pedidos e webhooks).

## O que está incluso

- Conexão OAuth com conta de vendedor (Brasil)
- Refresh automático de access token
- Sincronização de pedidos → clientes no CRM
- Painel com clientes, pedidos e status da integração
- Endpoint de notificações: `POST /api/ml/notifications`

## Setup rápido

```bash
cp .env.example .env
npm install
npx prisma migrate dev --name init
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Credenciais Mercado Livre

1. Crie um aplicativo em [developers.mercadolivre.com.br](https://developers.mercadolivre.com.br/)
2. Defina o redirect URI exatamente como:
   `http://localhost:3000/api/ml/callback`
3. Preencha no `.env`:

```env
ML_APP_ID=seu_app_id
ML_CLIENT_SECRET=sua_secret_key
ML_REDIRECT_URI=http://localhost:3000/api/ml/callback
```

4. Em **Integrações → Mercado Livre**, clique em **Conectar conta**
5. Clique em **Sincronizar pedidos**

Para webhooks em produção, configure a URL de notificações do app para:

`https://seu-dominio/api/ml/notifications`

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

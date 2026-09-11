# Cardápio Digital

Sistema completo de cardápio e pedidos online para uma única operação de fast-food. Inclui experiência pública, checkout, acompanhamento, cozinha, entregas, administração, relatórios, impressão térmica e atualização em tempo real.

## Stack

- Next.js 16 App Router, React 19 e TypeScript
- Tailwind CSS 4 e shadcn/ui
- Supabase Postgres, Auth, Storage, RPC e Realtime
- TanStack Query, Zustand, React Hook Form e Zod
- Recharts e Lucide React

## Configuração local

Requisitos: Node.js 20 ou superior e pnpm.

```bash
pnpm install
copy .env.example .env.local
pnpm dev
```

Preencha `.env.local` com a URL e a chave pública do projeto Supabase. A chave publicável moderna do Supabase pode ser usada em `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-publicavel
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=APP_USR-sua-public-key
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-seu-access-token
MERCADO_PAGO_WEBHOOK_SECRET=seu-segredo-de-webhook
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

A aplicação estará disponível em `http://localhost:3000`.

## Banco de dados

Execute no SQL Editor do Supabase, nesta ordem:

1. `supabase/migrations/202609100001_initial_schema.sql`
2. `supabase/seed.sql` (opcional, adiciona catálogo de demonstração)

A migration configura tabelas, índices, funções RPC, RLS, Storage, relatórios e adiciona `orders` à publicação do Supabase Realtime.

## Usuários internos

Crie os usuários em **Supabase → Authentication → Users**. O perfil é criado automaticamente com papel `CUSTOMER`; promova cada usuário pelo SQL Editor:

```sql
update public.profiles
set role = 'ADMIN', active = true, name = 'Administrador'
where id = (select id from auth.users where email = 'admin@exemplo.com');
```

Troque o papel por `KITCHEN` ou `DELIVERY` para os demais acessos. Cada área também é protegida por RLS e pela camada de rotas do Next.js.

## Rotas

- Público: `/`, `/cardapio`, `/carrinho`, `/checkout` e `/pedido/acompanhar`
- Administração: `/admin`
- Cozinha: `/cozinha`
- Entregas: `/entregador`
- Impressão: `/print/cozinha/[orderId]` e `/print/entrega/[orderId]`

As telas operacionais recebem eventos do Supabase Realtime. Um polling leve continua ativo como contingência em caso de indisponibilidade do canal.

## Validação

```bash
pnpm lint
pnpm build
```

## Deploy na Vercel

1. Importe este repositório na Vercel.
2. Cadastre `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em todos os ambientes necessários.
3. Cadastre `SUPABASE_SERVICE_ROLE_KEY` somente no servidor; ela é usada para registrar de forma segura o retorno do pagamento.
4. Para o Checkout Transparente, cadastre as três credenciais do Mercado Pago e use a URL pública do site em `NEXT_PUBLIC_APP_URL`.
5. No painel do Mercado Pago, habilite o evento **Order (Mercado Pago)** apontando para `/api/mercado-pago/webhook` e copie a assinatura secreta para `MERCADO_PAGO_WEBHOOK_SECRET`.
4. Faça o deploy e adicione a URL publicada aos endereços permitidos em **Supabase Auth → URL Configuration**.

## Segurança

Nunca exponha `SUPABASE_SERVICE_ROLE_KEY`, nunca use o prefixo `NEXT_PUBLIC_` nela e nunca a envie ao navegador. Valores, estoque e regras de transição são validados no banco por funções RPC; o cliente não é a fonte de verdade.

## Status

Fases 1 a 10 concluídas. O sistema está pronto para configuração do Supabase, criação dos usuários internos e publicação na Vercel.

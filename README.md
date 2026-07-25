# Manto Sagrado

Ecossistema de comércio eletrônico de camisas e artigos esportivos, com loja web instalável, aplicativo mobile, painel administrativo e API própria.

## Princípios

- Identidade visual própria em preto e dourado.
- Experiência inspirada nas jornadas públicas de lojas esportivas modernas, sem copiar código, telas, textos ou ativos de terceiros.
- Fluxo comercial de dropshipping assistido: após o pagamento, o sistema gera um template interno para envio pelo WhatsApp.
- O fornecedor nunca aparece na interface pública, URLs, metadados, logs públicos ou comunicações com clientes. Internamente é identificado somente por códigos neutros, como `FORN-001`.
- O pedido permanece em processamento até o administrador cadastrar manualmente o código de rastreio.

## Aplicações

```text
apps/
  storefront/   Loja web e PWA em Next.js
  admin/        Painel administrativo em Next.js
  mobile/       Aplicativo Expo para Android e iOS
  api/          API NestJS com Prisma e PostgreSQL
packages/
  contracts/    Tipos compartilhados de catálogo e pedidos
docs/
```

## Requisitos

- Node.js 22.13 ou superior; recomendado Node.js 24.
- Corepack e pnpm 11.17.0.
- Docker com Docker Compose para o PostgreSQL local.

## Preparação

```bash
corepack enable
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

Troque `ADMIN_API_KEY` em `apps/api/.env` por uma chave longa e exclusiva antes de usar as rotas administrativas.

## Desenvolvimento

```bash
pnpm dev
```

Portas padrão:

- loja: `3000`;
- painel: `3001`;
- API: `3333`;
- PostgreSQL: `5432`.

Também é possível iniciar cada aplicação separadamente:

```bash
pnpm dev:storefront
pnpm dev:admin
pnpm dev:api
pnpm --filter @manto-sagrado/mobile dev
```

## Rotas iniciais da API

```text
GET    /v1/health
GET    /v1/products
GET    /v1/products/:slug
POST   /v1/orders
GET    /v1/orders/:number?email=cliente@exemplo.com
GET    /v1/admin/orders
GET    /v1/admin/orders/:number/template
PATCH  /v1/admin/orders/:number/payment-approved
PATCH  /v1/admin/orders/:number/sent
PATCH  /v1/admin/orders/:number/tracking
```

As rotas administrativas exigem o cabeçalho `x-admin-key`.

## Validação

```bash
pnpm build
pnpm typecheck
```

O GitHub Actions valida instalação, Prisma, contratos, API, loja e painel a cada alteração na branch principal ou pull request.

## Status

A base integrada foi compilada com sucesso no CI. Consulte `docs/PROGRESS.md` para o estado detalhado e as próximas entregas.

# Manto Sagrado

Ecossistema de comércio eletrônico de camisas e artigos esportivos, com loja web instalável, aplicativo mobile, painel administrativo e API própria.

## Princípios

- Identidade visual própria em preto e dourado.
- Experiência inspirada nas jornadas públicas de lojas esportivas modernas, sem copiar código, telas, textos ou ativos de terceiros.
- Fluxo comercial de dropshipping assistido: após o pagamento, o sistema gera um template interno para envio pelo WhatsApp.
- O fornecedor nunca aparece na interface pública, URLs, metadados, logs públicos ou comunicações com clientes. Internamente será identificado somente por códigos neutros, como `FORN-001`.
- O pedido permanece em processamento até o administrador cadastrar manualmente o código de rastreio.

## Estrutura prevista

```text
apps/
  storefront/   Loja web e PWA
  admin/        Painel administrativo
  mobile/       Aplicativo Expo para Android e iOS
  api/          API NestJS
  worker/       Filas e tarefas assíncronas
packages/
  contracts/
  design-tokens/
  config/
docs/
```

## Execução local

```bash
corepack enable
pnpm install
pnpm dev
```

## Status

A base do monorepo e a primeira versão navegável da loja estão em implementação. Consulte `docs/PROGRESS.md`.

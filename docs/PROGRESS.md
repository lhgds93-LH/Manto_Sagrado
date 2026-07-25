# Progresso — Manto Sagrado

Atualizado em 25/07/2026.

## Implementado nesta etapa

- Monorepo com pnpm e Turborepo.
- `apps/storefront`: loja web responsiva em Next.js.
- Home em preto e dourado com busca, categorias, grade de produtos, favoritos, carrinho lateral, benefícios e navegação mobile.
- Manifesto PWA inicial.
- `apps/mobile`: aplicativo Expo/Expo Router com home nativa, busca, categorias, produtos, favoritos, carrinho e navegação inferior.
- `apps/admin`: painel administrativo inicial com fila de pedidos, indicadores, template operacional, identificação interna `FORN-001` e cadastro manual do código de rastreio.
- Fluxo comercial preservado: pagamento confirmado → geração da solicitação → envio manual por WhatsApp → recebimento e cadastro do rastreio.

## Estado atual

A interface inicial das três aplicações está implementada com dados demonstrativos locais. Ainda não é correto classificar o ecossistema como pronto para produção.

## Próximas entregas técnicas

1. Criar `apps/api` com NestJS, PostgreSQL, Prisma e autenticação.
2. Criar contratos compartilhados e substituir os dados locais por API.
3. Implementar catálogo, variações, tamanhos, personalização, carrinho persistente e checkout.
4. Implementar pagamentos Pix/cartão por adaptadores e provedores mock.
5. Implementar pedidos, máquina de estados e rastreamento.
6. Implementar CRUD completo no painel e auditoria.
7. Materializar a logo oficial e gerar ícones, favicon e splash.
8. Adicionar Docker Compose, seed, testes, CI e documentação de publicação.
9. Importar imagens licenciadas das camisas sem expor origem ou dados do parceiro.

## Pendências externas

- Credenciais de pagamento, frete, e-mail e notificações.
- Contas Google Play e Apple Developer.
- Domínio definitivo e infraestrutura de produção.
- Conteúdo licenciado de produtos e políticas revisadas juridicamente.

# Progresso — Manto Sagrado

Atualizado em 25/07/2026.

## Implementado e validado

- Monorepo com pnpm e Turborepo.
- `apps/storefront`: loja web/PWA responsiva em Next.js.
- Home em preto e dourado com busca, categorias, produtos, favoritos, carrinho lateral, benefícios e navegação mobile.
- `apps/mobile`: aplicativo Expo/Expo Router para Android e iOS com home nativa, busca, categorias, favoritos, carrinho e navegação inferior.
- `apps/admin`: painel administrativo com fila de pedidos, indicadores, template operacional e cadastro manual do rastreio.
- `apps/api`: API NestJS 11 com Prisma 7 e PostgreSQL.
- Catálogo público com busca, categorias, tamanhos, preços e disponibilidade.
- Criação de pedidos com validação de cliente, endereço, itens, tamanhos, quantidade e estoque.
- Totais recalculados pela API com base nos preços cadastrados no banco.
- Consulta pública do pedido protegida por número do pedido e e-mail da compra.
- Fluxo administrativo protegido por chave: confirmar pagamento, gerar template, marcar envio da solicitação e cadastrar rastreio.
- Modelagem de produtos, variantes, pedidos, itens, pagamentos e histórico de eventos.
- Dados internos do parceiro separados do catálogo público e identificados somente por código neutro, como `FORN-001`.
- Catálogo demonstrativo inicial com seis produtos e variações de tamanho.
- PostgreSQL local pelo Docker Compose.
- Contratos TypeScript compartilhados entre as aplicações.
- Pipeline GitHub Actions validando instalação, geração do Prisma, contratos, API, loja e painel.

## Validação técnica

A execução completa do CI passou em 25/07/2026 com:

- instalação limpa das dependências;
- geração do Prisma Client;
- verificação dos contratos;
- compilação da API;
- compilação da loja;
- compilação do painel administrativo.

## Estado atual

A base integrada e compilável do ecossistema está pronta. A loja, o aplicativo e o painel ainda utilizam dados demonstrativos em algumas telas e precisam ser conectados aos endpoints persistentes da API antes da publicação comercial.

## Próximas entregas técnicas

1. Conectar a loja e o painel aos endpoints da API.
2. Implementar autenticação de clientes e administradores com sessões seguras.
3. Implementar carrinho persistente, endereço, personalização e checkout completo.
4. Implementar pagamentos Pix/cartão por adaptadores e ambiente de teste.
5. Implementar cálculo de frete e integrações de rastreamento.
6. Criar CRUD completo de produtos, variações, imagens, preços e disponibilidade no painel.
7. Materializar a logo oficial e gerar ícones, favicon e splash.
8. Adicionar migração inicial versionada, testes automatizados e ambiente de homologação.
9. Importar imagens licenciadas das camisas sem expor origem ou dados do parceiro.

## Pendências externas

- Credenciais de pagamento, frete, e-mail e notificações.
- Contas Google Play e Apple Developer.
- Domínio definitivo e infraestrutura de produção.
- Conteúdo licenciado de produtos e políticas revisadas juridicamente.

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
- Migração inicial do PostgreSQL versionada com Prisma Migrate.
- Loja e painel preparados para Firebase App Hosting.
- API preparada em contêiner para Google Cloud Run.
- Pipeline Cloud Build preparado para Artifact Registry, Cloud Run, Cloud SQL e Secret Manager.
- Guia completo de publicação em `docs/PUBLICACAO_FIREBASE.md`.

## Validação técnica

A execução completa do CI passou em 25/07/2026 com:

- instalação limpa das dependências;
- geração do Prisma Client;
- geração da migração inicial;
- verificação dos contratos;
- compilação da API;
- compilação da loja;
- compilação do painel administrativo;
- construção da imagem Docker destinada ao Cloud Run.

## Estado atual

A base integrada, a migração e os artefatos de publicação estão prontos e compiláveis. A criação efetiva dos recursos no Firebase e Google Cloud ainda depende de autorização na conta Google do proprietário, porque envolve projeto, faturamento, IAM e secrets.

A loja pode ser publicada inicialmente como demonstração. O painel administrativo não deve ser exposto para operação real antes da autenticação administrativa. Algumas telas ainda usam dados demonstrativos e precisam ser conectadas aos endpoints persistentes da API antes da publicação comercial completa.

## Próximas entregas técnicas

1. Criar o projeto Firebase separado e vinculá-lo à mesma conta de cobrança usada pelo Gens.
2. Criar o backend da loja no Firebase App Hosting apontando para `apps/storefront`.
3. Criar Cloud SQL, secrets, Artifact Registry e o serviço Cloud Run da API.
4. Conectar a loja e o painel aos endpoints da API.
5. Implementar autenticação de clientes e administradores com sessões seguras.
6. Implementar carrinho persistente, endereço, personalização e checkout completo.
7. Implementar pagamentos Pix/cartão por adaptadores e ambiente de teste.
8. Implementar cálculo de frete e integrações de rastreamento.
9. Criar CRUD completo de produtos, variações, imagens, preços e disponibilidade no painel.
10. Materializar a logo oficial e gerar ícones, favicon e splash.
11. Importar imagens licenciadas das camisas sem expor origem ou dados do parceiro.

## Pendências externas

- Acesso ao Console do Firebase e Google Cloud da conta proprietária.
- Escolha e disponibilidade do ID definitivo do projeto Firebase.
- Credenciais de pagamento, frete, e-mail e notificações.
- Contas Google Play e Apple Developer.
- Domínio definitivo e infraestrutura de produção.
- Conteúdo licenciado de produtos e políticas revisadas juridicamente.

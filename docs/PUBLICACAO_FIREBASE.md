# Publicação do Manto Sagrado no Firebase e Google Cloud

## Arquitetura

- Loja pública: Firebase App Hosting, raiz `apps/storefront`.
- Painel administrativo: Firebase App Hosting, raiz `apps/admin`.
- API: Google Cloud Run, contêiner em `apps/api/Dockerfile`.
- Banco: Cloud SQL para PostgreSQL.
- Imagens: Cloud Storage for Firebase.
- Cobrança: a mesma conta do Google Cloud Billing usada pelo Gens, mas em um projeto Firebase separado.

## Região adotada

Use `us-east4` para App Hosting, Cloud Run, Artifact Registry e Cloud SQL. Manter os serviços na mesma região reduz a comunicação entre regiões.

## 1. Criar o projeto Firebase

1. Abra o Console do Firebase.
2. Crie um projeto separado para o Manto Sagrado.
3. Sugestão de nome: `Manto Sagrado`.
4. Escolha um ID globalmente disponível, por exemplo `manto-sagrado-lhg`.
5. Vincule o projeto à mesma conta de faturamento usada pelo Gens.
6. Confirme que o projeto está no plano Blaze.

Não reutilize o projeto Firebase do Gens. Compartilhe apenas a conta de cobrança.

## 2. Publicar a loja

No Firebase, acesse **App Hosting** e crie um backend com:

- Nome: `manto-sagrado-loja`.
- Repositório: `lhgds93-LH/Manto_Sagrado`.
- Branch ativa: `main`.
- Diretório raiz: `apps/storefront`.
- Região: `us-east4`.
- Lançamentos automáticos: ativados.

O Firebase utilizará `apps/storefront/apphosting.yaml`. Quando o primeiro rollout terminar, será gerado o link público da loja.

## 3. Painel administrativo

O arquivo `apps/admin/apphosting.yaml` já está preparado. Não publique o painel para uso real antes da autenticação administrativa estar implementada.

Quando estiver protegido, crie outro backend:

- Nome: `manto-sagrado-admin`.
- Repositório: `lhgds93-LH/Manto_Sagrado`.
- Branch ativa: `main`.
- Diretório raiz: `apps/admin`.
- Região: `us-east4`.

## 4. Criar o PostgreSQL

No Google Cloud Console do projeto:

1. Ative a API Cloud SQL Admin.
2. Crie uma instância PostgreSQL na região `us-east4`.
3. Nome sugerido: `manto-sagrado-db`.
4. Crie o banco `manto_sagrado`.
5. Crie um usuário próprio para a aplicação.
6. Copie o nome de conexão da instância no formato `PROJECT_ID:us-east4:INSTANCE_NAME`.

A URL usada pelo Prisma no Cloud Run pode usar o soquete Unix:

```text
postgresql://USUARIO:SENHA@localhost/manto_sagrado?host=/cloudsql/PROJECT_ID:us-east4:INSTANCE_NAME
```

Caracteres especiais do usuário e da senha precisam estar codificados para URL.

## 5. Criar os secrets

No Secret Manager, crie:

- `manto-database-url`: URL do PostgreSQL.
- `manto-admin-api-key`: chave longa e aleatória para operações administrativas.
- `manto-cors-origins`: URL da loja e, futuramente, URL do painel, separadas por vírgula.

Exemplo do valor de CORS depois que os links forem conhecidos:

```text
https://URL-DA-LOJA,https://URL-DO-PAINEL
```

Nunca grave esses valores no GitHub.

## 6. Preparar o Cloud Run

1. Ative Cloud Build, Cloud Run, Artifact Registry, Secret Manager e Cloud SQL Admin.
2. Crie um repositório Docker no Artifact Registry chamado `manto-sagrado`, região `us-east4`.
3. Edite a substituição `_CLOUD_SQL_INSTANCE` em `cloudbuild.api.yaml` ou configure-a no gatilho.
4. Crie um gatilho do Cloud Build ligado à branch `main`.
5. Use o arquivo de configuração `cloudbuild.api.yaml`.
6. Conceda à conta do Cloud Build acesso para publicar no Artifact Registry, implantar no Cloud Run, usar a instância Cloud SQL e ler os três secrets.

O pipeline criará o serviço público `manto-sagrado-api` com escala mínima zero.

## 7. Aplicar o banco

Depois que o Cloud SQL estiver criado, aplique a migração versionada:

```bash
pnpm --filter @manto-sagrado/api prisma:deploy
pnpm --filter @manto-sagrado/api prisma:seed
```

Execute esses comandos em um ambiente autorizado com `DATABASE_URL` apontando para o banco de produção. O seed atual contém apenas produtos demonstrativos.

## 8. Conectar a loja à API

Depois do Cloud Run gerar a URL da API:

1. Adicione `NEXT_PUBLIC_API_URL` no backend da loja pelo Console do App Hosting.
2. Use a URL do Cloud Run sem barra final.
3. Atualize o secret `manto-cors-origins` com a URL pública da loja.
4. Faça um novo rollout da loja e da API.

## Segurança e custos

- Loja: `minInstances: 0`, máximo 10.
- Painel: `minInstances: 0`, máximo 3.
- API: mínimo 0, máximo 5.
- Não exponha o painel antes do login administrativo.
- Configure orçamento e alertas por projeto no Google Cloud Billing.
- Mantenha Gens e Manto Sagrado em projetos separados para não misturar usuários, banco, arquivos e regras.

# Executar a produção no Google Cloud Shell

Este procedimento cria a infraestrutura de produção do Manto Sagrado no projeto `manto-sagrado-lhg`.

## O que será criado

- Artifact Registry `manto-sagrado` em `us-east4`;
- Cloud SQL PostgreSQL `manto-sagrado-db`;
- banco `manto_sagrado` e usuário exclusivo da aplicação;
- conta de serviço `manto-api-runtime`;
- secrets do banco, da administração e do CORS;
- imagem Docker da API;
- job de migração e carga inicial;
- serviço público `manto-sagrado-api` no Cloud Run;
- health check final da API.

O script gera as credenciais automaticamente e nunca grava seus valores no GitHub.

## Executar

Abra o **Cloud Shell** dentro do projeto `manto-sagrado-lhg` e cole:

```bash
rm -rf Manto_Sagrado
git clone https://github.com/lhgds93-LH/Manto_Sagrado.git
cd Manto_Sagrado
bash scripts/provision-gcp-production.sh
```

O script mostrará o projeto, a região e a configuração de custo antes de iniciar. Digite `s` para confirmar.

A criação do Cloud SQL e a construção da imagem podem levar vários minutos.

## Resultado esperado

Ao terminar, será exibido:

```text
API: https://...
Health: https://.../v1/health
```

A mesma informação será gravada localmente em `deployment-output.txt`.

Envie ao ChatGPT somente a linha:

```text
API_URL=https://...
```

Não envie o conteúdo dos secrets nem valores exibidos pelo Secret Manager.

## Configurações padrão

```text
Projeto: manto-sagrado-lhg
Região: us-east4
Cloud SQL: manto-sagrado-db
Banco: manto_sagrado
Tier inicial: db-f1-micro
API: manto-sagrado-api
Loja: https://manto-sagrado-loja--manto-sagrado-lhg.us-east4.hosted.app
```

O tier `db-f1-micro` foi escolhido para a fase inicial de baixo tráfego e não é uma configuração de alta disponibilidade. Ele pode ser ampliado posteriormente sem alterar a loja.

## Reexecutar com segurança

O provisionador é idempotente: quando um recurso já existe, ele é reaproveitado. Uma nova execução:

- não cria outra instância com o mesmo nome;
- não imprime credenciais;
- cria uma nova imagem da API;
- reaplica as migrações pendentes;
- atualiza o serviço do Cloud Run.

## Depois da execução

Quando a URL da API for inserida na configuração do App Hosting e ocorrer um novo lançamento:

- o selo `Modo demonstração` muda para `Catálogo conectado`;
- produtos passam a vir do PostgreSQL;
- pedidos passam a ser persistidos na API;
- o rastreio funciona em qualquer aparelho;
- os pedidos ficam disponíveis para o futuro painel administrativo.

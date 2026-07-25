#!/usr/bin/env bash
set -Eeuo pipefail

# Provisionamento inicial da produção Manto Sagrado.
# Execute no Google Cloud Shell, a partir da raiz do repositório.
# O script é idempotente: recursos existentes são reaproveitados.

PROJECT_ID="${PROJECT_ID:-manto-sagrado-lhg}"
REGION="${REGION:-us-east4}"
SQL_INSTANCE="${SQL_INSTANCE:-manto-sagrado-db}"
SQL_DATABASE="${SQL_DATABASE:-manto_sagrado}"
SQL_USER="${SQL_USER:-manto_app}"
SQL_TIER="${SQL_TIER:-db-f1-micro}"
AR_REPOSITORY="${AR_REPOSITORY:-manto-sagrado}"
SERVICE="${SERVICE:-manto-sagrado-api}"
DB_JOB="${DB_JOB:-manto-sagrado-db-setup}"
RUNTIME_SA_NAME="${RUNTIME_SA_NAME:-manto-api-runtime}"
STOREFRONT_URL="${STOREFRONT_URL:-https://manto-sagrado-loja--manto-sagrado-lhg.us-east4.hosted.app}"

DATABASE_SECRET="manto-database-url"
ADMIN_SECRET="manto-admin-api-key"
CORS_SECRET="manto-cors-origins"

say() { printf '\n\033[1;36m%s\033[0m\n' "$*"; }
warn() { printf '\n\033[1;33m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mERRO: %s\033[0m\n' "$*" >&2; exit 1; }

wait_for_service_account() {
  local service_account="$1"
  local attempt
  for attempt in {1..30}; do
    if gcloud iam service-accounts describe "$service_account" \
      --project="$PROJECT_ID" >/dev/null 2>&1; then
      return 0
    fi
    warn "Aguardando a conta de serviço aparecer no IAM (${attempt}/30)..."
    sleep 5
  done
  fail "A conta de serviço ${service_account} foi criada, mas não ficou disponível no IAM dentro do prazo."
}

grant_project_role() {
  local member="$1"
  local role="$2"
  local attempt
  for attempt in {1..12}; do
    if gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="$member" \
      --role="$role" \
      --condition=None >/dev/null 2>&1; then
      return 0
    fi
    warn "Aguardando propagação do IAM para ${role} (${attempt}/12)..."
    sleep 5
  done
  fail "Não foi possível conceder ${role} para ${member}."
}

command -v gcloud >/dev/null 2>&1 || fail "gcloud não encontrado. Execute este script no Google Cloud Shell."
command -v openssl >/dev/null 2>&1 || fail "openssl não encontrado."
command -v python3 >/dev/null 2>&1 || fail "python3 não encontrado."
[[ -f apps/api/Dockerfile ]] || fail "Execute o script na raiz do repositório Manto_Sagrado."

ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1)"
[[ -n "$ACTIVE_ACCOUNT" ]] || fail "Nenhuma conta Google autenticada no gcloud."

say "Manto Sagrado — provisionamento de produção"
printf 'Conta: %s\nProjeto: %s\nRegião: %s\nBanco: %s (%s)\nLoja: %s\n' \
  "$ACTIVE_ACCOUNT" "$PROJECT_ID" "$REGION" "$SQL_INSTANCE" "$SQL_TIER" "$STOREFRONT_URL"
warn "O Cloud SQL gera cobrança enquanto a instância existir. O padrão db-f1-micro é econômico e indicado somente para o início da operação."
read -r -p "Continuar? [s/N] " CONFIRM
[[ "$CONFIRM" =~ ^[sS]$ ]] || fail "Operação cancelada."

gcloud config set project "$PROJECT_ID" >/dev/null
gcloud config set run/region "$REGION" >/dev/null

say "Ativando APIs necessárias"
gcloud services enable \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  serviceusage.googleapis.com \
  --project="$PROJECT_ID"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
RUNTIME_SA="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

say "Criando conta de serviço da API"
if ! gcloud iam service-accounts describe "$RUNTIME_SA" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud iam service-accounts create "$RUNTIME_SA_NAME" \
    --project="$PROJECT_ID" \
    --display-name="Manto Sagrado API Runtime"
fi

wait_for_service_account "$RUNTIME_SA"
grant_project_role "serviceAccount:${RUNTIME_SA}" "roles/cloudsql.client"
grant_project_role "serviceAccount:${RUNTIME_SA}" "roles/logging.logWriter"

say "Preparando Artifact Registry"
if ! gcloud artifacts repositories describe "$AR_REPOSITORY" \
  --location="$REGION" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$AR_REPOSITORY" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Imagens de produção do Manto Sagrado" \
    --project="$PROJECT_ID"
fi

BUILD_SA="$(gcloud builds get-default-service-account --project="$PROJECT_ID" --format='value(serviceAccountEmail)' 2>/dev/null || true)"
if [[ -z "$BUILD_SA" ]]; then
  BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
fi
BUILD_SA="${BUILD_SA##*/}"

grant_project_role "serviceAccount:${BUILD_SA}" "roles/artifactregistry.writer"

say "Preparando Cloud SQL PostgreSQL"
if ! gcloud sql instances describe "$SQL_INSTANCE" --project="$PROJECT_ID" >/dev/null 2>&1; then
  gcloud sql instances create "$SQL_INSTANCE" \
    --project="$PROJECT_ID" \
    --database-version=POSTGRES_15 \
    --region="$REGION" \
    --tier="$SQL_TIER" \
    --availability-type=zonal \
    --storage-type=SSD \
    --storage-size=10 \
    --storage-auto-increase \
    --backup-start-time=03:00 \
    --deletion-protection
fi

CONNECTION_NAME="$(gcloud sql instances describe "$SQL_INSTANCE" \
  --project="$PROJECT_ID" --format='value(connectionName)')"

if ! gcloud sql databases list --instance="$SQL_INSTANCE" --project="$PROJECT_ID" \
  --filter="name=${SQL_DATABASE}" --format='value(name)' | grep -qx "$SQL_DATABASE"; then
  gcloud sql databases create "$SQL_DATABASE" \
    --instance="$SQL_INSTANCE" --project="$PROJECT_ID"
fi

secret_exists() {
  gcloud secrets describe "$1" --project="$PROJECT_ID" >/dev/null 2>&1
}

ensure_secret() {
  local secret_id="$1"
  if ! secret_exists "$secret_id"; then
    gcloud secrets create "$secret_id" \
      --replication-policy=automatic \
      --project="$PROJECT_ID"
  fi
}

add_secret_version() {
  local secret_id="$1"
  local secret_value="$2"
  printf '%s' "$secret_value" | gcloud secrets versions add "$secret_id" \
    --data-file=- --project="$PROJECT_ID" >/dev/null
}

say "Gerando e armazenando credenciais"
ensure_secret "$DATABASE_SECRET"
ensure_secret "$ADMIN_SECRET"
ensure_secret "$CORS_SECRET"

if gcloud secrets versions access latest --secret="$DATABASE_SECRET" --project="$PROJECT_ID" >/dev/null 2>&1; then
  DATABASE_URL="$(gcloud secrets versions access latest --secret="$DATABASE_SECRET" --project="$PROJECT_ID")"
else
  DB_PASSWORD="$(openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 36)"
  if gcloud sql users list --instance="$SQL_INSTANCE" --project="$PROJECT_ID" \
    --filter="name=${SQL_USER}" --format='value(name)' | grep -qx "$SQL_USER"; then
    gcloud sql users set-password "$SQL_USER" \
      --instance="$SQL_INSTANCE" --password="$DB_PASSWORD" --project="$PROJECT_ID"
  else
    gcloud sql users create "$SQL_USER" \
      --instance="$SQL_INSTANCE" --password="$DB_PASSWORD" --project="$PROJECT_ID"
  fi
  ENCODED_PASSWORD="$(python3 -c 'import sys, urllib.parse; print(urllib.parse.quote(sys.argv[1], safe=""))' "$DB_PASSWORD")"
  DATABASE_URL="postgresql://${SQL_USER}:${ENCODED_PASSWORD}@localhost/${SQL_DATABASE}?host=/cloudsql/${CONNECTION_NAME}"
  add_secret_version "$DATABASE_SECRET" "$DATABASE_URL"
  unset DB_PASSWORD ENCODED_PASSWORD
fi

if ! gcloud secrets versions access latest --secret="$ADMIN_SECRET" --project="$PROJECT_ID" >/dev/null 2>&1; then
  ADMIN_API_KEY="$(openssl rand -hex 40)"
  add_secret_version "$ADMIN_SECRET" "$ADMIN_API_KEY"
  unset ADMIN_API_KEY
fi

CURRENT_CORS="$(gcloud secrets versions access latest --secret="$CORS_SECRET" --project="$PROJECT_ID" 2>/dev/null || true)"
if [[ "$CURRENT_CORS" != "$STOREFRONT_URL" ]]; then
  add_secret_version "$CORS_SECRET" "$STOREFRONT_URL"
fi

for SECRET_ID in "$DATABASE_SECRET" "$ADMIN_SECRET" "$CORS_SECRET"; do
  gcloud secrets add-iam-policy-binding "$SECRET_ID" \
    --project="$PROJECT_ID" \
    --member="serviceAccount:${RUNTIME_SA}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
done

say "Construindo a imagem da API"
IMAGE_TAG="$(date -u +%Y%m%d-%H%M%S)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPOSITORY}/${SERVICE}:${IMAGE_TAG}"
gcloud builds submit . \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --tag="$IMAGE"

say "Executando migração e carga inicial do banco"
gcloud run jobs deploy "$DB_JOB" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --image="$IMAGE" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --set-secrets="DATABASE_URL=${DATABASE_SECRET}:latest" \
  --command=bash \
  --args=-lc,"pnpm --filter @manto-sagrado/api prisma:deploy && pnpm --filter @manto-sagrado/api prisma:seed" \
  --tasks=1 \
  --max-retries=1 \
  --task-timeout=15m \
  --memory=512Mi \
  --cpu=1

gcloud run jobs execute "$DB_JOB" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --wait

say "Publicando a API no Cloud Run"
gcloud run deploy "$SERVICE" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --platform=managed \
  --image="$IMAGE" \
  --service-account="$RUNTIME_SA" \
  --allow-unauthenticated \
  --set-cloudsql-instances="$CONNECTION_NAME" \
  --set-secrets="DATABASE_URL=${DATABASE_SECRET}:latest,ADMIN_API_KEY=${ADMIN_SECRET}:latest,CORS_ORIGINS=${CORS_SECRET}:latest" \
  --set-env-vars="NODE_ENV=production" \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min=0 \
  --max=5 \
  --concurrency=40 \
  --timeout=60

API_URL="$(gcloud run services describe "$SERVICE" \
  --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')"

say "Validando a API"
for attempt in {1..30}; do
  if curl --fail --silent --show-error "${API_URL}/v1/health" >/tmp/manto-api-health.json; then
    cat /tmp/manto-api-health.json
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    fail "A API foi implantada, mas o health check não respondeu. Consulte os logs do Cloud Run."
  fi
  sleep 2
done

cat > deployment-output.txt <<EOF
PROJECT_ID=${PROJECT_ID}
REGION=${REGION}
CLOUD_SQL_INSTANCE=${CONNECTION_NAME}
API_URL=${API_URL}
STOREFRONT_URL=${STOREFRONT_URL}
EOF

say "Infraestrutura concluída"
printf 'API: %s\nHealth: %s/v1/health\nSaída salva em: deployment-output.txt\n' \
  "$API_URL" "$API_URL"
warn "Envie somente a linha API_URL para o ChatGPT. Não envie valores do Secret Manager. A loja será conectada em seguida por uma atualização no GitHub."

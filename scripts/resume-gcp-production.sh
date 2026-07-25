#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ID="${PROJECT_ID:-manto-sagrado-lhg}"
REGION="${REGION:-us-east4}"
SQL_INSTANCE="${SQL_INSTANCE:-manto-sagrado-db}"
AR_REPOSITORY="${AR_REPOSITORY:-manto-sagrado}"
SERVICE="${SERVICE:-manto-sagrado-api}"
DB_JOB="${DB_JOB:-manto-sagrado-db-setup}"
RUNTIME_SA_NAME="${RUNTIME_SA_NAME:-manto-api-runtime}"
DATABASE_SECRET="manto-database-url"
ADMIN_SECRET="manto-admin-api-key"
CORS_SECRET="manto-cors-origins"

say() { printf '\n\033[1;36m%s\033[0m\n' "$*"; }
fail() { printf '\n\033[1;31mERRO: %s\033[0m\n' "$*" >&2; exit 1; }

command -v gcloud >/dev/null 2>&1 || fail "gcloud não encontrado. Execute no Google Cloud Shell."
command -v curl >/dev/null 2>&1 || fail "curl não encontrado."
[[ -f apps/api/Dockerfile ]] || fail "Execute na raiz do repositório Manto_Sagrado."
[[ -f cloudbuild.image.yaml ]] || fail "Arquivo cloudbuild.image.yaml não encontrado. Execute git pull origin main."

gcloud config set project "$PROJECT_ID" >/dev/null
gcloud config set run/region "$REGION" >/dev/null

RUNTIME_SA="${RUNTIME_SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
CONNECTION_NAME="$(gcloud sql instances describe "$SQL_INSTANCE" \
  --project="$PROJECT_ID" --format='value(connectionName)')"
[[ -n "$CONNECTION_NAME" ]] || fail "Instância Cloud SQL não encontrada."

for SECRET_ID in "$DATABASE_SECRET" "$ADMIN_SECRET" "$CORS_SECRET"; do
  gcloud secrets describe "$SECRET_ID" --project="$PROJECT_ID" >/dev/null 2>&1 \
    || fail "Secret ${SECRET_ID} não encontrado."
done

gcloud iam service-accounts describe "$RUNTIME_SA" --project="$PROJECT_ID" >/dev/null 2>&1 \
  || fail "Conta de serviço ${RUNTIME_SA} não encontrada."

say "Construindo a imagem da API"
IMAGE_TAG="$(date -u +%Y%m%d-%H%M%S)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPOSITORY}/${SERVICE}:${IMAGE_TAG}"

gcloud builds submit . \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --config=cloudbuild.image.yaml \
  --substitutions="_IMAGE=${IMAGE}"

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
[[ -n "$API_URL" ]] || fail "Cloud Run não retornou a URL da API."

say "Validando a API"
for attempt in {1..30}; do
  if curl --fail --silent --show-error "${API_URL}/v1/health" >/tmp/manto-api-health.json; then
    cat /tmp/manto-api-health.json
    printf '\n'
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    fail "A API foi implantada, mas o health check não respondeu."
  fi
  sleep 2
done

cat > deployment-output.txt <<OUTPUT
PROJECT_ID=${PROJECT_ID}
REGION=${REGION}
CLOUD_SQL_INSTANCE=${CONNECTION_NAME}
API_URL=${API_URL}
OUTPUT

say "Infraestrutura concluída"
printf 'API_URL=%s\nHealth=%s/v1/health\n' "$API_URL" "$API_URL"

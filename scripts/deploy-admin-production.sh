#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_ID="${PROJECT_ID:-manto-sagrado-lhg}"
REGION="${REGION:-us-east4}"
REPOSITORY="${REPOSITORY:-manto-sagrado}"
SERVICE="${ADMIN_SERVICE:-manto-sagrado-admin}"
API_SERVICE="${API_SERVICE:-manto-sagrado-api}"
SERVICE_ACCOUNT="${ADMIN_SERVICE_ACCOUNT:-manto-admin-runtime}"
IMAGE_TAG="$(date -u +%Y%m%d-%H%M%S)"
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}:${IMAGE_TAG}"
ADMIN_PASSWORD_SECRET="manto-admin-panel-password"
SESSION_SECRET="manto-admin-session-secret"
API_KEY_SECRET="manto-admin-api-key"
PASSWORD_CREATED="false"

say() { printf '\n\033[1;36m%s\033[0m\n' "$1"; }
fail() { printf '\n\033[1;31mERRO: %s\033[0m\n' "$1" >&2; exit 1; }

command -v gcloud >/dev/null 2>&1 || fail "Execute este script no Google Cloud Shell."
command -v openssl >/dev/null 2>&1 || fail "OpenSSL não encontrado."

gcloud config set project "$PROJECT_ID" >/dev/null
gcloud config set run/region "$REGION" >/dev/null

say "Ativando serviços necessários"
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com >/dev/null

if ! gcloud artifacts repositories describe "$REPOSITORY" --location "$REGION" >/dev/null 2>&1; then
  say "Criando Artifact Registry"
  gcloud artifacts repositories create "$REPOSITORY" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Imagens Manto Sagrado" >/dev/null
fi

API_URL="$(gcloud run services describe "$API_SERVICE" --region "$REGION" --format='value(status.url)' 2>/dev/null || true)"
[[ -n "$API_URL" ]] || fail "A API ${API_SERVICE} ainda não está publicada no Cloud Run."

SA_EMAIL="${SERVICE_ACCOUNT}@${PROJECT_ID}.iam.gserviceaccount.com"
if ! gcloud iam service-accounts describe "$SA_EMAIL" >/dev/null 2>&1; then
  say "Criando conta de serviço do painel"
  gcloud iam service-accounts create "$SERVICE_ACCOUNT" \
    --display-name="Manto Sagrado Admin Runtime" >/dev/null
fi

for attempt in {1..20}; do
  if gcloud iam service-accounts describe "$SA_EMAIL" >/dev/null 2>&1; then break; fi
  [[ "$attempt" -eq 20 ]] && fail "A conta de serviço não propagou no IAM."
  sleep 3
done

ensure_secret() {
  local name="$1"
  local value="$2"
  if gcloud secrets describe "$name" >/dev/null 2>&1; then
    return 0
  fi
  printf '%s' "$value" | gcloud secrets create "$name" \
    --replication-policy=automatic \
    --data-file=- >/dev/null
}

say "Preparando credenciais protegidas"
if ! gcloud secrets describe "$ADMIN_PASSWORD_SECRET" >/dev/null 2>&1; then
  ADMIN_PASSWORD="Ms!$(openssl rand -hex 10)"
  ensure_secret "$ADMIN_PASSWORD_SECRET" "$ADMIN_PASSWORD"
  PASSWORD_CREATED="true"
else
  ADMIN_PASSWORD=""
fi

if ! gcloud secrets describe "$SESSION_SECRET" >/dev/null 2>&1; then
  ensure_secret "$SESSION_SECRET" "$(openssl rand -hex 32)"
fi

gcloud secrets describe "$API_KEY_SECRET" >/dev/null 2>&1 || fail "O secret ${API_KEY_SECRET} não existe. Execute primeiro o provisionamento da API."

for secret in "$ADMIN_PASSWORD_SECRET" "$SESSION_SECRET" "$API_KEY_SECRET"; do
  for attempt in {1..10}; do
    if gcloud secrets add-iam-policy-binding "$secret" \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="roles/secretmanager.secretAccessor" >/dev/null 2>&1; then
      break
    fi
    [[ "$attempt" -eq 10 ]] && fail "Não foi possível liberar o secret ${secret} para o painel."
    sleep 3
  done
done

say "Construindo a imagem do painel"
gcloud builds submit \
  --config=cloudbuild.admin.yaml \
  --substitutions="_IMAGE=${IMAGE}" \
  .

say "Publicando painel no Cloud Run"
gcloud run deploy "$SERVICE" \
  --image="$IMAGE" \
  --region="$REGION" \
  --platform=managed \
  --service-account="$SA_EMAIL" \
  --allow-unauthenticated \
  --port=8080 \
  --cpu=1 \
  --memory=512Mi \
  --min-instances=0 \
  --max-instances=3 \
  --concurrency=40 \
  --set-env-vars="API_URL=${API_URL}" \
  --set-secrets="ADMIN_API_KEY=${API_KEY_SECRET}:latest,ADMIN_PANEL_PASSWORD=${ADMIN_PASSWORD_SECRET}:latest,ADMIN_SESSION_SECRET=${SESSION_SECRET}:latest" \
  --quiet

ADMIN_URL="$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')"
[[ -n "$ADMIN_URL" ]] || fail "O Cloud Run não retornou a URL do painel."

say "Validando o painel publicado"
for attempt in {1..40}; do
  if curl --fail --silent --show-error "$ADMIN_URL" | grep -q "Painel Manto Sagrado"; then
    break
  fi
  [[ "$attempt" -eq 40 ]] && fail "O painel foi publicado, mas não respondeu corretamente."
  sleep 3
done

printf '\n\033[1;32mPainel administrativo publicado com sucesso.\033[0m\n'
printf 'ADMIN_URL=%s\n' "$ADMIN_URL"
if [[ "$PASSWORD_CREATED" == "true" ]]; then
  printf '\033[1;33mSENHA_ADMIN=%s\033[0m\n' "$ADMIN_PASSWORD"
  printf 'Salve esta senha agora. Ela não foi gravada no GitHub.\n'
else
  printf 'A senha existente foi preservada no Secret Manager (%s).\n' "$ADMIN_PASSWORD_SECRET"
fi

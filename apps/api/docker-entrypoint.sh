#!/usr/bin/env bash
set -Eeuo pipefail

PATH_FILE="/workspace/apps/api/.runtime-main-path"

if [[ ! -s "$PATH_FILE" ]]; then
  echo "ERRO: caminho do arquivo principal da API não foi registrado no build." >&2
  find /workspace/apps/api/dist -maxdepth 4 -type f -print 2>/dev/null || true
  exit 1
fi

MAIN_FILE="$(cat "$PATH_FILE")"

if [[ ! -f "$MAIN_FILE" ]]; then
  echo "ERRO: arquivo principal da API não encontrado: $MAIN_FILE" >&2
  find /workspace/apps/api/dist -maxdepth 4 -type f -print 2>/dev/null || true
  exit 1
fi

export PORT="${PORT:-8080}"
echo "Iniciando Manto Sagrado API em ${MAIN_FILE} na porta ${PORT}"
exec node "$MAIN_FILE"

#!/usr/bin/env bash
# postgres-entrypoint.sh — wrapper do entrypoint oficial do postgres que carrega senhas de
# role a partir de docker secrets (padrão *_FILE) ANTES do bootstrap.
#
# Porquê: os scripts de init (/docker-entrypoint-initdb.d/*.sql) leem as senhas de role via
# `\getenv VAR` do psql — ou seja, do AMBIENTE do processo, não de arquivos. A imagem oficial
# só conhece *_FILE para POSTGRES_PASSWORD/USER/DB. Este wrapper exporta as senhas de role a
# partir dos respectivos *_FILE para que `\getenv` as enxergue no fresh-init de volume vazio,
# mantendo zero senha em texto plano no spec do serviço.
#
# Inerte no banco já existente (init não re-roda); essencial para disaster-recovery / volume novo.
# POSTGRES_PASSWORD continua sendo tratado nativamente pela imagem via POSTGRES_PASSWORD_FILE.
set -eu

load_secret_file() {
  variable_name="$1"
  file_variable_name="${variable_name}_FILE"
  file_path="$(eval "printf '%s' \"\${${file_variable_name}:-}\"")"
  if [ -n "$file_path" ]; then
    if [ ! -f "$file_path" ]; then
      echo "Secret file not found: $file_path" >&2
      exit 1
    fi
    export "$variable_name=$(cat "$file_path")"
  fi
}

load_secret_file CADASTRO_DB_PASSWORD
load_secret_file IDENTIFICACAO_DB_PASSWORD
load_secret_file ARRECADACAO_DB_PASSWORD
load_secret_file DB_PASSWORD_DISTRIBUICAO

# Delega para o entrypoint oficial (CMD da imagem = "postgres" chega como "$@").
exec docker-entrypoint.sh "$@"

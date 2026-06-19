#!/bin/sh
# Carrega segredos montados como docker secrets (padrão *_FILE) para variáveis de ambiente,
# sem que a aplicação precise conhecer /run/secrets. Espelha o entrypoint do audit-service.
#
# Para cada VAR, se VAR_FILE apontar para um arquivo existente, exporta VAR com o conteúdo.
# Assim o stack monta o secret e define apenas VAR_FILE=/run/secrets/<nome>; o app continua
# lendo VAR normalmente. RABBITMQ_URL é montado pelo próprio app a partir dos campos
# (RABBITMQ_HOST/PORT/USER/VHOST + RABBITMQ_PASSWORD) quando não definido.
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
load_secret_file RABBITMQ_PASSWORD
load_secret_file STORAGE_LOGTO_CLIENT_SECRET
load_secret_file PORTAL_JWT_SECRET

exec dotnet Cadastro.API.dll

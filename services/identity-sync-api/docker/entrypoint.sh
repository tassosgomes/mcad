#!/bin/sh
# Carrega segredos (padrão *_FILE) e inicia a app Node. O config monta a RABBITMQ_URL a
# partir dos campos quando RABBITMQ_URL não está definida, então só a senha é segredo.
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

load_secret_file RABBITMQ_PASSWORD
load_secret_file LOGTO_M2M_CLIENT_SECRET
load_secret_file IDENTITY_SYNC_ADMIN_TOKEN

exec "$@"

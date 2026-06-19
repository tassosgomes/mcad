#!/bin/sh
# Carrega segredos (padrão *_FILE) e inicia a app Node. O BFF só tem o segredo opcional
# AI_RUNTIME_AUTH_SECRET; o load é no-op quando o *_FILE não está definido.
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

load_secret_file AI_RUNTIME_AUTH_SECRET

exec "$@"

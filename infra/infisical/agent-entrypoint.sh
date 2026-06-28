#!/usr/bin/env bash
# Entrypoint do container: sobe o Infisical Agent (mantém /render/*.env atualizado a partir
# do Infisical) e roda o materialize em loop idempotente sobre os arquivos renderizados.
#
# Por que não usar apenas o `execute.command` do agent: ele só dispara on-change e não roda
# na renderização inicial — a materialização de bootstrap não aconteceria. O loop garante
# bootstrap + reconciliação periódica. materialize-secrets.sh é idempotente (nome por hash),
# então rodar a cada ciclo é seguro. APPLY/PRUNE são herdados do ambiente do container.
set -u
CONFIG="${INFISICAL_CONFIG:-/etc/infisical/agent-config.yaml}"
INTERVAL="${MATERIALIZE_INTERVAL:-60}"

echo "[entrypoint] iniciando infisical agent (config=$CONFIG)..."
infisical agent --config "$CONFIG" &
AGENT_PID=$!

cleanup(){ kill "$AGENT_PID" 2>/dev/null || true; }
trap cleanup TERM INT

while kill -0 "$AGENT_PID" 2>/dev/null; do
  for f in /render/*.env; do
    [ -e "$f" ] || continue
    p=$(basename "$f" .env); [ "$p" = "shared" ] && p=""
    /usr/local/bin/materialize-secrets.sh "$f" "$p" || echo "[entrypoint] materialize falhou: $f"
  done
  sleep "$INTERVAL"
done

echo "[entrypoint] agent encerrou; saindo."
wait "$AGENT_PID" 2>/dev/null || true

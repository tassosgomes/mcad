---
status: pending
parallelizable: true
blocked_by: []
---

<task_context>
<domain>tooling/load-test</domain>
<type>implementation</type>
<scope>configuration</scope>
<complexity>low</complexity>
<dependencies></dependencies>
<unblocks>"2.0"</unblocks>
</task_context>

# Tarefa 1.0: Estrutura — Dockerfile + docker-compose + main.js

## Visão Geral

Criar a estrutura do projeto em `services/load-test/`: Dockerfile baseado em `grafana/k6`, docker-compose com env vars, e main.js com options (20 VUs, duração configurável) e orquestrador de cenários ponderados (60/15/10/10/5).

## Arquivos Envolvidos

- **Criar:**
  - `services/load-test/Dockerfile`
  - `services/load-test/docker-compose.yml`
  - `services/load-test/scripts/main.js`

## Subtarefas

- [ ] 1.1 Dockerfile: `FROM grafana/k6:latest`, WORKDIR /scripts, COPY scripts, ENTRYPOINT k6 run
- [ ] 1.2 docker-compose.yml: build context, env vars (API_BASE_URL, VUS, DURATION, PACE_MULTIPLIER), network_mode host
- [ ] 1.3 main.js: export options (vus from env, duration from env, thresholds <5% error + p95<2s), seleção ponderada de cenários (placeholder functions), sleep entre cenários (5-10s)
- [ ] 1.4 `docker build -t mcad-simulador .` → build ok

## Critérios de Sucesso (Verificáveis)

- [ ] `docker build` sem erros
- [ ] `docker run mcad-simulador --dry-run` inicia k6 (pode falhar por falta de API, mas não por erro de script)

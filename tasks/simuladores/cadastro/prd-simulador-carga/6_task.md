---
status: pending
parallelizable: false
blocked_by: ["5.0"]
---

<task_context>
<domain>tooling/load-test</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server, database</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 6.0: Carga — 20 VUs × 1 hora + README

## Visão Geral

Rodar com configuração real (20 VUs, 1 hora) para validar concorrência: sem deadlocks, sem unique violations espúrias, sequences funcionam sob load, métricas corretas. Documentar no README.

## Subtarefas

- [ ] 6.1 `docker-compose up` com VUS=20 DURATION=1h
- [ ] 6.2 Monitorar: `docker logs -f simulador`
- [ ] 6.3 Verificar k6 summary:
  - Error rate < 5%
  - p95 latency < 2s
  - Counters: ~2.500+ entidades criadas em 1h
- [ ] 6.4 Verificar no banco: sem registros com Codigo duplicado, sem deadlocks no log do PostgreSQL
- [ ] 6.5 Se erros de concorrência: ajustar (retry em unique violation, transaction isolation)
- [ ] 6.6 Criar README.md:
  - Como rodar (`docker-compose up -d`)
  - Variáveis de ambiente (API_BASE_URL, VUS, DURATION, PACE_MULTIPLIER)
  - Métricas esperadas (entidades/hora por VU)
  - Projeção de volume (tabela com estimativas)
  - Como parar (`docker-compose down`)
  - Como verificar progresso (`SELECT count(*) FROM cadastro.obras_musicais`)

## Critérios de Sucesso (Verificáveis)

- [ ] 20 VUs rodam 1h sem crash
- [ ] Error rate < 5%
- [ ] ~2.500+ entidades criadas em 1h (validar projeção)
- [ ] Zero deadlocks no PostgreSQL
- [ ] README.md completo e funcional

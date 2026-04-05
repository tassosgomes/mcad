# Resumo de Tarefas — Simulador de Carga

## Visão Geral

Simulador k6 em container Docker com 5 cenários ponderados, geradores de dados brasileiros e 20 VUs. São 6 tarefas sequenciais.

## Tarefas

- [x] 1.0 Estrutura: Dockerfile + docker-compose + main.js (options + orquestrador)
- [x] 2.0 Helpers: api.js (HTTP client) + generators.js (CPF/CNPJ/nomes/ISRC) + pool.js + metrics.js
- [x] 3.0 Data: nomes.json (~200+200) + titulos.json + generos.json
- [x] 4.0 Cenários: cicloCompleto + obraSemFonograma + edicao + depuracao + bloqueio
- [ ] 5.0 Validação: 1 VU × 5 min → cenários funcionam, dados válidos, sem erros
- [ ] 6.0 Carga: 20 VUs × 1 hora → sem deadlocks, métricas corretas, README documentado

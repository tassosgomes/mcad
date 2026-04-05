---
status: pending
parallelizable: false
blocked_by: ["4.0"]
---

<task_context>
<domain>tooling/load-test</domain>
<type>testing</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>http_server</dependencies>
<unblocks>"6.0"</unblocks>
</task_context>

# Tarefa 5.0: Validação — 1 VU × 5 min

## Visão Geral

Rodar o simulador com 1 VU por 5 minutos para validar que todos os cenários funcionam, dados são válidos (CPF, CNPJ, ISRC aceitos pela API), e não há erros de lógica.

## Subtarefas

- [ ] 5.1 `docker-compose up` com VUS=1 DURATION=5m
- [ ] 5.2 Verificar: 0 erros HTTP (check k6 summary)
- [ ] 5.3 Verificar: counters incrementam (obras_criadas > 0, fonogramas_criados > 0)
- [ ] 5.4 Verificar no banco: registros criados com dados válidos
- [ ] 5.5 Verificar: cenários de edição, depuração e bloqueio executam sem erros
- [ ] 5.6 Corrigir erros encontrados

## Critérios de Sucesso (Verificáveis)

- [ ] k6 summary: 0% error rate
- [ ] Pelo menos 5 obras + 5 fonogramas criados em 5 min
- [ ] Pelo menos 1 depuração e 1 bloqueio executados

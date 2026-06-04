# Review da Tarefa 4.0 - Evoluir proxy BFF para captura de GET Prata/Ouro com fail-closed

## Resultado da Validacao Automatizada

Status: PASSOU

Comandos executados:

- `rtk npm run build` em `services/bff`
  - Resultado: passou
  - Evidencia: `tsc -p tsconfig.json`
- `rtk npm test` em `services/bff`
  - Resultado: passou
  - Evidencia: `node --test dist/*.test.js dist/auditoria/*.test.js`
  - Resumo: 11 testes executados, 11 passaram, 0 falharam, 0 skipped

Observacao: nao ha script de lint dedicado no `services/bff/package.json`; o check de TypeScript disponivel e o `npm run build`.

## Resultado do Review Tecnico

Status: APROVADO

A implementacao atende aos requisitos da task 4.0 e esta coerente com o PRD e a Tech Spec para o fluxo BFF de auditoria de leitura Prata/Ouro.

## Verificacoes de Conformidade

- `GET` Bronze mantem caminho regular do proxy e nao chama o audit-service.
- `GET` Prata/Ouro e classificado pelo catalogo antes da chamada upstream.
- Respostas Prata/Ouro 2xx sao bufferizadas, validadas como JSON e limitadas por `AUDIT_SCREEN_ACCESS_MAX_RESPONSE_BYTES`.
- Evento `SCREEN_ACCESS` Prata e publicado sem snapshot antes da resposta ao frontend.
- Evento `SCREEN_ACCESS` Ouro e publicado com snapshot do body JSON antes da resposta ao frontend.
- Falha de publicacao apos upstream 2xx retorna `503` com codigo `AUDIT_UNAVAILABLE` sem vazar o body upstream.
- Upstream 4xx/5xx nao publica evento de acesso de sucesso.
- Resposta Ouro nao JSON falha de forma segura com `AUDIT_RESPONSE_NOT_JSON` sem vazar body upstream.
- Hint divergente de `X-Audit-Screen-Id` e ignorado; a rota real determina a tela auditada.
- Headers `X-Audit-*` sao gerados/controlados pelo BFF e propagados para upstream/resposta.
- `traceparent` e propagado quando aplicavel.

## Revisao da Correcao do `X-Audit-Session-Id` Forjado

Status: APROVADA

O problema apontado na validacao anterior foi corrigido:

- `buildAuditHeaders` agora gera `x-audit-session-id` com `randomUUID()` no BFF.
- `removeClientAuditHeaders` remove `x-audit-session-id` e tambem `x-session-id` dos headers recebidos do cliente antes de encaminhar ao upstream no caminho auditado.
- O teste integrado `audited proxy publishes GOLD snapshot and ignores divergent frontend hint` envia `x-audit-session-id` e `x-session-id` forjados e valida que:
  - o upstream nao recebe os valores forjados;
  - o upstream nao recebe `x-session-id`;
  - o evento `SCREEN_ACCESS` usa o valor controlado pelo BFF;
  - a resposta expoe o mesmo `x-audit-session-id` controlado pelo BFF.

## Problemas Encontrados

Nenhum problema bloqueante encontrado.

## Recomendacao Final

APROVADA

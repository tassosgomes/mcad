---
status: pending
parallelizable: false
blocked_by: ["1.0", "3.0"]
---

<task_context>
<domain>plataforma/bff/proxy</domain>
<type>integration</type>
<scope>middleware</scope>
<complexity>high</complexity>
<dependencies>http_server,external_apis</dependencies>
<unblocks>5.0, 7.0, 8.0</unblocks>
</task_context>

# Tarefa 4.0: Evoluir proxy BFF para captura de `GET` Prata/Ouro com fail-closed

## Relacionada as User Stories

- Compliance recebe rastro para todo acesso `GET` Prata/Ouro.
- Responsavel por incidente tem snapshot fiel para consultas Ouro.
- Product owner evita auditoria de leitura em Bronze por default.

## Visao Geral

Alterar o proxy generico do BFF para classificar `GET` pelo catalogo, bufferizar respostas JSON Prata/Ouro, publicar `SCREEN_ACCESS` e somente depois entregar a resposta ao frontend. Se o audit-service falhar apos upstream 2xx, retornar `503 AUDIT_UNAVAILABLE` sem expor o body.

## Requisitos

- `GET` Bronze deve manter comportamento atual e nao gerar auditoria de acesso.
- `GET` Prata/Ouro deve bufferizar apenas resposta JSON dentro de limites definidos.
- Para upstream 2xx, publicar auditoria antes de devolver resposta.
- Para falha de publicacao Prata/Ouro, devolver `503 AUDIT_UNAVAILABLE` e nao vazar resposta.
- Para upstream 4xx/5xx, nao registrar acesso de sucesso nem snapshot.
- Para Ouro nao JSON, rejeitar ou tratar conforme regra explicita; na V1, falhar de forma segura.
- Propagar `X-Audit-Screen-Access-Id`, `X-Audit-Screen-Id`, `X-Audit-Screen-Name`, `X-Audit-Route`, `X-Audit-Session-Id`, `X-Audit-Command-Id` e `traceparent` quando aplicavel.

## Arquivos Envolvidos

- **Modificar:**
  - `services/bff/src/proxy.ts`
  - `services/bff/src/server.test.ts`
  - `services/bff/src/config.ts`
  - `services/bff/src/config.test.ts`
- **Criar:**
  - `services/bff/src/auditoria/auditedProxy.test.ts`, se os testes ficarem grandes demais para `server.test.ts`
  - Helpers de limite de bytes/content-type, se necessario
- **Referencia:**
  - `services/bff/src/correlationId.ts`
  - `services/bff/src/authzContext.ts`
  - `services/bff/src/auditoria/*`

## Subtarefas

- [ ] 4.1 Mapear o fluxo atual do proxy para rotas `/api/cadastro/v1`, `/api/arrecadacao/v1`, `/api/identificacao/v1` e `/api/distribuicao/v1`.
- [ ] 4.2 Inserir classificacao de auditoria antes da chamada upstream, sem confiar em hint livre do frontend.
- [ ] 4.3 Manter caminho streaming/atual para Bronze e para metodos nao auditados.
- [ ] 4.4 Implementar caminho bufferizado para `GET` Prata/Ouro com limite de bytes e validacao de `content-type`.
- [ ] 4.5 Publicar `SCREEN_ACCESS` Prata sem snapshot e Ouro com snapshot antes de responder ao cliente.
- [ ] 4.6 Implementar fail-closed com `503 AUDIT_UNAVAILABLE` quando upstream for 2xx e publicacao falhar.
- [ ] 4.7 Garantir que upstream 4xx/5xx nao gere evento de acesso de sucesso.
- [ ] 4.8 Propagar headers de correlacao para upstream e resposta, sem aceitar headers forjados do cliente.
- [ ] 4.9 Adicionar testes integrados com API fake e audit fake para Prata, Ouro, Bronze, falha de auditoria, resposta nao JSON e hint divergente.

## Sequenciamento

- Bloqueado por: 1.0, 3.0
- Desbloqueia: 5.0, 7.0, 8.0
- Paralelizavel: Nao. Esta tarefa altera o comportamento central do proxy e depende de catalogo e builder estabilizados.

## Rastreabilidade

- Cobre RF-02, RF-03, RF-04, RF-06 e RF-08.
- Evidencia esperada: Prata/Ouro so expoem resposta se o evento foi publicado; Bronze GET nao gera evento.

## Detalhes de Implementacao

Fail-closed e intencional para dados sensiveis. A resposta `503` deve usar formato de erro consistente com o BFF, com codigo `AUDIT_UNAVAILABLE`, sem incluir body upstream. A publicacao precisa acontecer depois da resposta upstream existir para que o snapshot Ouro represente o payload realmente entregue.

## Criterios de Sucesso Verificaveis

- [ ] Teste Bronze GET comprova que audit fake nao recebe chamada.
- [ ] Teste Prata comprova evento sem snapshot e resposta original preservada.
- [ ] Teste Ouro comprova snapshot identico ao body retornado ao frontend.
- [ ] Teste de falha no audit-service comprova `503 AUDIT_UNAVAILABLE` sem body upstream.
- [ ] Teste upstream 4xx/5xx comprova ausencia de snapshot/evento de sucesso.
- [ ] Teste de resposta Ouro nao JSON falha de forma segura.
- [ ] Headers `X-Audit-*` e `traceparent` sao gerados/propagados de forma controlada.

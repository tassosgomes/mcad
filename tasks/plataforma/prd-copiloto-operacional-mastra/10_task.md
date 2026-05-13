---
status: completed
parallelizable: false
blocked_by: [1.0, 2.0, 7.0, 8.0, 9.0]
---

<task_context>
<domain>plataforma/release</domain>
<type>documentation</type>
<scope>configuration</scope>
<complexity>medium</complexity>
<dependencies>docker,http_server,external_apis</dependencies>
<unblocks>implementation_complete</unblocks>
</task_context>

# Tarefa 10.0: Atualizar infraestrutura, documentacao e validacao E2E

## Relacionada as User Stories

- HU-01 Consultar obra por linguagem natural (suporte)
- HU-02 Investigar pagamento (suporte)
- HU-03 Validar pre-requisitos de distribuicao (suporte)
- HU-04 Executar fluxo com aprovacao (suporte)

## Visao Geral

Finalizar a entrega com Dockerfile, Docker Compose, env vars, documentacao operacional, testes integrados e E2E do fluxo principal.

## Requisitos

- Adicionar `ai-orchestrator` ao ambiente local.
- Documentar variaveis de ambiente e execucao.
- Validar BFF + AI + Frontend em fluxo integrado.
- Criar ou ajustar teste E2E do Copiloto com mocks seguros.
- Confirmar que segredos nao sao expostos.

## Arquivos Envolvidos

- **Criar:**
  - `services/ai-orchestrator/Dockerfile`
  - `services/ai-orchestrator/README.md`
  - `frontend/e2e/copiloto.spec.ts`
- **Modificar:**
  - `docker-compose.dev.yml` (servico `ai-orchestrator`)
  - `.env.example` (env vars AI/OpenAI/storage)
  - `README.md` (execucao resumida)
  - `services/bff/README.md` (rotas AI e env)
  - `frontend/playwright.config.ts` (somente se necessario para rota nova)
- **Referencia:**
  - `services/bff/Dockerfile`
  - `frontend/Dockerfile`
  - `docker-compose.dev.yml`
  - `docs/ai-dev/quality-ledger.md`
- **Skills para consultar durante implementacao:**
  - `react-testing` — E2E/fluxos com Playwright
  - `react-production-readiness` — build/test/config/seguranca
  - `restful-api` — documentacao de endpoints

## Subtarefas

- [x] 10.1 Criar Dockerfile multi-stage para `ai-orchestrator`.
- [x] 10.2 Adicionar servico `ai-orchestrator` no `docker-compose.dev.yml`.
- [x] 10.3 Documentar `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_ORCHESTRATOR_BASE_URL`, storage, timeouts e limites.
- [x] 10.4 Atualizar README do BFF com `/api/ai/v1/*`.
- [x] 10.5 Atualizar README raiz com execucao resumida do Copiloto.
- [x] 10.6 Criar E2E `frontend/e2e/copiloto.spec.ts` com backend mockado ou ambiente local controlado.
- [x] 10.7 Rodar build/test do `ai-orchestrator`, BFF e frontend.
- [x] 10.8 Rodar validacao de Docker Compose config.

## Sequenciamento

- Bloqueado por: 1.0, 2.0, 7.0, 8.0, 9.0
- Desbloqueia: implementation_complete
- Paralelizavel: Nao (tarefa de fechamento)

## Rastreabilidade

- Esta tarefa cobre: documentacao, validacao integrada e suporte final a RF-01/RF-06.
- Evidencia esperada: ambiente local documentado e fluxo principal validado.

## Detalhes de Implementacao

Variaveis minimas a documentar:

```text
AI_ORCHESTRATOR_BASE_URL=http://localhost:5300/v1
AI_HOST=0.0.0.0
AI_PORT=5300
OPENAI_API_KEY=
OPENAI_MODEL=
AI_STORAGE_URL=
AI_TOOL_TIMEOUT_MS=10000
AI_MAX_MESSAGE_CHARS=4000
AI_TRACE_PROMPTS=false
```

**Convencoes da stack (das skills consultadas):**
- Segredos nunca devem ter valor real em `.env.example`.
- E2E deve testar comportamento do usuario, nao detalhes internos.
- Validar Compose com comando de config antes de considerar pronto.

## Criterios de Sucesso (Verificaveis)

- [x] AI build/test: `cd services/ai-orchestrator && npm run build && npm test`
- [x] BFF build/test: `cd services/bff && npm run build && npm test`
- [x] Frontend build/test: `cd frontend && npm run build && npm run test`
- [x] Docker Compose valido: `docker compose -f docker-compose.dev.yml config`
- [x] E2E do Copiloto passa ou tem skip justificado por dependencia externa: `cd frontend && npx playwright test e2e/copiloto.spec.ts`
- [x] `.env.example` nao contem segredo real

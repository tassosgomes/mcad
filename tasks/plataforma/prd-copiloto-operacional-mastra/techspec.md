# Tech Spec — Copiloto Operacional com IA e Mastra

> **PRD:** `tasks/plataforma/prd-copiloto-operacional-mastra/prd.md`  
> **Domínio:** Plataforma / Cross-cutting  
> **Feature ID:** P-AI-01  
> **Data:** 2026-05-12

---

## Resumo Executivo

Esta Tech Spec propõe um novo serviço Node.js/TypeScript, `ai-orchestrator`, responsável por hospedar a Mastra e expor endpoints de chat/workflow ao BFF. O frontend continua chamando o BFF; o BFF encaminha chamadas de IA ao `ai-orchestrator`; e o `ai-orchestrator` usa agents, tools e workflows Mastra para consultar APIs internas do MCAD de forma tipada, autorizada e auditável.

O MVP implementa tools somente leitura, workflows determinísticos para consultas compostas e um contrato de `RuntimeContext` com identidade, permissões e request ID. A arquitetura preserva o isolamento dos domínios: tools chamam APIs existentes via HTTP, nunca acessam diretamente schemas de outros serviços. Ações sensíveis futuras devem usar `suspend/resume` da Mastra para confirmação humana antes de qualquer escrita.

---

## Skills de Referência

| Skill | Caminho | Decisões Influenciadas |
|---|---|---|
| `prd-creator` | `/home/tsgomes/.agents/skills/flow/prd-creator/SKILL.md` | Escopo, requisitos, métricas e non-goals |
| `techspec-creator` | `/home/tsgomes/.agents/skills/flow/techspec-creator/SKILL.md` | Estrutura da especificação e inventário de artefatos |
| `openai-docs` | `/home/tsgomes/.codex/skills/.system/openai-docs/SKILL.md` | Uso de OpenAI como provedor de modelo |

---

## Arquitetura do Sistema

### Visão Geral dos Componentes

```
React SPA
  │
  │ POST /api/ai/v1/chat
  ▼
BFF Node/Fastify
  │
  │ proxy interno + headers de auth/request
  ▼
ai-orchestrator Node/TypeScript + Mastra
  ├─ Agent: mcadOperationalAgent
  ├─ Tools: cadastro/arrecadacao/distribuicao/auditoria/authz
  ├─ Workflows: explicarObra, validarDistribuicao, prepararAcaoSensivel
  ├─ Storage: PostgreSQL ou LibSQL dev para memória, traces e workflow snapshots
  └─ OpenAI model provider
        │
        ├─ HTTP APIs MCAD via BFF ou service URLs internas
        └─ ecad-authz para permissão efetiva
```

### Responsabilidades

| Componente | Responsabilidade |
|---|---|
| Frontend | UI de conversa, histórico visível, estados de execução, confirmação de workflows suspensos |
| BFF | Fronteira do frontend, CORS, roteamento `/api/ai/v1/*`, propagação de auth e request ID |
| `ai-orchestrator` | Mastra server, agents, tools, workflows, storage e observabilidade |
| APIs de domínio | Fonte autoritativa de dados operacionais |
| `ecad-authz` | Decisão autoritativa de permissão fina |
| OpenAI | Modelo de linguagem usado pelo agent |

### Decisão Principal: Serviço Separado

O `ai-orchestrator` deve ser criado como serviço separado, não embutido no BFF. O BFF atual é um proxy simples; a Mastra introduz dependências, lifecycle próprio, storage, tracing, workflows e configuração de modelo. Separar evita transformar o BFF em runtime de agentes e facilita escalar/monitorar IA independentemente.

---

## Design de Implementação

### Estrutura Sugerida

```
services/ai-orchestrator/
  package.json
  tsconfig.json
  Dockerfile
  src/
    index.ts
    mastra/index.ts
    mastra/agents/mcad-operational-agent.ts
    mastra/tools/authz-tool.ts
    mastra/tools/cadastro-tools.ts
    mastra/tools/arrecadacao-tools.ts
    mastra/tools/distribuicao-tools.ts
    mastra/tools/auditoria-tools.ts
    mastra/workflows/explicar-obra-workflow.ts
    mastra/workflows/validar-distribuicao-workflow.ts
    mastra/workflows/preparar-acao-sensivel-workflow.ts
    config/env.ts
    http/mcad-client.ts
    http/auth-context.ts
    schemas/chat.ts
    schemas/runtime-context.ts
    security/redaction.ts
    observability/logger.ts
    __tests__/
```

### Mastra Agent

O agente principal deve ser restrito por instruções operacionais:

- responder em português;
- usar tools para dados factuais;
- não inventar status, valores ou permissões;
- não expor dados quando tool negar permissão;
- propor ações sensíveis como plano, não executá-las automaticamente;
- citar quais entidades foram consultadas quando isso ajudar a auditoria.

Exemplo conceitual:

```ts
export const mcadOperationalAgent = new Agent({
  name: 'mcad-operational-agent',
  instructions: async ({ runtimeContext }) => {
    const permissions = runtimeContext.get('permissions') ?? [];

    return [
      'Você é o copiloto operacional do MCAD.',
      'Use tools para consultar dados de Cadastro, Arrecadação, Identificação, Distribuição e Auditoria.',
      'Nunca invente dados operacionais.',
      `Permissões efetivas do usuário: ${JSON.stringify(permissions)}`,
    ].join('\n');
  },
  model: openai(process.env.OPENAI_MODEL ?? 'gpt-4.1-mini'),
  tools: {
    buscarObra,
    buscarFonograma,
    buscarTitular,
    consultarPagamento,
    consultarProcessoDistribuicao,
    consultarAuditoria,
  },
});
```

> O modelo acima é placeholder. Antes da implementação, confirmar o modelo OpenAI padrão vigente e disponível no ambiente.

### RuntimeContext

A Mastra documenta `RuntimeContext` como mecanismo para passar valores específicos de requisição para agents, tools e workflows. O MCAD deve usá-lo como contrato obrigatório:

```ts
export type McadRuntimeContext = {
  userId: string;
  displayName?: string;
  roles: string[];
  permissions: string[];
  accessToken: string;
  requestId: string;
  locale: 'pt-BR';
  environment: 'local' | 'dev' | 'prod';
};
```

O BFF deve propagar o token ou uma credencial interna validável. O `ai-orchestrator` deve validar contexto antes de iniciar qualquer agent/workflow e deve recusar execução sem `userId`, `requestId` e autorização mínima.

### Tools

As tools devem ser criadas com `createTool`, `inputSchema`, `outputSchema`, descrição objetiva e execução com `AbortSignal`. Cada tool:

1. valida entrada com Zod;
2. checa permissão no RuntimeContext ou via `authzTool`;
3. chama API interna com timeout;
4. sanitiza resposta antes de entregar ao modelo;
5. registra auditoria técnica da chamada.

Exemplo conceitual:

```ts
export const buscarObra = createTool({
  id: 'buscar-obra',
  description: 'Consulta obra musical por ID, código, título ou ISWC.',
  inputSchema: z.object({
    termo: z.string().min(2),
  }),
  outputSchema: z.object({
    obras: z.array(z.object({
      id: z.string(),
      titulo: z.string(),
      status: z.string(),
      iswc: z.string().nullable(),
    })),
  }),
  execute: async ({ context, runtimeContext }, { abortSignal }) => {
    assertPermission(runtimeContext, 'cadastro.obras.read');
    return mcadClient.get('/api/cadastro/v1/obras', {
      searchParams: { q: context.termo },
      abortSignal,
      accessToken: runtimeContext.get('accessToken'),
    });
  },
});
```

### Workflows

Workflows devem ser usados quando o processo exigir sequência previsível, paralelismo ou aprovação humana.

#### `explicarObraWorkflow`

Fluxo:

1. Normalizar entrada (`obraId`, título, ISWC ou código).
2. Buscar obra.
3. Em paralelo, buscar titulares, fonogramas e auditoria.
4. Consolidar achados.
5. Chamar agente para gerar explicação operacional com dados estruturados.

#### `validarDistribuicaoWorkflow`

Fluxo:

1. Validar rubrica/período.
2. Consultar rol fechado na Identificação.
3. Consultar verba líquida disponível na Arrecadação.
4. Consultar processo existente na Distribuição.
5. Retornar checklist tipado: `apto`, `bloqueios`, `avisos`, `fontes`.

#### `prepararAcaoSensivelWorkflow`

Fluxo futuro, fora do MVP de escrita:

1. Interpretar intenção.
2. Preparar proposta de alteração.
3. Validar permissão.
4. Suspender com `suspend()` e aguardar aprovação humana.
5. Retomar com `resume()` e executar tool de escrita apenas se aprovado.

### Endpoints de API

#### BFF

| Método | Caminho | Descrição |
|---|---|---|
| `POST` | `/api/ai/v1/chat` | Envia mensagem para o agent e retorna resposta |
| `POST` | `/api/ai/v1/workflows/:workflowId/runs` | Inicia workflow |
| `POST` | `/api/ai/v1/workflows/:workflowId/runs/:runId/resume` | Retoma workflow suspenso |

#### `ai-orchestrator`

| Método | Caminho | Descrição |
|---|---|---|
| `GET` | `/health/live` | Liveness |
| `GET` | `/health/ready` | Readiness com OpenAI/storage opcional |
| `POST` | `/v1/chat` | Execução do agent |
| `POST` | `/v1/workflows/:workflowId/runs` | Criação de execução |
| `POST` | `/v1/workflows/:workflowId/runs/:runId/resume` | Retomada de execução suspensa |

### Modelos de Dados

```ts
export const chatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  threadId: z.string().uuid().optional(),
  workflowHint: z.string().optional(),
});

export const chatResponseSchema = z.object({
  threadId: z.string(),
  answer: z.string(),
  toolCalls: z.array(z.object({
    toolId: z.string(),
    status: z.enum(['success', 'denied', 'error']),
  })),
  suspendedWorkflow: z.object({
    workflowId: z.string(),
    runId: z.string(),
    stepId: z.string(),
  }).optional(),
});
```

### Storage

Em desenvolvimento, pode-se usar LibSQL. Para ambiente compartilhado, usar PostgreSQL. A documentação da Mastra indica que storage persiste mensagens, threads, recursos, snapshots de workflows, evals e traces; portanto o serviço deve configurar storage explicitamente fora de testes locais.

No PostgreSQL, criar schema dedicado `ai` ou banco lógico separado, evitando misturar tabelas de memória/traces com schemas dos domínios.

---

## Inventário de Artefatos

### Arquivos a Criar

| Caminho | Tipo | Descrição |
|---|---|---|
| `services/ai-orchestrator/package.json` | Config | Dependências Mastra, OpenAI provider, Zod, TSX, TypeScript |
| `services/ai-orchestrator/tsconfig.json` | Config | Configuração TypeScript |
| `services/ai-orchestrator/Dockerfile` | Infra | Build/runtime do serviço |
| `services/ai-orchestrator/src/index.ts` | Bootstrap | Inicialização HTTP/Mastra |
| `services/ai-orchestrator/src/mastra/index.ts` | Mastra | Registro de agents, tools, workflows e storage |
| `services/ai-orchestrator/src/mastra/agents/mcad-operational-agent.ts` | Agent | Agente operacional principal |
| `services/ai-orchestrator/src/mastra/tools/authz-tool.ts` | Tool | Consulta/verificação de permissões |
| `services/ai-orchestrator/src/mastra/tools/cadastro-tools.ts` | Tool | Tools `buscarObra`, `buscarFonograma`, `buscarTitular` |
| `services/ai-orchestrator/src/mastra/tools/arrecadacao-tools.ts` | Tool | Tool `consultarPagamento` |
| `services/ai-orchestrator/src/mastra/tools/distribuicao-tools.ts` | Tool | Tool `consultarProcessoDistribuicao` |
| `services/ai-orchestrator/src/mastra/tools/auditoria-tools.ts` | Tool | Tool `consultarAuditoria` |
| `services/ai-orchestrator/src/mastra/workflows/explicar-obra-workflow.ts` | Workflow | Consolidação operacional de obra |
| `services/ai-orchestrator/src/mastra/workflows/validar-distribuicao-workflow.ts` | Workflow | Checklist de distribuição |
| `services/ai-orchestrator/src/mastra/workflows/preparar-acao-sensivel-workflow.ts` | Workflow | Suspensão para aprovação humana |
| `services/ai-orchestrator/src/config/env.ts` | Config | Variáveis de ambiente |
| `services/ai-orchestrator/src/http/mcad-client.ts` | HTTP | Cliente para APIs internas |
| `services/ai-orchestrator/src/http/auth-context.ts` | Segurança | Extração/validação de contexto |
| `services/ai-orchestrator/src/schemas/chat.ts` | Schema | Contratos de chat |
| `services/ai-orchestrator/src/schemas/runtime-context.ts` | Schema | Contrato RuntimeContext |
| `services/ai-orchestrator/src/security/redaction.ts` | Segurança | Sanitização de logs/traces |
| `services/ai-orchestrator/src/observability/logger.ts` | Observabilidade | Logger estruturado |
| `services/ai-orchestrator/src/__tests__/tools.test.ts` | Teste | Unitários de tools e permissões |
| `services/ai-orchestrator/src/__tests__/workflows.test.ts` | Teste | Unitários de workflows |
| `services/ai-orchestrator/README.md` | Docs | Execução local e variáveis |
| `frontend/src/features/copiloto/pages/CopilotoPage.tsx` | Frontend | Página/painel do copiloto |
| `frontend/src/features/copiloto/api/copilotoApi.ts` | Frontend | Cliente `/api/ai/v1/*` |
| `frontend/src/features/copiloto/components/ChatPanel.tsx` | Frontend | UI de chat |
| `frontend/src/features/copiloto/components/ToolTraceList.tsx` | Frontend | Lista discreta de tools |
| `frontend/src/features/copiloto/components/WorkflowApproval.tsx` | Frontend | Confirmação de workflow suspenso |

### Arquivos a Modificar

| Caminho | Alteração |
|---|---|
| `services/bff/src/config.ts` | Adicionar `AI_ORCHESTRATOR_BASE_URL` e upstream `/api/ai/v1` |
| `services/bff/src/server.ts` | Registrar proxy/rotas AI se não usar loop de upstream existente |
| `services/bff/README.md` | Documentar rotas e variáveis AI |
| `services/bff/src/server.test.ts` | Testar roteamento AI |
| `frontend/src/app/router/routes.tsx` | Adicionar rota do Copiloto |
| `frontend/src/app/providers/AppProviders.tsx` | Disponibilizar provider de auth/contexto se necessário |
| `frontend/src/shared/components/*` | Reusar Button, Modal, Toast, ErrorState; criar apenas o que faltar |
| `docker-compose.dev.yml` | Adicionar serviço `ai-orchestrator` |
| `.env.example` | Documentar `OPENAI_API_KEY`, `OPENAI_MODEL`, `AI_ORCHESTRATOR_BASE_URL`, storage e timeouts |
| `README.md` | Adicionar instruções resumidas de execução |

### Arquivos de Referência (não alterar)

| Caminho | Motivo |
|---|---|
| `vision.md` | Restrições globais e mapa de plataforma |
| `services/bff/src/proxy.ts` | Padrão de proxy atual |
| `docs/migracao-authz/prd.md` | Modelo de autorização fina via `ecad-authz` |
| `docs/architecture/auth-plan.md` | Contexto histórico de auth |
| `frontend/DESIGN.md` | Diretrizes visuais |
| `docs/events.md` | Contratos/eventos para futuras explicações cross-domain |

---

## Pontos de Integração

| Integração | Estratégia |
|---|---|
| OpenAI | Usar provider compatível com Mastra/AI SDK, chave apenas no backend |
| `ecad-authz` | Tool/middleware para obter permissões efetivas e negar tools sem permissão |
| APIs MCAD | HTTP com token propagado, timeout, retries limitados e erro tipado |
| PostgreSQL/LibSQL | Storage Mastra para memória, traces e snapshots |
| Frontend | Chamadas exclusivamente via BFF |

---

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descrição & Nível de Risco | Ação Requerida |
|---|---|---|---|
| BFF | Nova rota compatível | Adiciona upstream AI. Baixo risco. | Testes de proxy e CORS |
| Frontend | Nova feature | Adiciona página/painel de chat. Médio risco de UX. | Seguir DESIGN.md e testar responsivo |
| Infra local | Novo serviço | Adiciona container e env vars. Médio risco. | Atualizar Docker Compose e docs |
| Segurança | Novo vetor de acesso | Modelo pode tentar acessar dados fora da permissão. Alto risco. | Permissão por tool, redaction, auditoria |
| Custos | Uso de modelo | Tokens variam por conversa/workflow. Médio risco. | Limites de tamanho, métricas e rate limit |

---

## Abordagem de Testes

### Testes Unitários

- Tools negam execução sem permissão.
- Tools validam input com Zod.
- Tools sanitizam dados sensíveis antes de retornar ao agente.
- RuntimeContext rejeita chamadas sem usuário/request ID.
- Workflows retornam checklist tipado em sucesso parcial.

### Testes de Integração

- BFF roteia `/api/ai/v1/chat` para o `ai-orchestrator`.
- `ai-orchestrator` executa chat com tools mockadas.
- Workflow `explicarObraWorkflow` consolida respostas de tools paralelas.
- Workflow suspenso retorna `workflowId`, `runId` e `stepId`.

### E2E

- Usuário autenticado abre Copiloto e pergunta por uma obra.
- Usuário sem permissão recebe negação sem vazamento de dados.
- Falha de API de domínio aparece como resposta degradada e rastreável.

---

## Sequenciamento de Desenvolvimento

1. Criar scaffold `services/ai-orchestrator` com Mastra, health checks e config.
2. Adicionar proxy no BFF e variáveis de ambiente.
3. Implementar RuntimeContext e cliente HTTP interno.
4. Implementar tools de Cadastro e Authz.
5. Implementar agent principal com OpenAI.
6. Implementar `explicarObraWorkflow`.
7. Criar UI mínima do Copiloto no frontend.
8. Adicionar observabilidade, redaction e auditoria técnica.
9. Expandir para Arrecadação/Distribuição.
10. Preparar workflow suspenso para ação sensível sem habilitar escrita no MVP.

---

## Monitoramento e Observabilidade

Registrar:

- `ai.chat.requests.total`
- `ai.chat.latency.ms`
- `ai.tool.calls.total` por tool/status
- `ai.workflow.runs.total` por workflow/status
- `ai.authz.denied.total`
- token usage/custo quando disponível
- trace ID correlacionado ao `x-mcad-request-id`

Logs não devem conter CPF, CNPJ, documentos, e-mail completo, tokens ou payloads sensíveis. Traces de prompts/respostas devem ser sanitizados ou desabilitados em ambientes onde não houver política de retenção aprovada.

---

## Considerações Técnicas

### Decisões Principais

| Decisão | Justificativa |
|---|---|
| Mastra em serviço separado | Reduz acoplamento com BFF e isola runtime de agentes |
| Tools read-only no MVP | Diminui risco de automação indevida |
| RuntimeContext obrigatório | Permite autorização por usuário em agents, tools e workflows |
| Workflows para processos multi-etapa | Mais previsível e auditável que deixar tudo para raciocínio livre do agente |
| `suspend/resume` para escrita futura | Garante aprovação humana antes de ação sensível |
| Storage explícito | Necessário para memória, traces e snapshots sobreviverem a restart/deploy |

### Riscos Conhecidos

| Risco | Mitigação |
|---|---|
| Prompt injection tentando chamar tools indevidas | Permissão por tool e validação server-side, não por prompt |
| Vazamento de dados sensíveis em logs/traces | Redaction centralizada e política de retenção |
| Alucinação em resposta operacional | Obrigar uso de tools para fatos e diferenciar inferência de dado consultado |
| Custo imprevisível | Limites de mensagem, timeout, métricas e rate limiting por usuário |
| Divergência de versão Mastra | Fixar versão no `package-lock` e revisar docs no início da implementação |

### Conformidade com Padrões

- Preserva BFF como fronteira do frontend.
- Não viola Schema-per-Service.
- Mantém autorização real no backend/serviços.
- Usa TypeScript com schemas Zod para contratos.
- Usa Docker Compose para execução local.
- Não expõe segredo OpenAI no frontend.

---

## Referências

- Mastra Tools: https://mastra.ai/docs/agents/using-tools
- Mastra Workflows Control Flow: https://mastra.ai/docs/workflows/control-flow
- Mastra Agents and Tools in Workflows: https://mastra.ai/docs/workflows/agents-and-tools
- Mastra RuntimeContext: https://mastra.ai/docs/server-db/runtime-context
- Mastra Suspend/Resume: https://mastra.ai/docs/workflows/suspend-and-resume
- Mastra Storage: https://mastra.ai/docs/server-db/storage
- Mastra Observability: https://mastra.ai/docs/observability/overview

---

*Tech Spec gerada com a skill `techspec-creator`, usando documentação oficial da Mastra consultada em 2026-05-12.*

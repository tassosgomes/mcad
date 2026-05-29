---
status: completed
parallelizable: true
blocked_by: [1.0]
---

<task_context>
<domain>engine/bff/historico</domain>
<type>implementation</type>
<scope>core_feature</scope>
<complexity>medium</complexity>
<dependencies>fastify,ecad-auditoria,jwt</dependencies>
<unblocks>"7.0"</unblocks>
</task_context>

# Tarefa 5.0: Implementar rota BFF de histórico de alterações (proxy ao `ecad-auditoria`)

## Relacionada às User Stories

- [US-01] Diretor de Governança (auditoria como segregação) — cobertura direta
- [US-03] Gerente de Distribuição (ver histórico) — cobertura direta

## Visão Geral

Adicionar ao BFF a rota `GET /api/distribuicao/processos/:id/historico` que valida a permissão `distribuicao:default:processo:ver-historico-alteracoes` e proxa ao `ecad-auditoria` (`GET /entities/Processo/{id}/timeline`). Esta tarefa materializa a parte de audit timeline do ADR 0008.

Inclui também a configuração das variáveis de ambiente `AUDIT_BASE_URL` e `AUDIT_TIMEOUT_MS` no BFF.

## Requisitos

- 1 endpoint novo: `GET /api/distribuicao/processos/:id/historico`.
- Validação de permissão `distribuicao:default:processo:ver-historico-alteracoes` antes de proxar.
- Configuração `AUDIT_BASE_URL` (obrigatória) e `AUDIT_TIMEOUT_MS` (default 5000ms) em `config.ts`.
- Timeout firme + fallback 503 `{code: 'AUDIT_UNAVAILABLE'}`.
- Propagar `x-correlation-id` no proxy.
- Testes: sem JWT, sem permissão, com permissão + upstream 200, upstream 503/timeout.

## Arquivos Envolvidos

- **Criar:**
  - `services/bff/src/historicoRoutes.ts`
  - `services/bff/src/historicoRoutes.test.ts`
- **Modificar:**
  - `services/bff/src/config.ts` (validar `AUDIT_BASE_URL`, `AUDIT_TIMEOUT_MS`)
  - `services/bff/src/server.ts` (registrar `registerHistoricoRoutes`)
  - `services/bff/.env.example` (adicionar variáveis)
- **Referência:**
  - `services/bff/src/meRoutes.ts` (padrão de resolução de contexto authz + fetch upstream)
  - `services/bff/src/acessosRoutes.ts` (se Tarefa 4.0 estiver à frente — reusar helpers)
  - `docs/adr/0008-bff-gateway-cross-cutting.md`
  - `/home/tsgomes/github-tassosgomes/ecad-auditoria/docs/INTEGRATION_GUIDE.md` (contrato do timeline endpoint)
  - `/home/tsgomes/github-tassosgomes/ecad-auditoria/audit-contract/src/main/resources/schema/audit-event-v1.schema.json` (shape do evento `DATA_CHANGE` com diff)
- **Skills para consultar:**
  - `common-restful-api` — envelope de erro, status codes
  - `[stack]-observability` — propagação de correlation-id

## Subtarefas

- [ ] 5.1 Estender `config.ts` para validar `AUDIT_BASE_URL` (obrigatória) e `AUDIT_TIMEOUT_MS` (default 5000)
- [ ] 5.2 Atualizar `.env.example` com as duas variáveis novas
- [ ] 5.3 Criar `historicoRoutes.ts` com endpoint `GET /api/distribuicao/processos/:id/historico`
- [ ] 5.4 Implementar fetch ao `ecad-auditoria` propagando JWT + correlation-id; com timeout via `AbortController`
- [ ] 5.5 Implementar mapeamento de erros upstream → `ErrorResponse` (503 para 5xx/timeout; 502 para resposta malformada)
- [ ] 5.6 Registrar `registerHistoricoRoutes` em `server.ts`
- [ ] 5.7 Testes em `historicoRoutes.test.ts`
- [ ] 5.8 Documentar shape esperado da resposta no comentário do arquivo (referência ao schema do `audit-contract`)

## Sequenciamento

- Bloqueado por: 1.0 (precisa da permissão `processo:ver-historico-alteracoes` no catálogo)
- Desbloqueia: 7.0 (frontend de ProcessoDetailPage)
- Paralelizável: Sim — pode rodar em paralelo a 2.0, 3.0, 4.0 (mas coordenar `server.ts` com 4.0)

## Rastreabilidade

- Esta tarefa cobre: RF-02 (Trilha de auditoria), RF-03 (permissão `processo:ver-historico-alteracoes`)
- Evidência esperada: testes cobrindo 5 cenários + manual com `gerente.dev` recebendo timeline e `analista.dev` recebendo 403

## Detalhes de Implementação

### `config.ts` — extensão

```typescript
// services/bff/src/config.ts (trecho)
export interface BffConfig {
  // ... campos existentes (authzBaseUrl, authzTimeoutMs, meCacheTtlSeconds, ...)
  auditBaseUrl: string;       // NOVO — obrigatório
  auditTimeoutMs: number;     // NOVO — default 5000
}

export function loadBffConfig(env: NodeJS.ProcessEnv): BffConfig {
  // ... validações existentes
  const auditBaseUrl = required(env, 'AUDIT_BASE_URL');
  const auditTimeoutMs = parseInt(env.AUDIT_TIMEOUT_MS ?? '5000', 10);
  return { /* ... */, auditBaseUrl, auditTimeoutMs };
}
```

### `.env.example`

```bash
# Serviço de auditoria (ecad-auditoria)
AUDIT_BASE_URL=http://localhost:8090
AUDIT_TIMEOUT_MS=5000
```

### Skeleton de `historicoRoutes.ts`

```typescript
import type { FastifyInstance } from 'fastify';

export interface HistoricoRoutesOptions {
  config: BffConfig;
  // reuse helpers de meRoutes/acessosRoutes
}

export async function registerHistoricoRoutes(
  server: FastifyInstance,
  options: HistoricoRoutesOptions
): Promise<void> {
  server.get('/api/distribuicao/processos/:id/historico', async (request, reply) => {
    const ctx = await resolveAuthzContext(request, reply, options);
    if (!ctx) return;

    if (!ctx.permissions.includes('distribuicao:default:processo:ver-historico-alteracoes')) {
      return reply.code(403).send({ code: 'PERMISSION_DENIED' });
    }

    const { id } = request.params as { id: string };
    const correlationId = (request.headers['x-correlation-id'] as string) ?? request.id;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.config.auditTimeoutMs);

    try {
      const upstream = await fetch(
        `${options.config.auditBaseUrl}/entities/Processo/${id}/timeline`,
        {
          headers: {
            authorization: request.headers.authorization!,
            'x-correlation-id': correlationId,
            accept: 'application/json'
          },
          signal: controller.signal
        }
      );

      if (upstream.status === 200) {
        const body = await upstream.json();
        return reply.code(200).send(body);
      }
      if (upstream.status === 404) {
        return reply.code(404).send({ code: 'PROCESSO_NOT_FOUND' });
      }
      if (upstream.status >= 500) {
        request.log.warn({ status: upstream.status }, 'audit upstream error');
        return reply.code(503).send({ code: 'AUDIT_UNAVAILABLE' });
      }
      return reply.code(502).send({ code: 'AUDIT_UNEXPECTED' });
    } catch (err) {
      const isAbort = (err as { name?: string }).name === 'AbortError';
      request.log.error({ err, timeout: isAbort }, 'audit fetch failed');
      return reply.code(503).send({ code: 'AUDIT_UNAVAILABLE' });
    } finally {
      clearTimeout(timer);
    }
  });
}
```

### Shape esperado da resposta (proxy direto do audit-service)

Conforme schema V1:

```typescript
interface AuditTimelineResponse {
  events: Array<{
    id: string;
    eventType: 'SCREEN_ACCESS' | 'USER_ACTION' | 'DATA_CHANGE';
    occurredAt: string;        // ISO 8601
    subject: { id: string; name?: string; email?: string };
    entityType: 'Processo';
    entityId: string;
    action?: string;            // e.g., 'APROVAR', 'FINALIZAR'
    payload?: {                 // presente quando eventType === 'DATA_CHANGE'
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    };
    correlationId?: string;
  }>;
  page: number;
  size: number;
  total: number;
}
```

### Testes (`historicoRoutes.test.ts`) — cenários

```
1. GET /api/distribuicao/processos/{id}/historico sem Authorization → 401
2. Com JWT sem 'processo:ver-historico-alteracoes' → 403
3. Com permissão + audit upstream 200 → 200 com payload encaminhado
4. Com permissão + audit upstream 404 → 404 {code: PROCESSO_NOT_FOUND}
5. Com permissão + audit upstream 500 → 503 {code: AUDIT_UNAVAILABLE}
6. Com permissão + audit timeout (controlado) → 503 {code: AUDIT_UNAVAILABLE}
7. Validar que header x-correlation-id propaga em ambas as direções
```

**Convenções da stack (das skills consultadas):**

- Timeout via `AbortController` consistente com padrão em `meRoutes.ts`
- Fallback 503 com `{code: 'AUDIT_UNAVAILABLE'}` análogo ao `AUTHZ_UNAVAILABLE`
- Log estruturado: `{level, msg, route, status, subject?, durationMs}`
- Sem cache local de timeline nesta entrega (decisão explícita do ADR 0008)

## Critérios de Sucesso (Verificáveis)

- [ ] Build: `cd services/bff && npm run build` sem erros
- [ ] Lint: `cd services/bff && npm run lint` sem warnings
- [ ] `.env.example` atualizado e `config.ts` rejeita boot sem `AUDIT_BASE_URL`
- [ ] Testes: `cd services/bff && npm test -- historicoRoutes` — 7 cenários verdes
- [ ] Manual (com DEV seedado e audit-service rodando):
  - `curl -sH "Authorization: Bearer $JWT_GERENTE_DEV" $BFF/api/distribuicao/processos/{id}/historico` → 200 com array de eventos
  - `curl -sH "Authorization: Bearer $JWT_ANALISTA_DEV" $BFF/api/distribuicao/processos/{id}/historico` → 403
- [ ] `x-correlation-id` propaga visível em logs do BFF e do audit-service

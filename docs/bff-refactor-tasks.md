# Plano de Tarefas: Reorganizacao do BFF

## Visao Geral

Este documento organiza a refatoracao estrutural do `services/bff` em tarefas pequenas e marcaveis. O objetivo e melhorar legibilidade, modularidade e manutencao sem alterar comportamento funcional do BFF.

Escopo principal:

- Separar bootstrap Fastify, plugins, rotas, proxy e modulos de dominio.
- Reduzir arquivos grandes e responsabilidades misturadas.
- Extrair codigo compartilhado de autenticacao, HTTP, auditoria, headers e erros.
- Manter testes existentes passando a cada fase.

Fora de escopo nesta refatoracao:

- Alterar contratos HTTP publicos do BFF.
- Trocar Fastify ou bibliotecas principais.
- Reescrever regras de negocio.
- Introduzir banco, fila ou novo servico.

## Principios

- Refatorar por movimento incremental, mantendo build e testes verdes.
- Uma mudanca estrutural por fase.
- `*.routes.ts` deve registrar endpoints e traduzir HTTP, nao concentrar regra de negocio.
- `*.service.ts` deve orquestrar caso de uso.
- `*.client.ts` deve concentrar chamadas a upstreams.
- `*.mapper.ts` ou `*.presenter.ts` deve transformar payloads.
- Codigo usado por mais de um modulo deve ir para `shared/`.
- Codigo especifico do proxy deve ir para `proxy/`.
- Manter nomes de dominio e paths publicos em portugues.

## Estrutura Alvo

```txt
services/bff/src/
  index.ts

  app/
    buildServer.ts
    routes.ts
    plugins/
      cors.ts
      health.ts
      metrics.ts

  config/
    config.ts
    env.ts
    upstreams.ts

  shared/
    auth/
      authzContext.ts
      bearerToken.ts
      meCache.ts
      permissionGuard.ts

    http/
      correlationId.ts
      errors.ts
      fetchJson.ts
      headers.ts
      upstreamClient.ts

    audit/
      auditActor.ts
      auditHeaders.ts
      auditMetrics.ts
      auditPublisher.ts
      screenAccessCapture.ts
      screenAccessEventBuilder.ts
      screenAuditCatalog.ts
      screenAuditClassifier.ts
      snapshotHash.ts

  proxy/
    registerProxy.ts
    proxyTarget.ts
    proxyHeaders.ts
    runtimeAuth.ts
    auditedProxy.ts
    responseBody.ts

  modules/
    me/
      me.routes.ts
      me.service.ts

    dashboard/
      dashboard.routes.ts
      dashboard.service.ts
      dashboard.permissions.ts
      dashboard.types.ts

    acessos/
      acessos.routes.ts
      acessos.service.ts
      acessos.client.ts
      acessos.mapper.ts
      acessos.permissions.ts
      assignmentId.ts

    auditoria/
      auditoria.routes.ts
      auditoria.service.ts
      auditoria.client.ts
      auditoria.presenter.ts
      auditoria.permissions.ts
      report.mapper.ts

    historico/
      historico.routes.ts
      historico.service.ts
      historico.permissions.ts

    autorizacao/
      permissoes/
        permissionLifecycle.routes.ts
        permissionLifecycle.service.ts
        permissionLifecycle.client.ts
        permissionLifecycle.audit.ts
        permissionLifecycle.mapper.ts
        permissionLifecycle.validation.ts
        permissionLifecycle.contract.ts
```

## Checklist de Tarefas

### 0.0 Preparacao e Baseline

- [x] 0.1 Rodar `npm run build` em `services/bff`.
- [x] 0.2 Rodar `npm test` em `services/bff`.
- [x] 0.3 Registrar falhas pre-existentes, se houver, antes de mover arquivos.
- [x] 0.4 Confirmar que `dist/` continua ignorado pelo `.gitignore` raiz.
- [x] 0.5 Evitar remocao de arquivos gerados por ferramenta sem necessidade.

Arquivos de referencia:

- `services/bff/package.json`
- `services/bff/tsconfig.json`
- `services/bff/src/server.ts`
- `services/bff/src/proxy.ts`

Validacao:

```bash
cd services/bff
npm run build
npm test
```

### 1.0 Separar Bootstrap da Aplicacao

- [x] 1.1 Criar `services/bff/src/app/buildServer.ts` a partir de `server.ts`.
- [x] 1.2 Criar `services/bff/src/app/plugins/cors.ts`.
- [x] 1.3 Criar `services/bff/src/app/plugins/health.ts`.
- [x] 1.4 Criar `services/bff/src/app/plugins/metrics.ts`.
- [x] 1.5 Criar `services/bff/src/app/routes.ts` para centralizar registro de rotas e proxies.
- [x] 1.6 Atualizar `services/bff/src/index.ts` para importar o novo `buildServer`.
- [x] 1.7 Manter `server.ts` como facade temporaria ou remove-lo apenas se todos os imports forem atualizados.
- [x] 1.8 Ajustar testes de `server.test.ts` sem mudar expectativas funcionais.

Arquivos envolvidos:

- Criar: `services/bff/src/app/buildServer.ts`
- Criar: `services/bff/src/app/routes.ts`
- Criar: `services/bff/src/app/plugins/cors.ts`
- Criar: `services/bff/src/app/plugins/health.ts`
- Criar: `services/bff/src/app/plugins/metrics.ts`
- Modificar: `services/bff/src/index.ts`
- Modificar: `services/bff/src/server.test.ts`
- Referencia: `services/bff/src/server.ts`

Validacao:

```bash
cd services/bff
npm run build
npm test
```

### 2.0 Separar Configuracao

- [x] 2.1 Criar `services/bff/src/config/env.ts` com helpers de env.
- [x] 2.2 Criar `services/bff/src/config/upstreams.ts` com montagem de upstreams.
- [x] 2.3 Mover tipos `BffConfig` e `UpstreamConfig` para `services/bff/src/config/config.ts`.
- [x] 2.4 Atualizar imports que apontam para `./config.js`.
- [x] 2.5 Manter comportamento e defaults atuais.
- [x] 2.6 Atualizar `config.test.ts` para nova localizacao.

Arquivos envolvidos:

- Criar: `services/bff/src/config/env.ts`
- Criar: `services/bff/src/config/upstreams.ts`
- Criar ou mover: `services/bff/src/config/config.ts`
- Modificar: imports em `services/bff/src/**/*.ts`
- Modificar: testes de config

Validacao:

```bash
cd services/bff
npm run build
npm test
```

### 3.0 Criar Shared de Auth e HTTP

- [x] 3.1 Mover `authzContext.ts` para `shared/auth/authzContext.ts`.
- [x] 3.2 Extrair `extractBearer` e `deriveSubjectIdFromJwt` para `shared/auth/bearerToken.ts`.
- [x] 3.3 Mover `meCache.ts` para `shared/auth/meCache.ts`.
- [x] 3.4 Criar `shared/auth/permissionGuard.ts` para helpers `hasPermission` e `requirePermission`.
- [x] 3.5 Mover `correlationId.ts` para `shared/http/correlationId.ts`.
- [x] 3.6 Criar `shared/http/errors.ts` para `sendError` e payloads padronizados.
- [x] 3.7 Criar `shared/http/headers.ts` para normalizacao e copia de headers.
- [x] 3.8 Criar `shared/http/fetchJson.ts` para fetch com timeout e parsing defensivo.
- [x] 3.9 Atualizar imports sem alterar respostas HTTP.

Arquivos envolvidos:

- Criar: `services/bff/src/shared/auth/*`
- Criar: `services/bff/src/shared/http/*`
- Modificar: rotas que usam auth, cache, correlation id ou erros
- Referencia: `services/bff/src/authzContext.ts`
- Referencia: `services/bff/src/meCache.ts`
- Referencia: `services/bff/src/correlationId.ts`

Validacao:

```bash
cd services/bff
npm run build
npm test
```

### 4.0 Extrair Auditoria Compartilhada

- [x] 4.1 Mover arquivos de `src/auditoria/` para `shared/audit/` quando forem transversais.
- [x] 4.2 Criar `shared/audit/auditActor.ts` para montagem do actor.
- [x] 4.3 Criar `shared/audit/auditHeaders.ts` para headers `x-audit-*`.
- [x] 4.4 Criar `shared/audit/screenAccessCapture.ts` para fluxo comum de captura.
- [x] 4.5 Remover duplicacao entre `proxy.ts` e `auditoriaRoutes.ts`.
- [x] 4.6 Preservar politica fail-closed para auditoria SILVER/GOLD.
- [x] 4.7 Preservar metricas de captura, fail-closed, snapshot bytes e publish latency.
- [x] 4.8 Atualizar testes de auditoria para os novos caminhos.

Arquivos envolvidos:

- Criar: `services/bff/src/shared/audit/auditActor.ts`
- Criar: `services/bff/src/shared/audit/auditHeaders.ts`
- Criar: `services/bff/src/shared/audit/screenAccessCapture.ts`
- Mover: `services/bff/src/auditoria/auditMetrics.ts`
- Mover: `services/bff/src/auditoria/auditEventPublisher.ts`
- Mover: `services/bff/src/auditoria/screenAccessEventBuilder.ts`
- Mover: `services/bff/src/auditoria/screenAuditCatalog.ts`
- Mover: `services/bff/src/auditoria/screenAuditClassifier.ts`
- Mover: `services/bff/src/auditoria/snapshotHash.ts`
- Modificar: `services/bff/src/proxy.ts`
- Modificar: `services/bff/src/auditoriaRoutes.ts`

Validacao:

```bash
cd services/bff
npm run build
npm test
```

### 5.0 Quebrar Proxy Generico

- [x] 5.1 Criar `proxy/proxyTarget.ts` com resolucao de target e rewrite de URL.
- [x] 5.2 Criar `proxy/proxyHeaders.ts` com headers encaminhados, bloqueados e sanitizados.
- [x] 5.3 Criar `proxy/runtimeAuth.ts` com assinatura runtime para AI.
- [x] 5.4 Criar `proxy/responseBody.ts` com leitura de response body e limite de bytes.
- [x] 5.5 Criar `proxy/auditedProxy.ts` com fluxo de proxy auditado.
- [x] 5.6 Renomear `proxy.ts` para `proxy/registerProxy.ts` ou manter facade temporaria.
- [x] 5.7 Garantir que todos os upstreams continuem registrados com os mesmos prefixes.
- [x] 5.8 Garantir que alias legado de cadastro continue funcionando.

Arquivos envolvidos:

- Criar: `services/bff/src/proxy/proxyTarget.ts`
- Criar: `services/bff/src/proxy/proxyHeaders.ts`
- Criar: `services/bff/src/proxy/runtimeAuth.ts`
- Criar: `services/bff/src/proxy/responseBody.ts`
- Criar: `services/bff/src/proxy/auditedProxy.ts`
- Criar ou mover: `services/bff/src/proxy/registerProxy.ts`
- Modificar: imports do registro de proxy
- Referencia: `services/bff/src/proxy.ts`

Validacao:

```bash
cd services/bff
npm run build
npm test
```

### 6.0 Modularizar `me` e `dashboard`

- [x] 6.1 Criar `modules/me/me.routes.ts`.
- [x] 6.2 Criar `modules/me/me.service.ts` para resolucao de contexto e cache.
- [x] 6.3 Criar `modules/dashboard/dashboard.routes.ts`.
- [x] 6.4 Criar `modules/dashboard/dashboard.service.ts`.
- [x] 6.5 Criar `modules/dashboard/dashboard.permissions.ts`.
- [x] 6.6 Criar `modules/dashboard/dashboard.types.ts`.
- [x] 6.7 Remover regra de permissao e fetch direto de dentro do arquivo de rota.
- [x] 6.8 Atualizar testes existentes mantendo os mesmos cenarios.

Arquivos envolvidos:

- Criar: `services/bff/src/modules/me/me.routes.ts`
- Criar: `services/bff/src/modules/me/me.service.ts`
- Criar: `services/bff/src/modules/dashboard/dashboard.routes.ts`
- Criar: `services/bff/src/modules/dashboard/dashboard.service.ts`
- Criar: `services/bff/src/modules/dashboard/dashboard.permissions.ts`
- Criar: `services/bff/src/modules/dashboard/dashboard.types.ts`
- Referencia: `services/bff/src/meRoutes.ts`
- Referencia: `services/bff/src/dashboardRoutes.ts`

Validacao:

```bash
cd services/bff
npm run build
npm test
```

### 7.0 Modularizar `historico` e `acessos`

- [x] 7.1 Criar `modules/historico/historico.routes.ts`.
- [x] 7.2 Criar `modules/historico/historico.service.ts`.
- [x] 7.3 Criar `modules/historico/historico.permissions.ts`.
- [x] 7.4 Criar `modules/acessos/acessos.routes.ts`.
- [x] 7.5 Criar `modules/acessos/acessos.service.ts`.
- [x] 7.6 Criar `modules/acessos/acessos.client.ts` para chamadas ao authz.
- [x] 7.7 Criar `modules/acessos/acessos.mapper.ts`.
- [x] 7.8 Criar `modules/acessos/acessos.permissions.ts`.
- [x] 7.9 Criar `modules/acessos/assignmentId.ts`.
- [x] 7.10 Reduzir `acessos.routes.ts` para registro de endpoints e chamada ao service.
- [x] 7.11 Atualizar testes existentes mantendo contratos publicos.

Arquivos envolvidos:

- Criar: `services/bff/src/modules/historico/*`
- Criar: `services/bff/src/modules/acessos/*`
- Referencia: `services/bff/src/historicoRoutes.ts`
- Referencia: `services/bff/src/acessosRoutes.ts`

Validacao:

```bash
cd services/bff
npm run build
npm test
```

### 8.0 Modularizar `auditoria`

- [x] 8.1 Criar `modules/auditoria/auditoria.routes.ts`.
- [x] 8.2 Criar `modules/auditoria/auditoria.service.ts`.
- [x] 8.3 Criar `modules/auditoria/auditoria.client.ts` para query/report upstream.
- [x] 8.4 Criar `modules/auditoria/auditoria.presenter.ts`.
- [x] 8.5 Criar `modules/auditoria/auditoria.permissions.ts`.
- [x] 8.6 Criar `modules/auditoria/report.mapper.ts`.
- [x] 8.7 Mover `auditQueryClient.ts` para client ou shared conforme uso real.
- [x] 8.8 Manter redacao de snapshots por permissao.
- [x] 8.9 Manter rotas amigaveis e rotas `/api/auditoria/v1/*`.
- [x] 8.10 Atualizar testes existentes.

Arquivos envolvidos:

- Criar: `services/bff/src/modules/auditoria/*`
- Referencia: `services/bff/src/auditoriaRoutes.ts`
- Referencia: `services/bff/src/auditoria/auditEventPresenter.ts`
- Referencia: `services/bff/src/auditoria/auditQueryClient.ts`
- Referencia: `services/bff/src/auditoria/auditoriaPermissions.ts`

Validacao:

```bash
cd services/bff
npm run build
npm test
```

### 9.0 Modularizar `autorizacao/permissoes`

- [x] 9.1 Criar `modules/autorizacao/permissoes/permissionLifecycle.routes.ts`.
- [x] 9.2 Criar `permissionLifecycle.service.ts`.
- [x] 9.3 Criar `permissionLifecycle.client.ts` para chamadas ao authz.
- [x] 9.4 Criar `permissionLifecycle.audit.ts` para eventos de lifecycle.
- [x] 9.5 Criar `permissionLifecycle.mapper.ts`.
- [x] 9.6 Criar `permissionLifecycle.validation.ts`.
- [x] 9.7 Mover contrato para `permissionLifecycle.contract.ts`.
- [x] 9.8 Separar validacao de input, elegibilidade de remocao, mapeamento de erro e publicacao de auditoria.
- [x] 9.9 Preservar endpoints publicos existentes.
- [x] 9.10 Atualizar testes existentes.

Arquivos envolvidos:

- Criar: `services/bff/src/modules/autorizacao/permissoes/*`
- Referencia: `services/bff/src/authzPermissionLifecycleRoutes.ts`
- Referencia: `services/bff/src/authzPermissionLifecycleContract.ts`

Validacao:

```bash
cd services/bff
npm run build
npm test
```

### 10.0 Ajustar Estrutura de Testes

- [x] 10.1 Decidir se testes ficam ao lado do arquivo fonte ou em `src/**/*.test.ts`.
- [x] 10.2 Atualizar script `test` para cobrir testes em subpastas.
- [x] 10.3 Validar que `node --test` executa testes em subpastas sem depender de `dist/`.
- [x] 10.4 Garantir que testes de modulo nao dependam de ordem de execucao.
- [x] 10.5 Remover imports temporarios ou facades que ficarem sem uso.

Sugestao de script:

```json
{
  "test": "node --import tsx --test \"src/**/*.test.ts\""
}
```

Arquivos envolvidos:

- Modificar: `services/bff/package.json`
- Modificar: testes movidos para subpastas

Validacao:

```bash
cd services/bff
npm run build
npm test
```

### 11.0 Atualizar Documentacao do BFF

- [x] 11.1 Atualizar `services/bff/README.md` com a nova organizacao.
- [x] 11.2 Documentar como criar uma nova rota.
- [x] 11.3 Documentar quando usar `shared/`, `proxy/` ou `modules/`.
- [x] 11.4 Documentar comandos de build/test.
- [x] 11.5 Documentar que mudancas devem preservar contratos publicos existentes.

Arquivos envolvidos:

- Modificar: `services/bff/README.md`
- Referencia: `docs/bff-refactor-tasks.md`

Validacao:

```bash
cd services/bff
npm run build
npm test
```

### 12.0 Limpeza Final

- [x] 12.1 Remover facades temporarias se nao forem mais necessarias.
- [x] 12.2 Remover arquivos antigos vazios ou duplicados.
- [x] 12.3 Rodar busca por imports antigos.
- [x] 12.4 Rodar busca por duplicacao obvia de helpers movidos.
- [x] 12.5 Confirmar que nenhum arquivo gerado em `dist/` foi versionado.
- [x] 12.6 Confirmar que a arvore final segue a estrutura alvo ou registrar diferencas justificadas.

Nota: a arvore final segue a estrutura alvo para codigo de producao. Alguns
testes continuam na raiz de `src/` ou em `src/auditoria/` para manter os nomes
historicos dos arquivos de teste, mas importam diretamente os modulos finais.

Comandos uteis:

```bash
cd services/bff
npm run build
npm test
rg "from './config|from './authzContext|from './meCache|from './correlationId|from './proxy" src
```

## Rastreabilidade

| Objetivo | Tasks |
|---|---|
| Separar bootstrap Fastify | 1.0 |
| Separar configuracao e upstreams | 2.0 |
| Criar shared auth/http | 3.0 |
| Remover duplicacao de auditoria | 4.0 |
| Reduzir complexidade do proxy | 5.0 |
| Modularizar rotas simples | 6.0 |
| Modularizar acessos e historico | 7.0 |
| Modularizar auditoria | 8.0 |
| Modularizar lifecycle de permissoes | 9.0 |
| Manter testes executaveis apos mover arquivos | 10.0 |
| Atualizar documentacao | 11.0 |
| Limpeza final | 12.0 |

## Categorias de Cobertura

| Categoria | Task(s) / N/A | Status |
|---|---|---|
| Setup / Configuracao | 0.0, 2.0, 10.0 | Coberto |
| Modelos de Dados | N/A - sem banco ou schemas novos | Coberto |
| Logica de Negocio | 6.0, 7.0, 8.0, 9.0 preservam e isolam regras existentes | Coberto |
| Endpoints / Interfaces | 1.0, 6.0, 7.0, 8.0, 9.0 preservam rotas publicas | Coberto |
| Integracoes Externas | 3.0, 5.0, 7.0, 8.0, 9.0 isolam authz/auditoria/upstreams | Coberto |
| Validacoes e Erros | 3.0, 7.0, 8.0, 9.0 | Coberto |
| Testes | 0.0, subtarefas de cada fase, 10.0 | Coberto |
| Observabilidade | 1.0, 4.0, 5.0 | Coberto |
| Documentacao | 11.0 | Coberto |
| Seguranca | 3.0, 4.0, 5.0, 7.0, 8.0, 9.0 | Coberto |

## Dependencias e Paralelizacao

Sequencia recomendada:

```txt
0.0
  -> 1.0
  -> 2.0
  -> 3.0
  -> 4.0
  -> 5.0
  -> 6.0, 7.0, 8.0, 9.0
  -> 10.0
  -> 11.0
  -> 12.0
```

Tarefas potencialmente paralelizaveis apos `5.0`:

- `6.0` `me` e `dashboard`
- `7.0` `historico` e `acessos`
- `8.0` `auditoria`
- `9.0` `autorizacao/permissoes`

Mesmo quando paralelizaveis, cada fase deve terminar com:

```bash
cd services/bff
npm run build
npm test
```

## Definition of Done

- [x] Estrutura de pastas alvo implementada ou diferencas registradas neste documento.
- [x] Nenhum contrato HTTP publico foi alterado sem decisao explicita.
- [x] `npm run build` passa em `services/bff`.
- [x] `npm test` passa em `services/bff`.
- [x] `services/bff/README.md` reflete a nova organizacao.
- [x] Arquivos antigos e facades temporarias foram removidos quando seguro.
- [x] `dist/` e `node_modules/` continuam fora do versionamento.

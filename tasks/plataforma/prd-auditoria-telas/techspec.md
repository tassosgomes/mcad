# Tech Spec - Auditoria de telas por criticidade

## Resumo Executivo

A solucao adiciona uma camada transversal de auditoria de leitura ao MCAD sem substituir a auditoria central existente. Operacoes Bronze continuam usando os publishers atuais de `USER_ACTION` e `DATA_CHANGE` nos handlers de escrita dos dominios. A novidade fica concentrada em dois pontos: um catalogo governado de telas/operacoes com nivel `BRONZE`, `SILVER` ou `GOLD`, e um fluxo no BFF para registrar `SCREEN_ACCESS` em leituras `GET` classificadas como Prata ou Ouro.

O ponto autoritativo de captura de snapshot Ouro sera o BFF, porque nele a resposta JSON ja representa o payload entregue ao frontend, com filtros, pagina, ordenacao e transformacoes aplicadas pela API de dominio. Para Prata, o BFF registra apenas metadados e contexto de negocio. Para Ouro, registra o mesmo evento `SCREEN_ACCESS` com snapshot em `screen.businessContext.snapshot`, sem mascaramento na V1. A consulta de catalogo, eventos e snapshots sera exposta pelo BFF com permissoes especificas de auditoria/compliance.

## Arquitetura do Sistema

### Visão Geral dos Componentes

- **Catalogo de Auditoria MCAD**: modulo versionado em codigo, com fonte autoritativa no BFF e copia de exibicao no frontend, contendo `screenId`, aliases legados, dominio, nome amigavel, rotas, metodos, nivel, justificativa, retencao e extratores de contexto.
- **BFF Fastify**: gateway para frontend e ponto de captura de `GET` Prata/Ouro. Resolve usuario/permissoes via `ecad-authz`, classifica a requisicao pelo catalogo, chama a API de dominio, monta o evento `SCREEN_ACCESS`, publica no `ecad-auditoria` e so entao devolve a resposta ao cliente.
- **APIs de dominio (.NET/Java)**: permanecem autoritativas para autorizacao e escritas. Continuam emitindo `USER_ACTION` e `DATA_CHANGE` via SDK/outbox, aproveitando headers `X-Audit-*`, `traceparent`, IP, rota e sessao propagados pelo BFF.
- **ecad-auditoria**: servico central existente para ingestao HTTP/AMQP e persistencia Oracle dos eventos. Sera reutilizado sem novo tipo de evento e sem nova persistencia no `ecad-authz`. Filtros por nivel e purge fisico por 90 dias ficam como evolucoes futuras.
- **Frontend React/Vite**: consome catalogo e eventos pelo BFF, exibe nomes amigaveis, filtros de negocio e detalhe de snapshot somente para usuarios com permissao.

Fluxo alvo:

```text
React -> BFF -> classifica GET no catalogo
              -> API dominio retorna JSON
              -> BFF registra SCREEN_ACCESS Prata/Ouro no ecad-auditoria
              -> BFF devolve JSON ao React

React -> BFF -> API dominio comando
              -> handler publica USER_ACTION + DATA_CHANGE via outbox
              -> ecad-auditoria persiste eventos correlacionados
```

## Design de Implementação

### Interfaces Principais

Catalogo governado:

```ts
type AuditLevel = 'BRONZE' | 'SILVER' | 'GOLD';

interface AuditScreenOperation {
  id: string;
  aliases: string[];
  domain: 'cadastro' | 'identificacao' | 'arrecadacao' | 'distribuicao' | 'auditoria';
  friendlyName: string;
  routePatterns: string[];
  methods: Array<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'>;
  level: AuditLevel;
  justification: string;
  businessContext: BusinessContextRule;
  retentionDays: number;
}
```

Contrato interno de captura no BFF:

```ts
interface ScreenAccessCapture {
  eventId: string;
  level: 'SILVER' | 'GOLD';
  operation: AuditScreenOperation;
  request: FastifyRequest;
  upstreamStatus: number;
  query: Record<string, unknown>;
  snapshot?: unknown;
}
```

O catalogo deve aceitar aliases porque a base atual mistura ids amigaveis em dot-notation no frontend (`cadastro.titulares.lista`) e ids legados em producers (`CADASTRO_TITULARES`, `ARRECADACAO_PAGAMENTOS`). A Tech Spec define o `id` dot-notation como canonico para novas leituras, mantendo aliases para consulta e correlacao com `DATA_CHANGE` existente.

O frontend pode enviar `X-Audit-Screen-Id` ou metadado equivalente apenas como hint de UX. O BFF deve validar esse valor contra uma allowlist por rota/metodo no catalogo e nunca permitir que o hint reduza criticidade. Se a rota real for `GET /api/cadastro/v1/titulares` e o navegador enviar `cadastro.obras.lista`, o BFF deve registrar a operacao de titulares ou rejeitar o hint, conforme regra do catalogo.

### Modelos de Dados

Nao criar tabela no MCAD para o catalogo na V1. A classificacao deve ser alterada via deploy, com rastreabilidade por Git/PR. O arquivo sugerido e `services/bff/src/auditoria/screenAuditCatalog.ts`, exportado tambem para o frontend por copia gerada ou pacote local simples.

Campos minimos por item:

- `id`: identificador canonico, ex. `cadastro.titulares.lista`.
- `aliases`: ids ja gravados em eventos antigos, ex. `CADASTRO_TITULARES`.
- `level`: Bronze/Prata/Ouro; ausencia de entrada equivale a Bronze.
- `routePatterns`: rotas BFF ou upstream que disparam a classificacao.
- `businessContext`: regra para extrair `entityType`, `entityId`, codigo de negocio, filtros, pagina, limite e ordenacao de params/body.
- `justification`, `owner`, `approvedBy`, `approvedAt`, `changeReason`.
- `retentionDays`: 90 para Prata/Ouro nesta entrega.

Evento `SCREEN_ACCESS`:

- `eventType`: `SCREEN_ACCESS`.
- `origin`: canal, IP, user agent, rota BFF, `screenId`, `screenName`.
- `correlation`: `traceId`, `requestId`, `userSessionId`, `screenAccessId`.
- `screen.businessContext`: filtros, params, entidade/codigo de negocio, `auditLevel`, `catalogVersion`.
- `screen.businessContext.snapshot`: somente Ouro, contendo `statusCode`, `headers` permitidos, `body`, `capturedAtUtc` e `contentHash`.
- `metadata`: `retentionDays`, `sourceRoute`, `upstreamName`, `responseBytes`.

O snapshot Ouro deve representar a resposta JSON entregue ao usuario. Nao deve incluir cookies, authorization headers, tokens ou headers internos. Na V1 nao ha mascaramento de campos do corpo.

### Endpoints de API

Novos endpoints BFF:

- `GET /api/auditoria/catalogo`: lista catalogo com nome amigavel, dominio, nivel, justificativa e aliases. Exige `auditoria:default:catalogo:visualizar`.
- `GET /api/auditoria/eventos`: wrapper para eventos de acesso/alteracao com filtros por usuario, tela, periodo, entidade/contexto e nivel. Exige `auditoria:default:evento:listar`.
- `GET /api/auditoria/eventos/:eventId`: detalhe do evento. Se o evento tiver snapshot Ouro, exige tambem `auditoria:default:snapshot:visualizar`.
- `GET /api/auditoria/v1/audit/screen-access`: manter compatibilidade, mas preferir o endpoint amigavel acima no frontend.

Endpoint de ingestao reutilizado:

- `POST {AUDIT_BASE_URL}/api/v1/audit/events`: publica `SCREEN_ACCESS` Prata/Ouro. O BFF deve usar timeout curto e idempotencia por `eventId`.

Rotas de dominio existentes continuam sob `/api/cadastro/v1`, `/api/arrecadacao/v1`, `/api/identificacao/v1` e `/api/distribuicao/v1`. O proxy generico deve ganhar um caminho auditado para `GET` Prata/Ouro: bufferiza resposta JSON, publica auditoria, e somente depois envia a resposta. Para Bronze, segue streaming/proxy atual.

## Pontos de Integração

- **ecad-authz**: novas permissoes de auditoria devem entrar no catalogo de permissoes/roles: `catalogo:visualizar`, `evento:listar`, `snapshot:visualizar` e, se necessario, `relatorio:exportar`. O `ecad-authz` nao persiste eventos de auditoria.
- **ecad-auditoria**: reaproveitar contrato V1 e persistencia Oracle existente. O payload completo do evento ja e persistido, portanto snapshots Ouro podem ser gravados dentro do `SCREEN_ACCESS` sem criar tabela no `ecad-authz`. Filtros por `metadata.auditLevel`/`screen.businessContext.auditLevel`, retorno paginado consistente e job de retencao 90 dias ficam planejados como evolucoes futuras.
- **SDKs de auditoria**: .NET e Java ja suportam `SCREEN_ACCESS`, `USER_ACTION` e `DATA_CHANGE`. Para BFF, criar produtor HTTP TypeScript pequeno em vez de introduzir SDK pesado.
- **Headers de correlacao**: BFF deve propagar `X-Audit-Screen-Access-Id`, `X-Audit-Screen-Id`, `X-Audit-Screen-Name`, `X-Audit-Route`, `X-Audit-Session-Id`, `X-Audit-Command-Id` e `traceparent` para comandos posteriores.

Tratamento de erro: leituras Prata/Ouro devem ser fail-closed. Se a API de dominio responder 2xx e o BFF nao conseguir registrar o evento de auditoria, o BFF deve devolver `503 AUDIT_UNAVAILABLE` e nao expor a resposta. Para respostas 4xx/5xx da API de dominio, nao registrar acesso de sucesso; logar somente metrica tecnica sem snapshot.

## Análise de Impacto

| Componente Afetado | Tipo de Impacto | Descricao & Nivel de Risco | Acao Requerida |
| ------------------ | --------------- | --------------------------- | -------------- |
| `services/bff/src/proxy.ts` | Mudanca comportamental | GET Prata/Ouro deixa de ser streaming e passa a bufferizar JSON. Risco alto por performance e compliance. | Implementar caminho auditado com limites, testes e fail-closed. |
| Catalogo frontend/BFF | Novo contrato interno | Define criticidade por tela via deploy. Risco medio de drift entre UI e BFF. | Gerar catalogo compartilhado e validar aliases em teste. |
| `ecad-auditoria` | Reuso de persistencia + evolucao futura | Snapshot Ouro aumenta volume e sensibilidade, mas usa payload JSON ja persistido. Risco alto. | Controle de acesso via BFF agora; filtros por nivel e purge 90 dias em evolucoes futuras. |
| APIs de dominio | Baixo impacto | Escritas ja auditam via outbox, mas precisam receber headers de correlacao consistentes. | Revisar middleware/proxy e smoke tests por dominio. |
| Frontend Auditoria | Evolucao UI | Adiciona catalogo, filtro por nivel e detalhe de snapshot. Risco medio. | Reusar telas existentes e remover chamada direta ao audit-service quando possivel. |
| Autorizacao | Novo catalogo de permissoes | Snapshots sem mascara exigem permissao forte. Risco alto. | Seed/roles de auditoria/compliance e testes 403. |

## Abordagem de Testes

### Testes Unitários

- Catalogo: tela sem classificacao retorna Bronze; aliases resolvem para mesmo item; Ouro inicial inclui `cadastro.titulares.lista`, `arrecadacao.pagamentos.lista` e `arrecadacao.verbas.lista`.
- BFF classifier: combina metodo, path, query e upstream; ignora Bronze GET; classifica Prata/Ouro corretamente.
- BFF event builder: remove headers sensiveis, preserva filtros/paginacao, calcula hash do snapshot e preenche `retentionDays=90`.
- Permissoes: detalhe de snapshot retorna 403 sem `auditoria:default:snapshot:visualizar`.
- Frontend: catalogo exibe nomes amigaveis e detalhe Ouro so renderiza quando permitido.

### Testes de Integração

- BFF + audit fake + API fake: GET Prata publica `SCREEN_ACCESS` sem snapshot e retorna resposta original.
- BFF + audit fake + API fake: GET Ouro publica `SCREEN_ACCESS` com snapshot identico ao body retornado.
- Falha no audit-service: GET Ouro/Prata com upstream 2xx retorna 503 e nao vaza body.
- Escrita correlacionada: comando posterior recebe `X-Audit-Screen-Access-Id` e evento `DATA_CHANGE` fica correlacionavel.
- ecad-auditoria/BFF: consulta por usuario/tela/periodo retorna eventos; detalhe de evento Ouro inclui snapshot para rota autorizada. Filtro direto por nivel fica para evolucao futura se o audit-service ainda nao suportar.
- E2E Playwright: usuario auditor consulta catalogo, filtra eventos, abre snapshot Ouro; usuario sem permissao recebe bloqueio.

## Sequenciamento de Desenvolvimento

### Ordem de Construção

1. Criar catalogo governado, aliases e testes de consistencia.
2. Adicionar permissoes/roles de auditoria no ecad-authz e guards no BFF.
3. Implementar produtor HTTP de eventos no BFF e builder de `SCREEN_ACCESS`.
4. Evoluir proxy BFF para caminho auditado de GET Prata/Ouro com fail-closed.
5. Ajustar frontend para consumir catalogo/eventos pelo BFF e exibir snapshot Ouro.
6. Registrar no backlog do `ecad-auditoria` filtros por nivel e job de retencao fisica de 90 dias.
7. Cobrir rotas iniciais Ouro e Prata dos dominios Cadastro, Identificacao, Arrecadacao, Distribuicao e Auditoria.

### Dependências Técnicas

- Confirmar URL e credenciais de `AUDIT_BASE_URL` para ingestao HTTP a partir do BFF.
- Definir lista inicial oficial de telas Prata alem das tres Ouro obrigatorias.
- Garantir que respostas Ouro sejam JSON e paginadas/limitadas.
- Disponibilizar roles de auditoria/compliance no ecad-authz.
- Registrar `retentionDays=90` nos eventos Prata/Ouro; job operacional de purge no Oracle sera criado em entrega futura.

## Monitoramento e Observabilidade

- Metricas BFF: `bff_audit_screen_access_total{level,outcome,screenId}`, `bff_audit_snapshot_bytes{screenId}`, `bff_audit_publish_latency_ms`, `bff_audit_fail_closed_total{level}`.
- Logs estruturados: `audit.screen_access.captured`, `audit.screen_access.publish_failed`, `audit.catalog.match_failed`, sempre sem body de snapshot em log.
- Tracing: propagar `traceparent` e registrar `screenAccessId`/`requestId` em logs do BFF e APIs.
- Dashboards: volume por nivel/tela, falhas de publicacao, tamanho medio de snapshot, eventos Ouro por usuario e taxa de 403 em snapshots.
- Alertas: qualquer `fail_closed_total` em Ouro; aumento anormal de snapshot bytes; ausencia de eventos Prata/Ouro em telas classificadas.

## Considerações Técnicas

### Decisões Principais

- **BFF como ponto autoritativo de captura Ouro**: evita divergencia entre payload bruto do backend e resposta final entregue ao frontend.
- **Catalogo via codigo/deploy**: atende governanca e impede parametrizacao livre de captura sensivel.
- **Reuso de `SCREEN_ACCESS`**: reduz mudanca no audit-service e preserva consultas existentes.
- **Fail-closed para Prata/Ouro**: evita exposicao de dados sensiveis sem rastro auditavel.
- **Bronze como default**: evita excesso de auditoria em telas nao classificadas.

### Riscos Conhecidos

- **Volume e custo de snapshots Ouro**: mitigar com Ouro restrito, paginação obrigatoria e retencao 90 dias.
- **Dados sensiveis dentro da auditoria**: mitigar por permissao `snapshot:visualizar`, logs sem payload e acesso sempre via BFF.
- **Drift de IDs de tela**: mitigar por aliases, allowlist por rota/metodo e teste que compara catalogo com `screenCatalog.ts` e constantes existentes.
- **Proxy bufferizado afetar latencia**: aplicar somente a GET Prata/Ouro e medir bytes/latencia.
- **Falha do audit-service bloquear telas sensiveis**: decisao intencional; precisa runbook operacional.

### Requisitos Especiais

- Snapshots Ouro da V1 nao aplicam mascaramento de campos.
- Eventos Prata e snapshots Ouro devem ter retencao de 90 dias.
- Nenhum token, cookie, senha ou header de autorizacao pode entrar em snapshot ou logs.
- O catalogo deve indicar justificativa e responsavel por cada classificacao Ouro.
- Consultas de snapshot devem ser auditaveis tambem, preferencialmente gerando `USER_ACTION` ou `SCREEN_ACCESS` na propria area de Auditoria.

### Conformidade com Padrões

- Segue ADR 0003: autorizacao real continua em backend/BFF, nunca apenas na SPA.
- Segue ADR 0004 e ADR 0008: frontend consome BFF para integracoes transversais com authz/auditoria.
- Reusa SDK/outbox ja implantado em .NET e Java para `USER_ACTION` e `DATA_CHANGE`.
- Mantem contrato do `ecad-auditoria` V1 e evita novo evento sem necessidade.
- Aplica deny seguro em falhas de autorizacao e fail-closed em falha de auditoria para leituras sensiveis.
- Respeita governanca do PRD: catalogo controlado por produto/compliance e alterado via deploy.

## Questoes Abertas e Esclarecimentos Assumidos

- Assumido: BFF pode publicar eventos no `ecad-auditoria` por HTTP autenticado; se a politica exigir AMQP/outbox no BFF, criar outbox leve antes do passo 4.
- Assumido: a lista Prata inicial sera definida por produto/compliance; a Tech Spec fixa apenas as tres Ouro obrigatorias do PRD.
- Decidido: filtro dedicado por `auditLevel` no `ecad-auditoria` sera feito futuramente. A V1 pode gravar `auditLevel` no payload/metadata e consultar por usuario, tela, periodo e detalhe.
- Decidido: o job de retencao fisica no Oracle sera criado futuramente. A V1 deve registrar `retentionDays=90` para preparar a politica.
- Decidido: snapshots Ouro da V1 suportam apenas respostas JSON. Respostas nao JSON devem ser rejeitadas para classificacao Ouro ou tratadas por regra especifica futura.

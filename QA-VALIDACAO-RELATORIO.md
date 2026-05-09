# Relatório de Validação Ponta a Ponta — mcad

**Data da execução:** 2026-05-08 / 2026-05-09
**Executor:** QA automatizado (Playwright + análise de código + acesso SSH ao servidor de produção)
**Ambiente:** https://mcad.tasso.dev.br (produção)
**APIs auxiliares:**
- mcad-cadastro.tasso.dev.br
- mcad-identificacao.tasso.dev.br
- mcad-arrecadacao.tasso.dev.br
- mcad-distribuicao.tasso.dev.br
- api-audit.tasso.dev.br (stack `audit-example`, separada)

## Sumário executivo

| Item | Resultado |
| --- | --- |
| Login com 8 usuários do `provision-logto.sh` | OK em todos |
| Cadastro (Associações / Titulares / Obras / Fonogramas) | OK — CRUD validado |
| Identificacao (Captações / Pendentes) | Corrigido (issues #003 e #005) — criação de captação validada |
| Arrecadacao (Usuários de Música / Licenças / Pagamentos / UDA) | Corrigido (issue #004 + endpoint novo de Rubricas) — criação de licença validada |
| Distribuicao (Rubricas / Processos) | Read-only OK (depende de eventos da Arrecadação) |
| Auditoria (Eventos / Acessos / Relatórios) | OK — issues #002 (env não substituída) e #006 (audit-service SSL) corrigidos. Timeline de Usuário de Música validada com 2 eventos (DATA_CHANGE + USER_ACTION) |
| RBAC analista vs consultor | OK — botões de escrita escondidos para consultores |
| Paginação em listas vazias (issue #001) | Corrigido em Fonogramas |

**Issues encontradas:** 7 (6 corrigidas e deployadas; 1 documentada como gap funcional do mcad)

**Imagens Docker novas no Docker Hub:**
- `tassosgomes/mcad-identificacao-api:0.1.4` — fix #003 (race condition em ClaimsTransformation)
- `tassosgomes/mcad-identificacao-api:0.1.5` (`latest`) — fix #005 (`sub` Logto não-GUID)
- `tassosgomes/mcad-frontend:0.1.3` — fix #002 (entrypoint envsubst com `AUDITORIA_API_BASE_URL`)
- `tassosgomes/mcad-frontend:0.1.4` (`latest`) — fix #001 (paginação Fonogramas) + fix #004 (busca de Usuário/Rubrica em Licença)
- `tassosgomes/mcad-arrecadacao-api:0.1.1` (`latest`) — endpoint novo `GET /api/v1/rubricas` (suporte ao fix #004)

**Audit-service externo:**
- `tassosgomes/audit-service:0.1.3` — fix #006 aplicado via env (`SPRING_RABBITMQ_SSL_ENABLED=false`); serviço UP, conectado a CloudAMQP, consumindo a queue `audit.events.ingest.v1`

---

## Telas testadas e ações executadas

### Cadastro (analista_cadastro)
- **Associações** — listagem das 7 associações do ECAD (ABRAMUS, AMAR, ASSIM, SBACEM, SICAM, SOCINPRO, UBC)
- **Titulares** — criar `QA Validacao Titular 001` (CPF 111.444.777-35, ABRAMUS), editar nome para `QA Validacao Titular 001 - Editado`
- **Obras** — criar `QA Validacao Obra 001` (Musical/MPB), abrir detalhe, adicionar Tasso Silva Gomes como Autor 100%
- **Fonogramas** — criar fonograma ISRC `BR-ABC-26-12345` associado à obra criada; paginação em estado vazio agora exibe `0–0 de 0` (era `NaN–NaN de`)

### Identificacao (analista_identificacao, após fixes)
- **Captações** — listagem antes inteiramente quebrada por `Collection was modified` (#003). Após deploy `0.1.4`: lista carrega. Após deploy `0.1.5`: criar `QA Validacao Captacao Radio` (Rubrica Rádio AM/FM, período 2026-05-01) — `201 Created` confirmado pela API
- **Pendentes** — listagem carrega após fixes; nenhum dado disponível para teste de execuções

### Arrecadacao (analista_arrecadacao)
- **Usuários de Música** — criar `QA Validacao Estabelecimento Ltda` (CNPJ 12.345.678/0001-95) e `QA Audit Test Estabelecimento` (CNPJ 27.865.757/0001-02)
- **Licenças** — após fixes #004 e novo endpoint `/rubricas`: criadas duas licenças (Rádio AM/FM e TV Aberta). API retornou `201 Created` e UI redirecionou para `/arrecadacao/licencas/<id>`
- **Pagamentos** — listagem OK; criação não testada nesta passagem (mas combobox de busca de licença usa o mesmo padrão recém-corrigido)
- **UDA** — listagem com valor vigente R$ 107,31 (01/01/2026), histórico OK

### Distribuicao (analista_distribuicao)
- **Rubricas** — read-only com mensagem "Aguardando eventos da Arrecadação" (depende de eventos via RabbitMQ — não testado)
- **Processos/:id** — não testado (precisa de processo criado pelo backend)

### Auditoria (analista_arrecadacao)
- **Eventos por entidade** — testado fim-a-fim:
  - Filtro `Entidade=Usuário de música`, `ID=7f32b267-83c7-4cd3-99a2-4638686f67c0`
  - Timeline retornou 2 eventos: `Alteração CREATE` (DATA_CHANGE) e `Ação Cadastrar usuário de música` (USER_ACTION) — exatamente como esperado pelo SDK
  - Confirmado também via SQL na `arrecadacao.audit_outbox` — 2 rows novos com status `SENT`
- **Acessos a telas** / **Relatórios** — não testados nesta passagem mas a infra está pronta (mesma API)

### Consultores (read-only)
- **consultor_geral** → /cadastro/* — listagens OK; sem botões "Novo / Editar / Excluir"
- **consultor_identificacao** → /identificacao/* — listagens OK; sem botão "Nova Captação"
- **consultor_arrecadacao** → /arrecadacao/licencas — sem botão "Nova Licença"
- **consultor_distribuicao** → /distribuicao/rubricas — read-only OK
- **Cross-area** — analista_arrecadacao foi bloqueado em /identificacao/captacoes com "Acesso negado" (esperado)

---

## Issues encontradas

### #001 — Paginação Fonogramas mostra `NaN–NaN` quando lista vazia (corrigida)
- **Onde:** /cadastro/fonogramas
- **Causa raiz:** `FonogramaListResponse` declarava campos flat (`page`, `size`, `totalPages`, `totalRecords`) mas o backend Cadastro retorna `{ data, pagination: { page, size, total, totalPages } }`. A página acessava `data.totalPages`/`data.totalRecords` → `undefined` → `NaN` ao multiplicar
- **Correção:**
  - `frontend/src/features/cadastro/fonogramas/types/fonograma.ts` — alinhado ao formato `{ data, pagination: { ... } }` (igual a Obras)
  - `frontend/src/features/cadastro/fonogramas/pages/FonogramasPage.tsx` — `pagination={data.pagination}` em vez de campos individuais
- **Validação pós-deploy:** com filtro ISRC inexistente, footer agora exibe `Mostrando 0–0 de 0`

### #002 — Auditoria não acessível pelo frontend (corrigida)
- **Onde:** /auditoria/* (eventos, acessos, relatórios)
- **Sintoma original:** `runtime-env.js` em produção retornava `AUDITORIA_API_BASE_URL: "${AUDITORIA_API_BASE_URL}"` (variável não substituída). Frontend chamava `/api/auditoria/v1/...` no próprio host → SPA fallback retornava HTML → `JSON.parse` falhava → "Não foi possível consultar a timeline"
- **Causas raízes:**
  1. `frontend/docker/40-runtime-env.sh` não incluía `AUDITORIA_API_BASE_URL` em `export`, em `required_vars` nem no pattern do `envsubst`
  2. `.env_linux` não definia a variável
  3. `mecad/stack.yml` (Portainer) não passava a variável para o container do frontend
- **Correções aplicadas:**
  1. Atualizado `docker/40-runtime-env.sh` para exportar e expandir a variável
  2. `.env_linux` recebeu `AUDITORIA_API_BASE_URL=https://api-audit.tasso.dev.br/api/v1`
  3. `docker service update --env-add AUDITORIA_API_BASE_URL=...` no swarm + nova imagem `tassosgomes/mcad-frontend:0.1.4`
- **Validação pós-deploy:** `runtime-env.js` agora serve `AUDITORIA_API_BASE_URL: "https://api-audit.tasso.dev.br/api/v1"`. Front consulta o serviço com sucesso (200)

### #003 — Identificacao API retorna 500 em todas chamadas autenticadas (corrigida)
- **Causa raiz:** `KeycloakClaimsTransformation.cs:20` em Identificacao iterava `principal.FindAll("roles")` (lazy) enquanto `identity.AddClaim(...)` mutava a `List<Claim>` interna do `ClaimsIdentity`. Race do enumerator → `System.InvalidOperationException: Collection was modified`
- **Correção:** copiada a versão de Cadastro (sealed, materialização via `.ToList()`, dedupe via `HashSet<string>`, fallback `IsAuthenticated`)
- **Deploy:** `tassosgomes/mcad-identificacao-api:0.1.4` (e depois 0.1.5)

### #004 — Busca de Usuário e Rubrica no formulário de Licença (corrigida)
- **Sintoma 1:** API `GET /usuarios-musica?razaoSocial=...` retornava 200 mas UI mostrava "Nenhum resultado encontrado"
- **Sintoma 2 (descoberto durante o fix):** ao escolher rubrica no Select, a criação retornava `400 Failed to read request` porque o frontend enviava `rubricaId="RADIO"` (sigla) enquanto o backend `CriarLicencaRequest` exige `rubricaId: UUID`
- **Causas raiz:**
  1. `LicencaForm.tsx` esperava `{ data: [...] }` mas o endpoint Java retorna `{ items, metadata }` (Spring Page wrapper)
  2. `RUBRICA_OPTIONS` no `LicencaForm` era hardcoded com siglas — não havia endpoint para listar rubricas no Arrecadacao API
- **Correções:**
  1. `LicencaForm.tsx` — declarar `BackendUsuarioMusicaPage { items: [...] }` e mapear `items → UsuarioMusicaResumo[]`
  2. Novo `RubricaController.java` (`@GetMapping("/api/v1/rubricas")`) que retorna `[{ id, sigla, nome }]` a partir do `RubricaRepository.findAll()`
  3. `LicencaForm.tsx` — busca rubricas via `useQuery(['rubricas-arrecadacao'])` com cache de 5 min, monta `rubricaOptions` com `value: r.id, label: r.nome`
- **Deploy:** `tassosgomes/mcad-frontend:0.1.4` + `tassosgomes/mcad-arrecadacao-api:0.1.1`
- **Validação pós-deploy:** combobox lista as 7 rubricas reais do banco; criar licença com `QA Validacao Estabelecimento Ltda` na rubrica Rádio AM/FM retornou `201`

### #005 — Identificacao API: `FormatException: Unrecognized Guid format` ao parsear `sub` do Logto (corrigida)
- **Onde:** POST/PUT/DELETE em `/api/v1/captacoes`, `/uploads`, `/execucoes`, `/fechar`
- **Causa raiz:** `Guid.Parse(httpContext.User.FindFirst("sub")?.Value)` — Logto emite `sub` como string opaca, não-GUID
- **Correção:** novo helper `Infrastructure/UserContextExtensions.cs`:
  - `GetAnalistaId()` — tenta `Guid.TryParse`; senão gera Guid determinístico via `MD5(sub)`
  - `GetAnalistaNome()` — `name` → `username` → `"Desconhecido"`
- Substituições em `CaptacaoEndpoints.cs`, `UploadEndpoints.cs`, `ExecucaoEndpoints.cs`, `FechamentoEndpoints.cs`
- **Deploy:** `tassosgomes/mcad-identificacao-api:0.1.5`

### #006 — `audit-service` (stack externa) com falha de TLS no RabbitMQ (corrigida)
- **Sintoma:** `https://api-audit.tasso.dev.br/actuator/health` → `503 DOWN`. Log: `org.springframework.amqp.AmqpIOException: javax.net.ssl.SSLException: Unsupported or unrecognized SSL message`
- **Causa raiz:** stack `audit-example_audit-service` tinha `SPRING_RABBITMQ_SSL_ENABLED=true` mas `RABBITMQ_PORT=5672` (porta AMQP plaintext do CloudAMQP `kebnekaise.lmq.cloudamqp.com`). O cliente Spring AMQP tentava handshake TLS contra um peer que respondia em texto plano → `SSLException`. As demais APIs do mcad usam o mesmo broker via `amqp://` plain (sem TLS) e funcionavam normalmente
- **Correção aplicada:** `docker service update --env-rm SPRING_RABBITMQ_SSL_ENABLED --env-add SPRING_RABBITMQ_SSL_ENABLED=false --force audit-example_audit-service`
- **Validação pós-correção:**
  - Health: `200 {"status":"UP","groups":["liveness","readiness"]}`
  - Logs do container atual: `Created new connection: ... amqp://brhqehoy@13.50.3.232:5672/brhqehoy`
  - `Started AuditServiceApplication in 25.892 seconds`
- **Recomendação para o repositório `ecad-auditoria`:** alterar o default em `audit-service/src/main/resources/application.yml` (ou no script de deploy do `audit-example`) para `SPRING_RABBITMQ_SSL_ENABLED=false`. Se o objetivo for usar TLS, alterar `RABBITMQ_PORT` para `5671` (AMQPS do CloudAMQP)

### #007 — Handlers de Licença em Arrecadacao não emitem audit events (gap funcional, pendente)
- **Onde:** `services/arrecadacao-api/arrecadacao-application/src/main/java/.../commands/handlers/CriarLicencaCommandHandler.java`, `EncerrarLicencaCommandHandler.java`, `ReativarLicencaCommandHandler.java`, `SuspenderLicencaCommandHandler.java`
- **Sintoma observado:** ao criar uma Licença, a `arrecadacao.audit_outbox` **não recebe nenhuma row**. A timeline em `/auditoria/eventos?Entidade=Licença&ID=<id>` retorna "Nenhum evento encontrado", mesmo com a infra de auditoria operacional (já validada para Usuários de Música)
- **Causa:** apenas `AtivarUsuarioMusicaCommandHandler` e `InativarUsuarioMusicaCommandHandler` estão instrumentados com o SDK `br.org.ecad.audit.sdk.AuditClient`. Os 4 handlers de Licença não importam nem invocam o publisher de auditoria
- **Correção pendente:** instrumentar cada handler de Licença para emitir um evento `DATA_CHANGE` (estado anterior + novo) + um `USER_ACTION` (Cadastrar/Encerrar/Reativar/Suspender), seguindo o padrão de `*UsuarioMusicaCommandHandler`. Mesmo padrão precisa ser aplicado a Pagamento e UDA, se ainda não houver
- **Não bloqueia o uso do mcad** — apenas significa que mudanças em Licenças não são auditadas até a instrumentação ser feita

---

## Pontos de melhoria / observações

- **Cadastro tem o helper de Guid correto, Identificacao não tinha** — vale auditar Identificacao por mais divergências de evolução em relação ao Cadastro
- **Token Logto sem `name` claim** — usuários aparecem como "Desconhecido" no `analistaResponsavelNome`. Considerar incluir `profile` no scope da SPA e/ou expandir `username` na claims transformation
- **Rubricas eram hardcoded no frontend** — agora vêm do banco. As legacies em `LicencasFilters.tsx` ainda usam siglas hardcoded (`RADIO`, `TV_ABERTA`, `INTERNET`, `SHOWS`, `SONORIZACAO`, `OUTROS`); vale unificar e remover as siglas que nem existem no banco (`INTERNET`, `SHOWS`, `SONORIZACAO`, `OUTROS`)
- **Distribuição depende de eventos** — sem rubricas sincronizadas, não foi possível ir além da listagem vazia
- **Image tag pinning no Portainer** — o Portainer guarda o digest do último deploy em vez de seguir o tag móvel `:latest`. Isso causou um "rollback" inesperado de `0.1.5` para `:4` durante uma operação de stack. Recomenda-se sempre usar tags imutáveis e atualizar o `.env_linux` a cada release
- **Audit instrumentation patchwork** — há SDK importado e configurado em `arrecadacao-api` mas só `UsuarioMusica` está instrumentado. Vale fazer um sweep de cobertura por entidade
- **CloudAMQP sem TLS** — o broker compartilhado entre mcad e audit-service responde em 5672 plaintext. Para produção real, considerar `5671` AMQPS e `SPRING_RABBITMQ_SSL_ENABLED=true` em ambos os lados de forma consistente

## Pendências (próximos passos)

1. **#007 — Instrumentar handlers de Licença/Pagamento com audit SDK** (gap funcional documentado acima)
2. Repetir Captação → Upload CSV → Execuções → Fechamento de Rol em Identificacao
3. Testar fluxo de Pagamento completo (criar → registrar → ver em UDA)
4. Cobrir Distribuição quando houver rubricas sincronizadas
5. Limpar siglas inexistentes em `LicencasFilters.tsx`

## Arquivos alterados nesta validação

### Backend Identificacao (.NET)
- `services/identificacao-api/1-Services/Identificacao.API/Infrastructure/KeycloakClaimsTransformation.cs` — fix #003
- `services/identificacao-api/1-Services/Identificacao.API/Infrastructure/UserContextExtensions.cs` — novo helper para fix #005
- `services/identificacao-api/1-Services/Identificacao.API/Endpoints/CaptacaoEndpoints.cs` — usa helper
- `services/identificacao-api/1-Services/Identificacao.API/Endpoints/UploadEndpoints.cs` — usa helper
- `services/identificacao-api/1-Services/Identificacao.API/Endpoints/ExecucaoEndpoints.cs` — usa helper
- `services/identificacao-api/1-Services/Identificacao.API/Endpoints/FechamentoEndpoints.cs` — usa helper

### Backend Arrecadacao (Java)
- `services/arrecadacao-api/arrecadacao-api/src/main/java/br/com/ecad/arrecadacao/api/controllers/RubricaController.java` — novo `GET /api/v1/rubricas` para fix #004

### Frontend (React + TS)
- `frontend/docker/40-runtime-env.sh` — fix #002 (envsubst inclui `AUDITORIA_API_BASE_URL`)
- `frontend/src/features/cadastro/fonogramas/types/fonograma.ts` — fix #001 (formato `{ data, pagination }`)
- `frontend/src/features/cadastro/fonogramas/pages/FonogramasPage.tsx` — usa `data.pagination`
- `frontend/src/features/arrecadacao/licencas/components/LicencaForm.tsx` — fix #004 (mapper `items → data` + busca dinâmica de rubricas)

### Infra
- `.env_linux` — `AUDITORIA_API_BASE_URL` (adicionado pelo usuário)
- Stack remoto `mecad/stack.yml` — `AUDITORIA_API_BASE_URL` no `mcad-frontend.environment` (sed-edit no servidor)
- Stack remoto `audit-example_audit-service` — `SPRING_RABBITMQ_SSL_ENABLED=false` (env do swarm) — fix #006

## Imagens Docker geradas

| Imagem | Tag | Causa | Push |
| --- | --- | --- | --- |
| tassosgomes/mcad-identificacao-api | 0.1.4 | Fix #003 | OK |
| tassosgomes/mcad-identificacao-api | 0.1.5, latest | Fix #005 | OK |
| tassosgomes/mcad-frontend | 0.1.3 | Fix #002 entrypoint | OK |
| tassosgomes/mcad-frontend | 0.1.4, latest | Fix #001 + Fix #004 | OK |
| tassosgomes/mcad-arrecadacao-api | 0.1.1, latest | Endpoint Rubricas (apoio fix #004) | OK |

## Versões em produção (verificadas via `docker service inspect`)

| Serviço | Imagem deployada |
| --- | --- |
| mecad_mcad-frontend | tassosgomes/mcad-frontend:0.1.4 |
| mecad_mcad-cadastro-api | tassosgomes/mcad-cadastro-api:4 (não alterado) |
| mecad_mcad-identificacao-api | tassosgomes/mcad-identificacao-api:0.1.5 |
| mecad_mcad-arrecadacao-api | tassosgomes/mcad-arrecadacao-api:0.1.1 |
| mecad_mcad-distribuicao-api | tassosgomes/mcad-distribuicao-api:4 (não alterado) |
| audit-example_audit-service | tassosgomes/audit-service:0.1.3 (env atualizada) |

## Comandos úteis para o operador

```bash
# Verificar versões atualmente em produção
sshpass -p "$LINUX_PASS" ssh root@161.97.71.19 \
  'for s in mcad-frontend mcad-cadastro-api mcad-identificacao-api mcad-arrecadacao-api mcad-distribuicao-api; do
     printf "%-30s %s\n" "$s" "$(docker service inspect mecad_$s --format "{{.Spec.TaskTemplate.ContainerSpec.Image}}")"
   done'

# Logs limpos do Identificacao (deve estar sem Collection was modified e FormatException)
sshpass -p "$LINUX_PASS" ssh root@161.97.71.19 \
  'docker service logs --tail 200 --since 5m mecad_mcad-identificacao-api 2>&1 | grep -iE "exception|error" || echo "sem erros"'

# Verificar runtime-env.js (deve incluir AUDITORIA_API_BASE_URL real)
curl -s https://mcad.tasso.dev.br/runtime-env.js

# Endpoint novo de rubricas (após autenticação)
curl -H "Authorization: Bearer <token>" https://mcad-arrecadacao.tasso.dev.br/api/v1/rubricas

# Health do audit-service (deve estar UP)
curl -s https://api-audit.tasso.dev.br/actuator/health

# Conferir audit_outbox da arrecadação (eventos publicados para a fila)
sshpass -p "$LINUX_PASS" ssh root@161.97.71.19 \
  "docker exec \$(docker ps -q --filter name=mecad_mcad-postgres | head -1) \
   psql -U gestauto -d mcad -c \"SELECT status, count(*), max(created_at_utc) FROM arrecadacao.audit_outbox GROUP BY status;\""
```

# Plano — Simulação Ponta a Ponta do mcad

> **Documento de planejamento.** Define o objetivo, o cenário de simulação, as pendências e os pré-requisitos para executar o ciclo completo do ECAD no mini-ECAD passando pelos quatro domínios (Cadastro → Identificação → Arrecadação → Distribuição).
>
> **Última revisão:** 2026-06-06 (PEND-07 resolvido)
> **Base documental:** `vision.md` (v1.10 — 2026-05-20), `domains/{cadastro,identificacao,arrecadacao,distribuicao}/domain.md` (2026-05-16/17)
> **Estado da codebase auditado:** branch `main`, commit `100be7d`
> **Auditoria do sistema publicado:** https://mcad.tasso.dev.br em 2026-06-06

---

## 1. Objetivo da Simulação

Demonstrar, em um único cenário reproduzível e fiel ao Regulamento de Distribuição, o ciclo completo do mcad:

1. **Cadastro** de obras, fonogramas e titulares (autorais + conexos) com percentuais válidos.
2. **Arrecadação** de licença de um Usuário de Música em uma rubrica para um período mensal, com cálculo da Verba Líquida (85%).
3. **Identificação** de execuções dessa rubrica/período via upload de CSV (e, opcionalmente, registro manual), com identificação automática por ISRC/ISWC.
4. **Fechamento do Rol** publicando `identificacao.rol.fechado`.
5. **Distribuição**: criação de processo, cálculo de créditos com split 66,67% / 33,33%, retenção/liberação de créditos e finalização com publicação de `distribuicao.rol.processado`.
6. **Verificação cruzada** dos resultados: somatório de créditos por titular = verba líquida ± resíduo de arredondamento; rol bloqueado para cancelamento; verba marcada como `DISTRIBUIDA`.

**Objetivo secundário:** produzir um conjunto de fixtures e scripts repetíveis que sirvam como **smoke test ponta a ponta** do sistema, executável contra o ambiente publicado (`mcad.tasso.dev.br`).

---

## 2. Cenário "Golden Path" Proposto

> Um cenário enxuto, **inteligível**, suficiente para acionar todas as regras de negócio críticas. Pode ser estendido depois.

### 2.1. Atores e dados-mestre

| Item | Quantidade | Observações |
|---|---|---|
| Associações | 7 (seed) | Já existem via migration de Cadastro |
| Rubricas | 7 (seed) | Já existem via migration de Arrecadação; sincronizadas com Identificação e Distribuição via evento |
| Tipos de Utilização | 4 (seed) | TA, TE, PE, BK |
| Titulares (PF + PJ) | 6 | 2 autores PF, 1 editor PJ, 2 intérpretes PF, 1 produtor PJ, 1 músico PF (com acúmulo de papéis em 1 deles) |
| Obras | 2 | 1 obra com 100% para o autor; 1 obra com 75% autor / 25% editor |
| Fonogramas | 2 | 1 fonograma com músico (43,7 / 41,7 / 14,6); 1 sem músico (50 / 50) |
| Usuário de Música | 1 | Ex: emissora fictícia "TV Demo S/A" |
| Licença | 1 | TV Demo S/A na rubrica `TV_ABERTA` (exige classificação) |
| Pagamento | 1 | R$ 100.000,00 bruto → R$ 85.000,00 líquido para `TV_ABERTA` período `2026-04` |
| Captação | 1 | `TV_ABERTA` + período diário dentro de `2026-04` |
| Execuções | ~10 | Mix de obras 1 e 2 com tipos TA, BK; quantidades distintas para acionar ponderação `quantidade × peso` |
| Processo de Distribuição | 1 | `TV_ABERTA` + `2026-04` |

### 2.2. Cenários de borda obrigatórios (incluir desde o primeiro run)

- **1 obra com fonograma + 1 obra sem fonograma** → exercita RN-02 (100% autoral quando sem fonograma).
- **1 titular acumulando papéis** (Autor + Intérprete + Produtor) → exercita RN-07 de Cadastro.
- **1 titular sem associação vinculada** → exercita retenção `TITULAR_SEM_ASSOCIACAO` (D04 F04).
- **1 obra deixada em status `PENDENTE`** durante o primeiro cálculo, depois liberada → exercita liberação automática de retidos (D04 F05) em um **segundo** processo de distribuição no mês seguinte.
- **(Opcional)** 1 estorno de pagamento após distribuição → exercita F06 ajustes-estorno **assim que implementado**.

### 2.3. Diagrama de fluxo (resumido)

```
┌──────────────┐  HTTP   ┌────────────────┐
│  Cadastro    │ ──────► │ Identificação  │
│ (D01)        │  ACL    │   (D02)        │
└─────┬────────┘         └────────┬───────┘
      │ events                    │ event: identificacao.rol.fechado
      │ cadastro.obra.*           ▼
      │ cadastro.fonograma.*  ┌────────────────────────┐
      │                       │   Distribuição (D04)   │
      │  HTTP ownership ────► │   - snapshots          │
      │                       │   - cálculo créditos   │
┌─────▼────────┐              │   - retenção/liberação │
│ Arrecadação  │ ───────────► │                        │
│ (D03)        │  event:      └──────────┬─────────────┘
└──────────────┘  arrecadacao            │ event: distribuicao.rol.processado
                  .verba.disponivel       ▼ (bloqueia cancelamento do rol)
                                  Identificação (D02)
```

---

## 3. Estado da Codebase vs. Cenário

Auditoria cruzando `vision.md`, `domains/*/domain.md` e implementação. Atualizado em 2026-06-06.

| Etapa do cenário | Status | Observações |
|---|---|---|
| Seed de associações, rubricas e tipos de utilização | ✅ done | Migrations existentes; confirmado no ambiente publicado |
| CRUD de titulares (PF/PJ), obras, fonogramas | ✅ done | D01 F02/F03/F05 |
| Titularidades autorais + participações conexas + RN-12 | ✅ done | D01 F04/F06 |
| Controle de status (LIBERADO/PENDENTE/BLOQUEADO) | ✅ done | D01 F07 |
| Eventos de cadastro via Outbox | ✅ done | D01 F08 |
| Ownership snapshot HTTP para D04 | ✅ done | D01 F11 |
| Captações, registro manual, upload CSV | ✅ done | D02 F01/F02/F03 |
| Identificação automática + re-verificação | ✅ done | D02 F04 |
| Fechamento do rol + Outbox `identificacao.rol.fechado` | ✅ done | D02 F05 |
| Cancelamento/recriação + consumer `distribuicao.rol.processado` | ✅ done | D02 F06 |
| Usuários de música, licenças, pagamentos | ✅ done | D03 F02/F03/F04 |
| Cálculo de verba líquida + evento `arrecadacao.verba.disponivel` | ✅ done | D03 F05 |
| Estorno de pagamento + evento `arrecadacao.pagamento.estornado` | ✅ done (produz) | D03 F06 |
| Sync rubricas D04 (consumer) | ✅ done | D04 F01 |
| Gestão de processos D04 (máquina de estados) | ✅ done | D04 F02 |
| Cálculo de créditos com ponderação e split | ✅ done | D04 F03 |
| Retenção de créditos | ✅ done | D04 F04 |
| Liberação de créditos retidos | ✅ done | D04 F05 |
| **Ajustes por estorno (consumer D04)** | ❌ **pendente** | D04 F06 — `prd-ready`, sem implementação |
| **Demonstrativo de Créditos** | ❌ **pendente** | D04 F07 — `planned`, sem PRD |

---

## 4. Pendências Críticas

Compiladas a partir da análise original do plano + auditoria ao vivo do ambiente publicado em 2026-06-06.  
Marcadas com **[LIVE]** quando confirmadas no sistema em produção.

### 4.1. PEND-01 — Normalização do contrato de período ✅ Resolvido

- **Sintoma:** Identificação publicava `periodo` no formato `YYYY-MM-DD` em `identificacao.rol.fechado` e `identificacao.rol.cancelado`; Distribuição opera com período mensal `YYYY-MM`.
- **Resolução:** `captacao.Periodo.ToString("yyyy-MM-dd")` → `"yyyy-MM"` em `FecharRolCommandHandler.cs` e `CancelarRolCommandHandler.cs`. Listener de Distribuição já armazenava o campo como string sem parsear — nenhum ajuste necessário no Java. 123/123 testes unitários passando.

### 4.2. PEND-02 — `distribuicao.rol.processado` com `captacaoId` errado ✅ Resolvido

- **Sintoma:** Distribuição publicava `captacaoId = snapshotRolId` quando deveria publicar o id original da captação. Identificação ignorava silenciosamente e o bloqueio de cancelamento do rol não funcionava.
- **Onde ocorria:** `FinalizarProcessoCommandHandler.java` — `payload.put("captacaoId", processo.getSnapshotRolId().toString())`.
- **Resolução:** `SnapshotRolRepository` injetado no handler; no momento da finalização, busca o `SnapshotRol` pelo ID e extrai `captacaoId` real para incluir no evento. `buildPayloadRolProcessado` recebe `UUID captacaoId` como parâmetro explícito.

### 4.3. PEND-03 — `distribuicao.processo.iniciado` não é publicado ✅ Resolvido

- **Sintoma:** `CriarProcessoCommandHandler` publicava `distribuicao.processo.criado` (não `distribuicao.processo.iniciado`). Arrecadação possui consumer para `processo.iniciado` que travaria a verba, mas nunca era acionado.
- **Resolução:** `EVENT_TYPE` renomeado de `"distribuicao.processo.criado"` para `"distribuicao.processo.iniciado"` no `CriarProcessoCommandHandler`. Nenhum outro serviço consumia `processo.criado`, então a substituição direta é segura.

### 4.4. PEND-04 — Bug `LIBERADA` vs `LIBERADO` no registro manual de Identificação ✅ Resolvido

- **Sintoma:** `CriarExecucaoCommandHandler.cs:83` e `AtualizarExecucaoCommandHandler.cs:87` comparam `obra.Status == "LIBERADA"`, mas Cadastro publica o status como `"LIBERADO"`. A comparação nunca é verdadeira, então toda execução manual marca a obra como pendente.
- **Impacto:** Toda demo com registro manual enfileira falsos-pendentes. O cenário CSV-only ainda funciona, mas o cenário de borda com registro manual não.
- **Decisão:** Trocar o literal `"LIBERADA"` por `"LIBERADO"` (ou por constante compartilhada) nos dois handlers.
- **Esforço estimado:** Trivial (15 min).

### 4.5. PEND-05 — Implementação de F06 Ajustes por Estorno (D04)

- **Sintoma:** PRD pronto (`tasks/distribuicao/prd-ajustes-estorno/prd.md`); Arrecadação já publica `arrecadacao.pagamento.estornado`; Distribuição não consome.
- **Decisão de escopo:** **Adiado para v2.** A v1 roda sem estorno.
- **Esforço estimado:** Médio (3–5 dias).

### 4.6. PEND-06 — F07 Demonstrativo de Créditos (D04)

- **Sintoma:** Sem PRD, sem implementação. Sem demonstrativo a simulação termina silenciosamente — não há tela mostrando o valor que cada titular receberá.
- **Decisão de escopo:** **MVP do demonstrativo é must-have para v1** (lista por titular: obra, categoria, percentual, valor; sem PDF).
- **Esforço estimado:** Médio (3–5 dias).

### 4.7. PEND-07 — BFF em crash no ambiente publicado ✅ Resolvido

- **Sintoma original (auditoria 2026-06-06 ~13h):** `mecad_mcad-bff` (2/2 réplicas) terminando com `non-zero exit (137)` (SIGKILL/unhealthy) e `non-zero exit (139)` (SIGSEGV). Logs mostravam `npm error command failed + signal SIGTERM`.
- **Diagnóstico (2026-06-06):** Causa raiz é **SIGSEGV sistêmico no host** — mesmo exit 139 que afetou `identificacao-api` ~5h antes. Descartadas: variável `AUDIT_BASE_URL` ausente (tem `:-default` na stack), build quebrado (112/112 testes passam localmente, imagem local com env de prod sobe normalmente), falha de binding de porta.
- **Resolução:** Rollout da imagem `tassosgomes/mcad-bff:66` concluído às 16:29 do mesmo dia. BFF responde `{"status":"UP"}` em `/health/live` e `/health/ready`.
- **Risco residual:** O SIGSEGV era sistêmico (host/kernel); se recorrer, a causa não é código do BFF. Monitorar via restart count no Portainer.
- **Esforço realizado:** 0,5 dia (diagnóstico completo).

### 4.8. PEND-08 — Dados ruidosos no banco de produção ❌ [LIVE] — novo

- **Sintoma:** O banco contém 9.854 titulares e 109 obras de execuções anteriores de QA/load test. O cenário golden path precisa de IDs determinísticos para que os asserts da Seção 8 funcionem de forma reproduzível.
- **Impacto:** Scripts de verificação não podem usar `totalElements` ou filtrar por nome. Sem UUIDs fixos, cada run do seed cria registros novos e os asserts precisam ser reescritos.
- **Decisão:** O `seed-golden-path.sh` deve usar UUIDs fixos com upsert (idempotente). Dados ruidosos pré-existentes não precisam ser apagados; o cenário opera sobre seus próprios IDs conhecidos.
- **Esforço estimado:** Endereçado durante PRE-03/PRE-04 (Fase 1).

### 4.9. PEND-09 — `analista_identificacao` sem credencial no `.env_qa` ✅ Resolvido

- **Sintoma original:** O usuário `analista_identificacao@mcad.dev` existia no authz DB com a role `identificacao.default.analista`, mas não tinha entrada no `.env_qa`, impedindo automação.
- **Resolução:** Credencial `analista_identificacao` / `gW-pcQ85` adicionada ao `.env_qa` em 2026-06-06.

### 4.10. PEND-10 — 403 para `analista_distribuicao` no identificacao-api ✅ Resolvido

- **Sintoma original:** `analista_distribuicao` recebia HTTP 403 ao acessar captações de Identificação.
- **Diagnóstico (2026-06-06 via Playwright):**
  - `analista_identificacao` → `GET /api/identificacao/v1/captacoes` → **200** ✅ (o frontend manda a chamada; a lista carrega normalmente).
  - `analista_distribuicao` → frontend consulta `/api/me/permissions`, não encontra `identificacao:default:captacao:listar`, bloqueia antes de chamar a API, exibe "Acesso negado". **Comportamento correto** — esse usuário tem apenas `distribuicao.default.analista` e não deveria ter acesso a Identificação.
- **Conclusão:** O 403 original provavelmente era estado inconsistente pós-segfault do `identificacao-api`. Com o serviço estável, as permissões funcionam como esperado. A confusão veio do plano assumir que `analista_distribuicao` deveria ter a role `identificacao.default.analista`, mas o seed não inclui essa atribuição.
- **Para a simulação:** usar `analista_identificacao` / `gW-pcQ85` em todas as etapas de Identificação. Scripts não precisam de `analista_distribuicao` no módulo de Identificação.

---

## 5. Pré-requisitos Operacionais

### 5.1. Infraestrutura publicada (ambiente `mcad.tasso.dev.br`)

| Item | Status | Detalhe |
|---|---|---|
| Serviços cadastro, identificacao, arrecadacao, distribuicao | ✅ | Respondendo em `mcad-{svc}.tasso.dev.br` |
| PostgreSQL, RabbitMQ, Keycloak/Logto | ✅ | Operacionais no Swarm |
| **BFF** | ✅ | PEND-07 resolvido — respondendo em `mcad-bff.tasso.dev.br` |
| **Observabilidade (Alloy)** | ❌ 0/1 réplica | Não bloqueia simulação; bloqueia métricas |

### 5.2. Mapeamento de usuários para a simulação

| Papel no cenário | Usuário (`login`) | Senha | Domínio acessível |
|---|---|---|---|
| Analista de Cadastro | `analista_cadastro` | `Analista123!` | Cadastro |
| Analista de Identificação | `analista_identificacao` | `gW-pcQ85` | Identificação |
| Analista de Arrecadação | `analista_arrecadacao` | `Analista123!` | Arrecadação |
| Analista de Distribuição | `analista_distribuicao` | `LV1Uwm1k` | Distribuição (+ Identificação a confirmar — PEND-10) |

### 5.3. Seed cross-domain

- [x] Seeds estáticos por domínio (associações, rubricas, tipos de utilização) — confirmados no ambiente publicado.
- [ ] **PRE-03** — `seed-golden-path.sh`: cria, na ordem certa, 6 titulares + 2 obras + 2 fonogramas + 1 usuário de música + 1 licença + 1 pagamento + 1 captação + 10 execuções (via CSV). Deve ser idempotente via UUIDs fixos.
- [ ] **PRE-04** — Conjunto de UUIDs determinísticos para os dados-mestre do cenário (fixtures JSON em `scripts/sim/fixtures/golden-path/`).

### 5.4. Scripts de automação

- [ ] **PRE-02** — `healthcheck.sh`: confirma que os 4 serviços + RabbitMQ respondem antes de iniciar o seed.
- [ ] **PRE-05** — `run-distribuicao.sh`: cria processo, aguarda cálculo, aprova, finaliza.
- [ ] **PRE-06** — `tail-events.sh`: escuta a exchange RabbitMQ e imprime os 9 eventos esperados em tempo real (via API HTTP do RabbitMQ admin, não via Alloy que está down).
- [ ] **PRE-07** — `verify.sh`: roda os asserts da Seção 8 contra o ambiente publicado.

---

## 6. Plano em Fases (atualizado)

### Fase 0 — Correções de contrato + infraestrutura (2–3 dias)

Pré-requisito absoluto: sem esses fixes os scripts produzem resultados incorretos.

| Item | Esforço | Status |
|---|---|---|
| **PEND-07** — Diagnosticar e corrigir crash do BFF | 0,5 dia | ✅ resolvido (SIGSEGV sistêmico; reimplantado :66 às 16:29 de 2026-06-06) |
| **PEND-04** — fix `LIBERADO/LIBERADA` (`CriarExecucaoCommandHandler.cs:83` e `AtualizarExecucaoCommandHandler.cs:87`) | 15 min | ✅ resolvido |
| **PEND-02** — `captacaoId` correto em `rol.processado` (`FinalizarProcessoCommandHandler.java:119`) | 0,5 dia | ✅ resolvido |
| **PEND-03** — publicar `distribuicao.processo.iniciado` (`CriarProcessoCommandHandler.java`) | 0,5 dia | ✅ resolvido |
| **PEND-01** — normalizar período `YYYY-MM` (`FecharRolCommandHandler.cs:86` + listener Distribuição) | 1 dia | ✅ resolvido |
| **PEND-10** — validar acesso de `analista_identificacao` ao identificacao-api | 0,5 dia | ✅ resolvido |
| Reimplantar serviços corrigidos no ambiente publicado | 0,5 dia | — |

**Critério de saída:** (a) BFF funcionando; (b) mensagens consumidas em `arrecadacao` e `identificacao` correspondem 100% ao que `distribuicao` publica; (c) cancelamento de Rol após `distribuicao.rol.processado` é bloqueado; (d) `analista_identificacao` consegue listar captações.

### Fase 1 — Fixture e orquestrador da simulação (2–3 dias)

| Item | Esforço |
|---|---|
| PRE-04 — UUIDs determinísticos no fixture JSON | 0,5 dia |
| PRE-03 — `seed-golden-path.sh` orquestrando chamadas HTTP nos 4 serviços, idempotente | 1,5 dia |
| PRE-02 — `healthcheck.sh` aguardando 4 serviços + RabbitMQ | 0,5 dia |
| PRE-06 — `tail-events.sh` via RabbitMQ HTTP API | 0,5 dia |

**Critério de saída:** `./scripts/sim/seed-golden-path.sh && ./scripts/sim/run-distribuicao.sh` roda o ciclo completo até `distribuicao.processo.finalizado` e os 9 eventos aparecem no terminal.

### Fase 2 — Demonstrativo MVP (3–5 dias)

| Item | Esforço |
|---|---|
| PRD curto de Demonstrativo de Créditos (D04 F07 MVP) | 0,5 dia |
| Backend: `GET /api/v1/processos/{id}/demonstrativos` | 1 dia |
| Frontend: tela read-only listando demonstrativos por titular | 1,5 dia |
| Teste E2E Playwright validando demonstrativo do cenário golden path | 1 dia |

**Critério de saída:** ao final da simulação v1, o avaliador abre "Demonstrativos" e vê uma linha por titular com valor calculado, batendo com a verba líquida ± resíduo.

### Fase 3 — Ajustes por estorno (3–5 dias) — opcional para v1

Implementar D04 F06 e estender o cenário com estorno após distribuição (PEND-05).

### Fase 4 — Polimento da demo (1–2 dias)

| Item |
|---|
| Roteiro escrito (passo a passo do que abrir em cada tela) |
| Vídeo curto (≤ 5 min) registrando a execução |
| README do diretório `scripts/sim/` |

---

## 7. Riscos da Simulação

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Inconsistência de período entre domínios faz o cálculo achar verba zero | Alta antes de PEND-01 | Alto | Resolver PEND-01 **antes** de qualquer fixture |
| BFF com SIGSEGV sistêmico recorrente degrada demo | Baixa (resolvido em 2026-06-06) | Médio | Monitorar restart count; causa é host/kernel, não código |
| Dados ruidosos (9.854 titulares) confundem o script de verificação | Alta | Médio | UUIDs determinísticos no seed (PRE-04) |
| Fixture cross-domain quebra se a ordem das chamadas ignorar Outbox latency | Média | Médio | `seed-golden-path.sh` deve fazer `wait-for-event` no RabbitMQ entre cada etapa |
| `identificacao-api` instável (segfaults recentes) causa falhas intermitentes | Média | Médio | Monitorar logs; se recorrente, investigar causa raiz |
| Cálculo de créditos arredonda diferente do esperado e a verificação cruzada falha | Média | Médio | Documentar tolerância (± R$ 0,01 por titular) no script de verificação |
| Sem demonstrativo, a demo "morre" no estado FINALIZADO sem feedback visual | Alta sem PEND-06 | Alto | Fase 2 (Demonstrativo MVP) é **must-have** |

---

## 8. Critérios de Sucesso da Simulação Ponta a Ponta

Para a simulação ser considerada **concluída**, as seguintes asserções precisam passar em uma execução:

1. ✅ Os 9 eventos esperados foram observados na exchange RabbitMQ na ordem certa.
2. ✅ `processo_distribuicao.status = FINALIZADO` para `TV_ABERTA + 2026-04`.
3. ✅ Somatório de `credito.valor` agrupado por processo = `verba.valor_liquido` ± R$ 0,01 (resíduo de arredondamento).
4. ✅ Pelo menos **1 crédito** está em `RETIDO` por `TITULAR_SEM_ASSOCIACAO`.
5. ✅ Cancelar a Captação via UI após o `FINALIZADO` retorna **erro** (rol bloqueado).
6. ✅ `verba.status = DISTRIBUIDA` em Arrecadação.
7. ✅ A tela de Demonstrativo (após Fase 2) mostra 1 linha por titular com pelo menos os campos: obra, categoria, percentual aplicado, valor.
8. ✅ Em um **segundo processo** para `TV_ABERTA + 2026-05`, o crédito retido por `OBRA_PENDENTE` foi liberado (status `LIBERADO`) após a obra ter sido liberada manualmente entre os dois processos.

---

## 9. Estrutura sugerida para os artefatos

```
scripts/sim/
├── README.md                       # como rodar
├── healthcheck.sh                  # PRE-02
├── tail-events.sh                  # PRE-06 (via RabbitMQ HTTP API)
├── fixtures/
│   └── golden-path/
│       ├── titulares.json
│       ├── obras.json
│       ├── fonogramas.json
│       ├── usuario-musica.json
│       ├── licenca.json
│       ├── pagamento.json
│       ├── captacao.json
│       └── execucoes.csv
├── seed-golden-path.sh             # PRE-03 — orquestrador
├── run-distribuicao.sh             # PRE-05 — cria, calcula, aprova, finaliza
└── verify.sh                       # PRE-07 — roda asserts da Seção 8
```

---

## 10. Sequência de Ataque (próximos passos imediatos)

Ordem recomendada para desbloquear o ciclo:

1. ~~**PEND-07**~~ — ✅ BFF resolvido (SIGSEGV sistêmico, reimplantado :66 em 2026-06-06).
2. ~~**PEND-04**~~ — ✅ Fix `LIBERADA → LIBERADO` nos dois handlers + testes corrigidos.
3. ~~**PEND-10**~~ — ✅ `analista_identificacao` retorna 200 em captações. `analista_distribuicao` não tem role de Identificação (correto).
4. ~~**PEND-02**~~ — ✅ `captacaoId` original buscado do `SnapshotRol` e publicado corretamente em `distribuicao.rol.processado`.
5. ~~**PEND-03**~~ — ✅ `EVENT_TYPE` renomeado para `"distribuicao.processo.iniciado"` no `CriarProcessoCommandHandler`.
6. ~~**PEND-01**~~ — ✅ `"yyyy-MM-dd"` → `"yyyy-MM"` em `FecharRolCommandHandler` e `CancelarRolCommandHandler`; listener Distribuição sem alteração.
7. Reimplantar os 3 serviços corrigidos (Identificação, Distribuição) no ambiente publicado.
8. Iniciar **Fase 1** (fixtures e scripts de seed).

---

*Documento atualizado em 2026-06-06 com base em auditoria ao vivo do ambiente `mcad.tasso.dev.br`. Seção 3 deve ser atualizada sempre que houver mudança de status de feature. Pendências 7–10 são novas, identificadas na auditoria.*

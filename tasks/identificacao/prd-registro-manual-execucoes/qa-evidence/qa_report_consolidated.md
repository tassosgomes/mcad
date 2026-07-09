# Relatório de Testes QA — F02: Registro Manual de Execuções

**Data da Sessão:** 2026-06-20T03:00:00Z
**Ambiente testado:** https://mcad.tasso.dev.br (frontend) | https://mcad-identificacao.tasso.dev.br/api/v1 | https://mcad-cadastro.tasso.dev.br/api/v1
**PRD:** `tasks/identificacao/prd-registro-manual-execucoes/prd.md`
**Techspec:** `tasks/identificacao/prd-registro-manual-execucoes/techspec.md`, `techspec-frontend.md`
**Autenticação:** Logto OIDC JWT — perfil analista-identificacao

---

## Sumário Executivo

| Métrica | Resultado |
|---------|-----------|
| Tasks executadas | 4 de 4 |
| Tasks com PASS | 3 ✅ |
| Tasks com FAIL | 1 ❌ |
| Casos de teste total | 65 |
| Casos PASS | 51 |
| Casos FAIL | 5 |
| Casos não executados | 9 |
| **Resultado geral** | **❌ REPROVADO** |

> Resultado geral é REPROVADO: qa_task_04 (criar pendente inline) contém 5 falhas e 9 casos bloqueados.

### Features testadas

| Feature / User Story | Task | Status |
|----------------------|------|--------|
| RF-01 — Buscar obra/fonograma no Cadastro | qa_task_01 | ✅ PASS |
| RF-04 — Listar execuções da captação | qa_task_02 | ✅ PASS |
| RF-02/05/06/07/08 — CRUD de execuções + validações | qa_task_03 | ✅ PASS |
| RF-03 — Criar obra/fonograma pendente inline | qa_task_04 | ❌ FAIL |

### Escopo excluído (conforme acordado)

| Feature | Motivo da exclusão |
|---------|-------------------|
| Perfil consultor-identificacao | Usuário solicitou testar apenas analista-identificacao |
| Validação de banco (PostgreSQL) | Usuário não quis inspecionar banco diretamente |
| F03 (Upload CSV), F04 (Gestão de pendentes), F05 (Fechamento do Rol) | Fora do escopo do PRD |
| Busca fuzzy/fonética, validação de duplicidade, ordenação por peso | Não-escopo do PRD |

---

## Resultado por Feature

### qa_task_01 — RF-01: Buscar obra/fonograma no Cadastro ✅ PASS

**Tipos de teste:** API + UI
**Casos executados:** 15/15 (1 skip — sem ISWC na base de teste)

| Caso | Descrição | Tipo | Status |
|------|-----------|------|--------|
| CT-API-01 a 04 | Busca por ISRC/ISWC/título/titular (valores do PRD) | API | ⚠️ PASS* |
| CT-API-05 | Busca sem resultados | API | ✅ PASS |
| CT-API-06 | Busca sem autenticação → 401 | API | ✅ PASS |
| CT-API-07 | Busca por ISRC existente (BRABC2612345) | API | ✅ PASS |
| CT-API-08 | Busca por termo existente (obra) | API | ✅ PASS |
| CT-API-09 | Busca por termo existente (test) | API | ✅ PASS |
| CT-UI-01 | Autocomplete com ISRC existente | UI | ✅ PASS |
| CT-UI-02 | Autocomplete com ISWC | UI | ⚠️ SKIP |
| CT-UI-03 | Autocomplete com título parcial | UI | ✅ PASS |
| CT-UI-04 | Autocomplete sem resultados → opções criar | UI | ✅ PASS |
| CT-UI-05 | Mínimo 3 caracteres | UI | ✅ PASS |
| CT-UI-06 | Debounce de 300ms | UI | ✅ PASS |

\* Retornaram resultados vazios porque os valores do PRD não existem na base de dados atual. Estrutura da API correta.

**Evidências:** `qa_task_01_busca_cadastro/`

---

### qa_task_02 — RF-04: Listar execuções da captação ✅ PASS

**Tipos de teste:** API + UI
**Casos executados:** 7/7

| Caso | Descrição | Tipo | Status |
|------|-----------|------|--------|
| TC-01 | GET /captacoes/{id}/execucoes com ID válido | API | ✅ PASS |
| TC-02 | GET em captação sem execuções → vazio | API | ✅ PASS |
| TC-03 | GET com parâmetros de paginação | API | ✅ PASS |
| TC-04 | GET com ID inválido → 404 | API | ✅ PASS |
| TC-05 | GET sem autenticação → 401 | API | ✅ PASS |
| TC-06 | UI: tabela com dados + botões de ação | UI | ✅ PASS |
| TC-07 | UI: estado vazio | UI | ✅ PASS |

**Desvios da techspec observados (não-bloqueantes):**
- **D01 — Formato de resposta:** API usa `items`/`total` em vez de `data`/`pagination` documentado na techspec. Faltam metadados `totalPages`, `page`, `size`.
- **D02 — Colunas da tabela:** UI mostra 6 colunas em vez das 9 da spec. Colunas "Início", "Fim" e "Duração" consolidadas em "Horário". Coluna "Tipo" (tipoUtilizacao) ausente na tabela padrão.
- **D03 — Mensagem empty state:** "Nenhuma execução registrada nesta captação." em vez de "Nenhuma execução registrada".

**Evidências:** `qa_task_02_listar_execucoes/`

---

### qa_task_03 — RF-02,05,06,07,08: CRUD completo de execuções ✅ PASS

**Tipos de teste:** API + UI
**Casos executados:** 22/22

**API — Criar (RF-02):**

| Caso | Cenário | Resultado |
|------|---------|-----------|
| TC-API-01 | Create happy path (RADIO) → 201, duração=225s | ✅ PASS |
| TC-API-02 | Missing tipoUtilizacaoId on CINEMA → 422 | ✅ PASS |
| TC-API-03 | Missing tituloPrograma on CINEMA → 422 | ✅ PASS |
| TC-API-04 | Missing both conditional fields on CINEMA → 422 | ✅ PASS |
| TC-API-05 | Create with both conditional fields on CINEMA → 201 | ✅ PASS |
| TC-API-06 | End before start (14:30 > 14:20) → 422 | ✅ PASS |
| TC-API-07 | End equals start (14:30 = 14:30) → 422 | ✅ PASS |
| TC-API-08 | Create on Cancelada captação → 422 | ✅ PASS |
| TC-API-09 | Invalid obraId (all zeros) → 400 | ✅ PASS |

**API — Editar (RF-05):**

| Caso | Cenário | Resultado |
|------|---------|-----------|
| TC-API-10 | Edit quantidade → 200, quantidade=5 | ✅ PASS |
| TC-API-11 | Edit obra → 200, new obraTitulo | ✅ PASS |
| TC-API-12 | Edit on Cancelada captação → 422 | ✅ PASS |

**API — Excluir (RF-06):**

| Caso | Cenário | Resultado |
|------|---------|-----------|
| TC-API-13 | Delete execution → 204 | ✅ PASS |
| TC-API-14 | Delete on Cancelada captação → 422 | ✅ PASS |

**UI — Fluxos completos:**

| Caso | Cenário | Resultado |
|------|---------|-----------|
| TC-UI-01 | Create via modal + aparece na lista | ✅ PASS |
| TC-UI-02 | Edit via modal com dados preenchidos | ✅ PASS |
| TC-UI-03 | Delete com diálogo de confirmação | ✅ PASS |
| TC-UI-04 | Campos condicionais visíveis (CINEMA) | ✅ PASS |
| TC-UI-05 | Campos condicionais ocultos (RADIO) | ✅ PASS |
| TC-UI-06 | Duração auto-calculada (14:30→14:33 = 3min) | ✅ PASS |
| TC-UI-07 | Validação horário invertido | ✅ PASS |
| TC-UI-08 | Validação campos obrigatórios (5 erros inline) | ✅ PASS |

**Notas:**
- Duração calculada corretamente em todos os cenários testados (225s, 180s, 330s, 600s)
- Validação condicional por rubrica funciona: CINEMA exige tipoUtilizacaoId + tituloPrograma, RADIO os oculta
- Captação Cancelada bloqueia todas as ações (Add/Edit/Delete ocultos)
- Mensagem de validação na UI difere levemente da API: "O fim deve ser maior que o início." vs "O horário de fim deve ser posterior ao início."
- Status derivado do Cadastro corretamente (obras PENDENTE → execução PENDENTE)

**Evidências:** `qa_task_03_crud_execucao/`

---

### qa_task_04 — RF-03: Criar obra/fonograma pendente inline ❌ FAIL

**Tipos de teste:** API + UI
**Casos executados:** 12/21 (9 bloqueados)

**API:**

| Caso | Cenário | Resultado |
|------|---------|-----------|
| API-01 | Criar obra pendente (título + tipo) → 201 | ✅ PASS |
| API-02 | Criar obra sem tipo → 400 | ✅ PASS |
| API-03 | Criar obra sem título → 400 | ✅ PASS |
| API-04 | Criar obra com título vazio → 400 | ✅ PASS |
| API-05 | Verificar obra pendente via busca | ✅ PASS |
| API-06 | Criar fonograma pendente com ISRC + obraId | ❌ FAIL — 403 |
| API-07 | Criar fonograma pendente sem ISRC | ❌ FAIL — 403 |
| API-08 | Criar fonograma pendente sem obraId | ❌ FAIL — 403 |
| API-09 | Criar fonograma com ISRC inválido | ❌ FAIL — 403 |
| API-10 | Criar fonograma com obraId inexistente | ❌ FAIL — 403 |
| API-11 | Execução com obra pendente → status PENDENTE | ✅ PASS |

**UI:**

| Caso | Cenário | Resultado |
|------|---------|-----------|
| UI-01 | Busca sem resultados → "Criar obra pendente" visível | ✅ PASS |
| UI-02 | "Criar Fonograma" desabilitado sem obra selecionada | ✅ PASS |
| UI-03 | Modal CriarObraPendente abre com campos | ⚠️ PARTIAL — auth timeout impede submit |
| UI-04 | Validação campos vazios | ⚠️ BLOCKED |
| UI-05 | CriarFonogramaPendenteModal fluxo completo | ⚠️ BLOCKED |
| UI-06 | Validação ISRC obrigatório | ⚠️ BLOCKED |
| UI-07 | Fonograma sem obra prévia | ⚠️ BLOCKED |
| UI-08 | Execução com obra pendente → status PENDENTE na tabela | ✅ PASS |
| UI-09 | Execução com fonograma pendente → status PENDENTE | ⚠️ BLOCKED |
| UI-10 | Obra + fonograma pendentes → status PENDENTE | ⚠️ BLOCKED |

**Evidências:** `qa_task_04_criar_pendente_inline/`

---

## Detalhes das Falhas

### FALHA 01 (Crítica) — qa_task_04 / API-06 a API-10: Criação de fonograma retorna 403

**User Story:** RF-03 — Criar fonograma pendente inline
**Casos de Teste:** API-06, API-07, API-08, API-09, API-10
**Tipo:** API

**Passos executados:**
1. Obter token JWT do perfil `analista_identificacao`
2. `POST /api/v1/fonogramas` com body válido (`{obraId, isrc}`)
3. ❌ FALHOU: 403 Forbidden em todas as tentativas

**Expected:**
- `POST /api/v1/fonogramas` com obraId e ISRC → 201 Created
- `POST /api/v1/fonogramas` sem ISRC → 400 Bad Request (ISRC obrigatório)
- `POST /api/v1/fonogramas` sem obraId → 400 Bad Request

**Actual:**
- HTTP 403 Forbidden em todas as chamadas a `POST /api/v1/fonogramas`
- O perfil `analista_identificacao` tem permissão para `POST /api/v1/obras` mas NÃO para `POST /api/v1/fonogramas`
- 2 retries com tokens frescos — mesmo resultado

**Impacto:**
- Bloqueia Acceptance Criteria 3, 4 e 5 do RF-03 (todos cenários de fonograma)
- Bloqueia 5 casos de teste de API e 3 de UI
- Criação de fonograma pendente inline não-funcional para este perfil

**Evidências:**
- `qa_task_04_criar_pendente_inline/requests.log` (seções API-06 a API-10)

---

### FALHA 02 (Alta) — qa_task_04 / UI-03: Timeout de autenticação interrompe criação inline

**User Story:** RF-03 — Criar obra pendente inline
**Caso de Teste:** UI-03
**Tipo:** UI

**Passos executados:**
1. Login via Logto OIDC
2. Navegar para captação ABERTA → Adicionar Execução
3. Digitar termo sem resultados na busca
4. Clicar "Criar Obra"
5. Modal CriarObraPendente abre corretamente com campos preenchidos
6. Clicar "Salvar Obra"
7. ❌ FALHOU: Redirecionamento para `/callback` — sessão expirou

**Expected:**
- Obra criada via `POST /api/v1/obras` → modal fecha → autocomplete preenchido com nova obra

**Actual:**
- Durante o submit, o Logto tenta silent refresh (`GET /oidc/auth?...&prompt=none`)
- Silent refresh retorna consistentemente HTTP 400
- Browser redireciona para `/callback`, perdendo todo o estado do formulário
- 3 tentativas consecutivas — todas falharam

**Console do browser:**
```
[ERRO] Failed to refresh token silently: prompt=none returned 400
[WARN] Redirecting to callback due to session expiry
```

**Impacto:**
- Bloqueia 4 casos de teste de UI (UI-03 submit, UI-04, UI-05, UI-06)
- Torna o fluxo de criação inline via UI não confiável
- Afeta qualquer fluxo autenticado com formulário de múltiplos passos

**Evidências:**
- `qa_task_04_criar_pendente_inline/screenshots/UI-03_criar_obra_pendente_modal.png`
- `qa_task_04_criar_pendente_inline/screenshots/UI-03_criar_obra_modal_with_fields.png`

---

### DESVIO 01 (Baixa) — qa_task_01 / CT-API-01 a 04: Dados de teste do PRD ausentes

**User Story:** RF-01 — Buscar obra/fonograma
**Tipo:** API

**Expected:** Resultados para ISRC `BRUM71500001`, ISWC `T-345.246.800-1`, título `Djavan`, titular `Cabral`
**Actual:** HTTP 200 com `resultados: []` — valores não existem na base Cadastro atual

**Nota:** Não é falha da funcionalidade. A API responde com estrutura correta, apenas sem dados para esses valores específicos. Validação com dados reais existentes (BRABC2612345, "obra", "test") confirma funcionamento correto.

### DESVIO 02 (Baixa) — qa_task_04 / Finding 3: "Criar Obra" visível mesmo com resultados

**User Story:** RF-03 — Criar obra pendente inline
**Tipo:** UI

**Expected:** Opção "Criar obra pendente" aparece apenas quando busca não retorna resultados (PRD: "Analista busca e não encontra")
**Actual:** Botões "Criar Obra" e "Criar Fonograma" aparecem no footer do dropdown mesmo quando resultados são encontrados

---

## Recomendações de Investigação

### Investigar: Permissão `POST /api/v1/fonogramas` para analista_identificacao

- **Contexto:** O perfil `analista_identificacao` precisa criar fonogramas pendentes inline (RF-03 AC-3, AC-4, AC-5)
- **Comportamento observado:** Todas as chamadas a `POST /api/v1/fonogramas` retornam 403 Forbidden
- **Onde investigar:** Políticas de autorização do Cadastro API — permissão para endpoint de criação de fonogramas. O mesmo perfil consegue criar obras (`POST /api/v1/obras` — 201), mas não fonogramas.
- **Evidências relacionadas:** `qa_task_04_criar_pendente_inline/requests.log` (API-06 a API-10)

### Investigar: Silent refresh do Logto OIDC (prompt=none → 400)

- **Contexto:** O refresh silencioso de token Logto falha consistentemente, causando perda de estado de formulários durante fluxos autenticados
- **Comportamento observado:** `GET /oidc/auth?...&prompt=none` retorna 400, forçando redirect para `/callback` e perda total do estado do formulário
- **Onde investigar:** Configuração do cliente OIDC no Logto — o parâmetro `prompt=none` pode não ser suportado ou a sessão SSO pode estar expirando prematuramente. Verificar também o tratamento de erro no frontend (salvar estado antes do redirect).
- **Evidências relacionadas:** `qa_task_04_criar_pendente_inline/screenshots/UI-03_*`

### Investigar: Desvios de formato de resposta da API (items/total vs data/pagination)

- **Contexto:** A API de execuções da Identificação retorna `{items: [], total: N}` enquanto a techspec documenta `{data: [], pagination: {page, size, total, totalPages}}`
- **Onde investigar:** `ListarExecucoesQueryHandler` e `ExecucaoListResponse` — verificar se o formato foi simplificado intencionalmente e se a documentação precisa ser atualizada, ou se é necessário adicionar metadados de paginação.
- **Evidências relacionadas:** `qa_task_02_listar_execucoes/requests.log`

### Investigar: Colunas da tabela de execuções divergentes da spec

- **Contexto:** A tabela UI mostra 6 colunas (Obra/Fonograma, Intérpretes, Horário, Qtd, Status, Ações) enquanto a techspec define 9 colunas com Início, Fim, Duração e Tipo separados
- **Onde investigar:** Componente `ExecucoesTable.tsx` — verificar se a consolidação em "Horário" (ex: "08:00:00 até 08:03:30 / 3min 30s") foi decisão de design. A coluna "Tipo" (tipoUtilizacao) está ausente na tabela padrão mas aparece como coluna extra "Tipo (Prog)" em captações audiovisuais.
- **Evidências relacionadas:** `qa_task_02_listar_execucoes/screenshots/execucoes_table.png`

---

## Índice de Evidências

```
qa-evidence/
├── qa_session.json
├── qa_report_consolidated.md
│
├── qa_task_01_busca_cadastro/
│   ├── test_plan.md
│   ├── requests.log
│   ├── screenshots/
│   │   ├── ct-ui-01-isrc-brabc2612345.png
│   │   ├── ct-ui-03-titulo-search-results.png
│   │   └── ct-ui-04-no-results.png
│   └── qa_report_task_01.md
│
├── qa_task_02_listar_execucoes/
│   ├── test_plan.md
│   ├── requests.log
│   ├── screenshots/
│   │   ├── execucoes_table.png
│   │   ├── empty_state.png
│   │   └── cancelada_no_actions.png
│   └── qa_report_task_02.md
│
├── qa_task_03_crud_execucao/
│   ├── test_plan.md
│   ├── requests.log
│   ├── screenshots/
│   │   ├── TC-UI-01-created-execution-in-list.png
│   │   ├── TC-UI-02-edit-modal-prefilled.png
│   │   ├── TC-UI-03-delete-confirmation-dialog.png
│   │   ├── TC-UI-04-audiovisual-conditional-fields.png
│   │   ├── TC-UI-05-non-audiovisual-no-conditional-fields.png
│   │   ├── TC-UI-06-duration-auto-calc.png
│   │   ├── TC-UI-07-inverted-time-validation.png
│   │   ├── TC-UI-08-validation-missing-fields.png
│   │   └── cancelada-no-actions.png
│   └── qa_report_task_03.md
│
└── qa_task_04_criar_pendente_inline/
    ├── test_plan.md
    ├── requests.log
    ├── screenshots/
    │   ├── UI-01_no_results_show_criar_opcoes.png
    │   ├── UI-01_v2_no_results_with_criar_opcoes.png
    │   ├── UI-03_criar_obra_pendente_modal.png
    │   ├── UI-03_criar_obra_modal_with_fields.png
    │   ├── UI-08_obra_pendente_selected.png
    │   ├── UI-08_form_filled_before_save.png
    │   └── UI-08_execucao_pendente_confirmed.png
    └── qa_report_task_04.md
```

---

## Informações da Sessão

| Campo | Valor |
|-------|-------|
| Banco de dados validado | Não |
| Autenticação testada | Sim (Logto OIDC JWT) |
| Playwright (UI) | Sim |
| cURL (API) | Sim |
| Tasks em paralelo | Sim (Fase 1: task_01 + task_02) |
| Perfil testado | analista-identificacao |
| Total de screenshots | 19 |
| Total de logs de request | 4 (um por task) |

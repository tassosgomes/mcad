# Plano — Simulação Ponta a Ponta do mcad

> **Documento de planejamento.** Define o objetivo, o cenário de simulação, as pendências e os pré-requisitos para executar o ciclo completo do ECAD no mini-ECAD passando pelos quatro domínios (Cadastro → Identificação → Arrecadação → Distribuição).
>
> **Última revisão:** 2026-05-28
> **Base documental:** `vision.md` (v1.10 — 2026-05-20), `domains/{cadastro,identificacao,arrecadacao,distribuicao}/domain.md` (2026-05-16/17)
> **Estado da codebase auditado:** branch `main`, commit `1ad35ca`

---

## 1. Objetivo da Simulação

Demonstrar, em um único cenário reproduzível e fiel ao Regulamento de Distribuição, o ciclo completo do mcad:

1. **Cadastro** de obras, fonogramas e titulares (autorais + conexos) com percentuais válidos.
2. **Arrecadação** de licença de um Usuário de Música em uma rubrica para um período mensal, com cálculo da Verba Líquida (85%).
3. **Identificação** de execuções dessa rubrica/período via upload de CSV (e, opcionalmente, registro manual), com identificação automática por ISRC/ISWC.
4. **Fechamento do Rol** publicando `identificacao.rol.fechado`.
5. **Distribuição**: criação de processo, cálculo de créditos com split 66,67% / 33,33%, retenção/liberação de créditos e finalização com publicação de `distribuicao.rol.processado`.
6. **Verificação cruzada** dos resultados: somatório de créditos por titular = verba líquida ± resíduo de arredondamento; rol bloqueado para cancelamento; verba marcada como `DISTRIBUIDA`.

**Objetivo secundário:** produzir um conjunto de fixtures e scripts repetíveis que sirvam como **smoke test ponta a ponta** do sistema, executável em ambiente local (Docker Compose) e em ambientes de demo.

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

Auditoria cruzando `vision.md`, `domains/*/domain.md` e implementação.

| Etapa do cenário | Status | Observações |
|---|---|---|
| Seed de associações, rubricas e tipos de utilização | ✅ done | Migrations existentes |
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

## 4. Pendências Críticas (bloqueiam o ciclo)

Estas pendências **impedem** que a simulação rode ponta a ponta com fidelidade ao Regulamento. Cada uma tem origem documentada no `vision.md` ou nos domain docs.

### 4.1. PEND-01 — Normalização do contrato de período

- **Sintoma:** Identificação publica `periodo` no formato `YYYY-MM-DD` (data diária da captação) em `identificacao.rol.fechado`; Arrecadação e Distribuição operam com período mensal `YYYY-MM`.
- **Onde ocorre:** `services/identificacao-api/2-Application/Identificacao.Application/Fechamento/Commands/FecharRolCommandHandler.cs:86` — `captacao.Periodo.ToString("yyyy-MM-dd")`.
- **Impacto:** O matching de snapshots de Rol com Verba em Distribuição falha (ou casa por coincidência), tornando o cruzamento Rol+Verba não confiável.
- **Decisão necessária:** ou (a) Identificação passa a publicar `YYYY-MM` derivado da data, ou (b) Distribuição passa a derivar `YYYY-MM` ao indexar o snapshot. Recomendado **(a)**, mais alinhado ao Regulamento.
- **Esforço estimado:** Pequeno (1 dia). Requer migration mínima e ajuste no handler + listener de Distribuição.

### 4.2. PEND-02 — `distribuicao.rol.processado` com `captacaoId` errado

- **Sintoma:** Distribuição publica `captacaoId = snapshotRolId` quando deveria publicar o id original da captação. Identificação ignora silenciosamente e o bloqueio de cancelamento do rol não funciona.
- **Onde ocorre:** `services/distribuicao-api/distribuicao-application/.../FinalizarProcessoCommandHandler.java:119` — `payload.put("captacaoId", processo.getSnapshotRolId().toString())`.
- **Impacto:** O Analista de Identificação consegue cancelar um Rol já processado pela Distribuição, gerando inconsistência cross-domain (regra RN-14 de D04 e RN-11 de D02 violadas).
- **Decisão necessária:** o snapshot do Rol em Distribuição precisa persistir o `captacaoId` original recebido no evento `identificacao.rol.fechado`. Hoje o snapshot já recebe o campo `captacaoId` no payload — só precisa ser persistido e referenciado.
- **Esforço estimado:** Pequeno (0,5 dia).

### 4.3. PEND-03 — `distribuicao.processo.iniciado` não é publicado

- **Sintoma:** Arrecadação já consome o evento para travar a verba (`VerbaEmDistribuicaoException`), mas Distribuição nunca o publica. O lock só ocorre ao **finalizar** (via `distribuicao.processo.finalizado`).
- **Onde ocorre:** Distribuição (`CriarProcessoCommandHandler` ou equivalente) — falta `outboxEventWriter.addEvent("distribuicao.processo.iniciado", ...)`. Listener consumidor em Arrecadação existe.
- **Impacto:** Janela em que um pagamento pode entrar **depois** que o cálculo já leu o snapshot da verba, sem disparar erro — risco de inconsistência sutil para o demo. O Domain Doc lista como lacuna conhecida.
- **Esforço estimado:** Pequeno (0,5 dia).

### 4.4. PEND-04 — Bug `LIBERADA` vs `LIBERADO` no registro manual de Identificação

- **Sintoma:** O handler de registro manual de execução compara `obra.Status == "LIBERADA"` enquanto Cadastro publica o status como `LIBERADO`. Resultado: toda execução manual marca a obra como pendente, mesmo quando o Cadastro a tem como liberada.
- **Onde ocorre:** `services/identificacao-api/2-Application/Identificacao.Application/Execucoes/Commands/CriarExecucaoCommandHandler.cs:83` e `AtualizarExecucaoCommandHandler.cs:87`.
- **Impacto:** Toda demo que usar registro manual aciona o fluxo de pendentes desnecessariamente. **Não bloqueia** o cenário CSV-only, mas distorce a demo.
- **Esforço estimado:** Trivial (15 min). Trocar literal por constante compartilhada.

### 4.5. PEND-05 — Implementação de **F06 Ajustes por Estorno** (D04)

- **Sintoma:** PRD pronto (`tasks/distribuicao/prd-ajustes-estorno/prd.md`); Arrecadação já publica `arrecadacao.pagamento.estornado` desde 2026-05-15; Distribuição não consome.
- **Impacto:** Cenário "estorno após distribuição" não pode ser demonstrado. Sem isso, simulação não cobre a regra RN-07 de D04.
- **Decisão de escopo:** **Recomendado adiar para a v2 da simulação.** A v1 pode rodar sem estorno.
- **Esforço estimado:** Médio (3–5 dias). Já tem PRD; falta tech spec + implementação.

### 4.6. PEND-06 — **F07 Demonstrativo de Créditos** (D04)

- **Sintoma:** Sem PRD, sem implementação. É o "holerite" do titular — saída visível do ciclo.
- **Impacto:** Sem demonstrativo, a simulação termina **silenciosamente** — não há tela de "valor que cada titular receberá". O usuário/observador da demo precisa abrir o banco para conferir os créditos.
- **Decisão de escopo:** **Recomendado MVP do demonstrativo** para a v1 (lista por titular com obra, categoria, percentual, valor; sem PDF, sem agregações). Pode ser tela read-only consumindo créditos já persistidos.
- **Esforço estimado:** Médio (3–5 dias) para MVP. Maior se incluir PDF e ajustes.

---

## 5. Pré-requisitos Operacionais

Itens **não funcionais** que precisam estar prontos para a simulação rodar de ponta a ponta.

### 5.1. Infraestrutura local
- [x] Docker Compose com PostgreSQL 16, RabbitMQ, Keycloak, MinIO (`docker-compose.dev.yml`).
- [x] Script de provisionamento do Keycloak (`scripts/provision-keycloak.sh`).
- [x] Script `./dev.sh start` para subir os 4 serviços + frontend.
- [ ] **PRE-01** — `dev.sh` precisa incluir o `distribuicao-api` (verificar: não foi confirmado durante esta auditoria).
- [ ] **PRE-02** — Healthcheck script que confirma que todos os 4 serviços estão respondendo `200` em `/health` antes de começar a seeding.

### 5.2. Seed cross-domain
- [x] Seeds estáticos por domínio (associações, rubricas, tipos de utilização).
- [ ] **PRE-03** — **Fixture única ponta a ponta**: arquivo JSON ou script `seed-golden-path.sh` que cria, na ordem certa, os 6 titulares + 2 obras + 2 fonogramas + 1 usuário de música + 1 licença + 1 pagamento + 1 captação + 10 execuções (via CSV). Hoje cada domínio tem seeds isolados; nenhum fluxo end-to-end consolidado.
- [ ] **PRE-04** — Definir um **conjunto de IDs determinísticos** (UUIDs fixos) para os dados-mestre da simulação, permitindo asserts reproduzíveis.

### 5.3. Autenticação e autorização
- [x] Keycloak provisionado com roles e users.
- [x] Backends respeitam `AUTH_ENABLED=true/false`.
- [ ] **PRE-05** — Documentar qual usuário/role da simulação faz cada papel (Analista Cadastro, Identificação, Arrecadação, Distribuição). Hoje o `provision-keycloak.sh` cria users genéricos; o cenário precisa fixar isso.

### 5.4. Observabilidade do fluxo
- [ ] **PRE-06** — Pelo menos um consumidor visível da exchange de eventos (RabbitMQ admin UI ou um script de tail) que permita confirmar **em tempo real** os 9 eventos esperados:
  - `cadastro.obra.liberada`, `cadastro.fonograma.liberado` (D01)
  - `arrecadacao.verba.disponivel` (D03)
  - `identificacao.rol.fechado` (D02)
  - `distribuicao.processo.criado`, `distribuicao.processo.calculado`, `distribuicao.credito.retido` (D04, primeiro processo)
  - `distribuicao.processo.finalizado`, `distribuicao.rol.processado` (D04, finalização)

### 5.5. Frontend
- [x] Telas de Cadastro, Identificação (captações/execuções), Arrecadação (usuários/licenças/pagamentos), Distribuição (processos).
- [ ] **PRE-07** — Confirmar que **menu lateral expõe todas as 4 áreas** com permissões mínimas do usuário-demo (a auditoria viu `features/{cadastro,identificacao,arrecadacao,distribuicao}` no frontend, mas não validei o sidebar para todos os perfis).
- [ ] Dependência de **PEND-06** (Demonstrativo) para encerrar visualmente o ciclo.

---

## 6. Plano em Fases

Estratégia **incremental**: priorizar uma v1 demonstrável e tratar estorno/demonstrativo enriquecido na v2.

### Fase 0 — Higiene do contrato (1–2 dias)

| Item | Esforço | Dono sugerido |
|---|---|---|
| PEND-04 — fix `LIBERADO/LIBERADA` | 15 min | Identificação |
| PEND-02 — `captacaoId` correto em `rol.processado` | 0,5 dia | Distribuição |
| PEND-03 — publicar `distribuicao.processo.iniciado` | 0,5 dia | Distribuição |
| PEND-01 — normalizar período `YYYY-MM` | 1 dia | Identificação + Distribuição |
| Teste de integração cobrindo as 4 correções | 0,5 dia | — |

**Critério de saída:** mensagens consumidas em `arrecadacao` e `identificacao` correspondem 100% ao que `distribuicao` publica; cancelamento de Rol após `distribuicao.rol.processado` é bloqueado.

### Fase 1 — Fixture e orquestrador da simulação (2–3 dias)

| Item | Esforço |
|---|---|
| PRE-03 — `seed-golden-path.sh` orquestrando as chamadas HTTP nos 4 serviços, idempotente | 1,5 dia |
| PRE-04 — UUIDs determinísticos no fixture JSON | 0,5 dia |
| PRE-02 — `healthcheck.sh` aguardando 4 serviços + RabbitMQ + Keycloak | 0,5 dia |
| PRE-06 — `tail-events.sh` (CLI) escutando a exchange de eventos para evidência | 0,5 dia |

**Critério de saída:** com apenas `./dev.sh start && ./scripts/sim/seed-golden-path.sh && ./scripts/sim/run-distribuicao.sh`, conseguimos rodar o ciclo inteiro até `distribuicao.processo.finalizado` e ver os 9 eventos no terminal.

### Fase 2 — Demonstrativo MVP (3–5 dias)

| Item | Esforço |
|---|---|
| PRD curto de Demonstrativo de Créditos (D04 F07 MVP) | 0,5 dia |
| Backend: `GET /api/v1/processos/{id}/demonstrativos?titular=...` | 1 dia |
| Frontend: tela read-only listando demonstrativos por titular | 1,5 dia |
| Teste E2E Playwright validando demonstrativo do cenário golden path | 1 dia |

**Critério de saída:** ao final da simulação v1, o avaliador abre a tela "Demonstrativos" e vê uma linha por titular com o valor calculado, batendo com a verba líquida ± resíduo.

### Fase 3 — Ajustes por estorno (3–5 dias) — opcional para v1

Implementar D04 F06 e estender o cenário com um estorno após a distribuição, exercitando a regra RN-07.

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
| Fixture cross-domain quebra se a ordem das chamadas ignorar Outbox latency | Média | Médio | `seed-golden-path.sh` deve fazer `wait-for-event` no RabbitMQ entre cada etapa |
| Cálculo de créditos arredonda diferente do esperado e a verificação cruzada falha | Média | Médio | Documentar tolerância (ex: ± R$ 0,01 por titular) no script de verificação |
| Pequenas mudanças no frontend quebram o roteiro | Baixa | Médio | Usar Playwright e versionar o roteiro junto com os testes |
| Sem demonstrativo, a demo "morre" no estado FINALIZADO sem feedback visual | Alta sem PEND-06 | Alto | Fase 2 (Demonstrativo MVP) é **must-have** para uma demo apresentável |

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
├── tail-events.sh                  # PRE-06
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
├── run-distribuicao.sh             # cria, calcula, aprova, finaliza
└── verify.sh                       # roda asserts da Seção 8
```

---

## 10. Próximos Passos Imediatos

1. **Aprovar este plano** e priorizar Fase 0 (correções de contrato).
2. **Decidir formato do período** (PEND-01): `YYYY-MM` em todos os contratos? (recomendado).
3. **Confirmar escopo da v1**: incluir Demonstrativo MVP? Tratar estorno apenas na v2? (recomendado).
4. Criar pasta `scripts/sim/` e versionar fixtures.
5. Atribuir os 4 itens de Fase 0 a donos no time e abrir PRDs/tasks correspondentes para PEND-05 e PEND-06.

---

*Documento gerado a partir de auditoria de `vision.md`, `domains/*/domain.md` e código em `services/` no commit `1ad35ca`. Atualizar a Seção 3 sempre que houver mudança de status de feature.*

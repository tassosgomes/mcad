# Resumo da Sessão de Planejamento — mini-ECAD (mcad)

> **Data:** 2026-03-29 a 2026-04-01
> **Participantes:** Tasso Gomes + Claude (Opus 4.6)
> **Objetivo:** Documentação completa do domínio Cadastro (D01) do mini-ECAD — da visão até tasks de implementação

---

## 1. O que é o mcad

O mini-ECAD é uma **PoC com arquitetura rica** que serve como referência para o time de desenvolvimento do ECAD. Usa o domínio real de gestão coletiva de direitos autorais com regras simplificadas para demonstrar padrões arquiteturais: Schema-per-Service, CQRS, Event-Driven e API Composition.

**Stack:** .NET 8 + Java (APIs), React/Vite (frontend), PostgreSQL, RabbitMQ, ClickHouse, Metabase, Docker Compose.

**4 domínios:** Cadastro (D01), Identificação (D02), Arrecadação (D03), Distribuição (D04).

---

## 2. O que foi produzido

### Documentos de Nível 0 e 1

| Documento | Caminho | Descrição |
|-----------|---------|-----------|
| Vision Doc | `vision.md` | Âncora de contexto: 4 domínios, roadmap 4 fases, glossário 25+ termos |
| Domain Doc Cadastro | `domains/cadastro/domain.md` | 6 entidades, 15 regras de negócio, 8 features, 5 eventos |
| Auth Plan | `docs/architecture/auth-plan.md` | Keycloak externo, JWT PKCE, oidc-client-ts, aplicação retroativa |
| Database Schema | `docs/database-schema.md` | 8 tabelas, 22 índices, diagrama Mermaid ER |
| Design System | `frontend/DESIGN.md` | Circuit Core Dark, tokens CSS, tipografia, princípios visuais |

### Features do Domínio Cadastro (8 features completas)

| Feature | PRD | Contract | TechSpec BE | TechSpec FE | Tasks | RFs | Impl |
|---------|-----|----------|-------------|-------------|-------|-----|------|
| F01 Seed Associações | ✅ | ✅ | ✅ | ✅ | 12 tasks | 10 | done |
| F02 Gestão Titulares | ✅ | ✅ | ✅ | ✅ | 15 tasks | 24 | done |
| F03 Gestão Obras | ✅ | ✅ | ✅ | ✅ | 15 tasks | 32 | done |
| F04 Titularidades Autorais | ✅ | ✅ | ✅ | ✅ | 13 tasks | 27 | done |
| F05 Gestão Fonogramas | ✅ | ✅ | ✅ | ✅ | 14 tasks | 29 | done |
| F06 Participação Conexa | ✅ | ✅ | ✅ | ✅ | 13 tasks | 34 | done |
| F07 Controle de Status | ✅ | ✅ | ✅ | ✅ | 13 tasks | 33 | tasks ready |
| F08 Eventos de Cadastro | ✅ | — | ✅ | — | 9 tasks | 25 | tasks ready |

### Autenticação e Autorização (Cross-Cutting)

| Artefato | Status |
|----------|--------|
| PRD | ✅ (28 RFs) |
| TechSpec Backend | ✅ (JWT Bearer + Policies + ClaimsTransformation) |
| TechSpec Frontend | ✅ (oidc-client-ts + AuthProvider + useAuth) |
| Tasks | ✅ (11 tasks, incluindo config Keycloak) |
| Implementação | em andamento (outra sessão) |

### Contagem Total

| Tipo | Quantidade |
|------|-----------|
| PRDs | 9 |
| API Contracts (YAML + MD) | 7 pares |
| Tech Specs Backend | 9 |
| Tech Specs Frontend | 7 |
| Task files individuais | ~115 |
| Requisitos funcionais documentados | **242** |

---

## 3. Decisões Arquiteturais Tomadas

### Backend (.NET 8)

| Decisão | Detalhe |
|---------|---------|
| Clean Architecture | Camadas numeradas: 1-Services, 2-Application, 3-Domain, 4-Infra, 5-Tests |
| CQRS nativo | Sem MediatR — Dispatcher com reflection + Scrutor auto-registration |
| Value Objects como records | Cpf, Cnpj, CaeIpi, Isrc — validação encapsulada, igualdade por valor |
| Outbox Pattern | Eventos salvos na mesma transação da entidade, worker publica no RabbitMQ |
| CloudEvents 1.0 | Formato padrão interoperável para 8 eventos do domínio |
| Depuração | Obras e fonogramas LIBERADOS que sofrem alteração de dados-chave viram DEPURADOS (imutáveis) + nova versão |
| Domain Services | CalculadoraConexos (43,7/41,7/14,6), ValidadorLiberacaoObra, ValidadorLiberacaoFonograma |
| Schema-per-Service | Schema `cadastro` isolado no PostgreSQL com grants restritos |

### Frontend (React + Vite)

| Decisão | Detalhe |
|---------|---------|
| Estrutura intermediária com features | `features/cadastro/{associacoes,titulares,obras,fonogramas,titularidades,participacoes}` |
| CSS Modules | Encapsulamento por componente, tokens via CSS variables |
| TanStack Query | Data fetching, cache, mutations com invalidação |
| oidc-client-ts | Autenticação OIDC agnóstica ao Keycloak |
| Dark theme (Circuit Core Dark) | DM Sans + IBM Plex Sans + JetBrains Mono, hierarquia por superfícies |
| Dual view (Fonogramas) | Tela própria + seção na ObraDetailPage |
| Seções integradas | Titularidades na ObraDetailPage, Participações na FonogramaDetailPage |

### Autenticação

| Decisão | Detalhe |
|---------|---------|
| Keycloak externo | Não no Docker Compose — já existente |
| Authorization Code + PKCE | Padrão para SPAs |
| Tokens in-memory | Não localStorage (segurança) |
| 2 roles | `analista-cadastro` (CRUD), `consultor` (read-only) |
| Policies | `write` (analista), `read` (analista + consultor) |
| Aplicação retroativa | Endpoints protegidos depois das features implementadas |
| Token propagation | Cross-service via header Authorization (para auditoria) |

---

## 4. Regras de Negócio Chave Documentadas

| ID | Regra | Feature |
|----|-------|---------|
| RN-01 | Soma titularidades autorais = 100% | F04 |
| RN-02 | Unicidade: título + titulares (ao atribuir ISWC) | F03 |
| RN-03 | Fonograma exige ≥1 Produtor Fonográfico | F06 |
| RN-04 | Participação conexa: 43,7% intérprete / 41,7% produtor / 14,6% músicos (÷N) ou 50/50 | F06 |
| RN-09 | Fonograma exige ≥1 Intérprete, múltiplos permitidos | F06 |
| RN-11 | Editor exige titular PJ (CNPJ) | F04 |
| RN-12 | Arredondamento: truncar 4 casas, diferença no primeiro | F04/F06 |
| — | Depuração: alteração de título/titulares/ISRC em entidade LIBERADA | F03/F05 |
| — | ISWC obtido via API externa (não manual) | F03 |
| — | CNPJ alfanumérico (nova regra RFB) | F02 |
| — | Bloqueio com justificativa obrigatória (mín 10 chars) | F07 |
| — | Fonograma: PENDENTE_VALIDACAO → PENDENTE_DOCUMENTACAO (automático quando conexos=100%) | F07 |

---

## 5. Integrações Externas

| Sistema | Endpoint | Uso |
|---------|----------|-----|
| API ISWC | `POST https://iswc.tasso.dev.br/` | Obtenção de ISWC para obras (F03) |
| Keycloak | OIDC/JWKS | Autenticação e autorização (Auth) |
| RabbitMQ | Exchange `cadastro.events` (topic) | 8 eventos CloudEvents via Outbox Pattern (F08) |

---

## 6. Schema do Banco de Dados

**8 tabelas** no schema `cadastro`:

```
associacoes (7 seed) ←── titulares ←── titularidades_autorais ──→ obras_musicais (self-ref depuração)
                              ↑                                         ↓
                     participacoes_conexas ──→ fonogramas (self-ref depuração)
                                              
historico_bloqueios (polimórfica OBRA/FONOGRAMA)
outbox_events (Outbox Pattern → RabbitMQ)
```

Diagrama Mermaid ER completo em `docs/database-schema.md`.

---

## 7. Pipeline de Documentação Usado

Para cada feature, seguimos o pipeline:

```
Domain Doc → PRD → API Contract (YAML+MD) → Tech Spec Backend → Tech Spec Frontend → Tasks
```

Skills utilizadas: `flow-vision-creator`, `flow-domain-creator`, `flow-prd-creator`, `flow-contract-creator`, `flow-techspec-creator`, `flow-task-creator`, `dotnet-architecture`, `react-architecture`, `frontend-design`.

---

## 8. Próximos Passos

| # | Passo | Status |
|---|-------|--------|
| 1 | Finalizar implementação Auth (outra sessão) | em andamento |
| 2 | Implementar F07 (Controle de Status) | tasks ready |
| 3 | Implementar F08 (Eventos de Cadastro) | tasks ready |
| 4 | Domain Doc Identificação (D02) | planned — Fase 2 |
| 5 | Domain Doc Arrecadação (D03) | planned — Fase 2 |
| 6 | Domain Doc Distribuição (D04) | planned — Fase 3 |
| 7 | Analytics & BI | planned — Fase 4 |

---

## 9. Stitch (Design)

| Projeto | ID |
|---------|-----|
| mcad | `533156784329699726` |
| Design System | Circuit Core Dark (Asset: `b2bc911ef6b644fdac02168609989b83`) |

Screens criadas para: Associações, Titulares (4), Obras (7), Fonogramas (6), Titularidades (4), Participações Conexas (6), Controle de Status (7).

---

*Resumo gerado em 2026-04-01. Para continuar o desenvolvimento, forneça `vision.md` + `domains/cadastro/domain.md` como contexto em qualquer nova sessão.*

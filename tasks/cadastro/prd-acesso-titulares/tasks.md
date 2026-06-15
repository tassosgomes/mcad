# Resumo de Tarefas de Implementação — F11: Acesso de Titulares (Portal do Titular)

## Visão Geral

O Portal do Titular é uma área de autoatendimento que permite aos titulares de direitos se cadastrar, autenticar (auth interna CPF/CNPJ + senha, distinta do Keycloak), gerenciar dados de contato, consultar obras/fonogramas, abrir ocorrências e solicitar alterações de dados sensíveis. O backend é estendido no `cadastro-api` (.NET 8) com 3 novas entidades (`CredencialTitular`, `Ocorrencia`, `SolicitacaoAlteracao`), um segundo scheme JWT ("Titular") e 8 novas permissões de Analista. O frontend ganha uma sub-árvore `/portal/*` com `PortalAuthProvider` e layout próprios.

**Documentos de referência:**
- PRD: `tasks/cadastro/prd-acesso-titulares/prd.md`
- Tech Spec: `tasks/cadastro/prd-acesso-titulares/techspec.md`

## Fases de Implementação

### Fase 1 — Domínio e Persistência
Criação dos Value Objects de contato/localização (Email, Telefone, Cep, Uf), das novas entidades com state machines (CredencialTitular, Ocorrencia, SolicitacaoAlteracao), extensão da entidade Titular, interfaces de repositório, constantes de eventos e a migration EF Core `AddPortalTitular`. Habilita todas as fases subsequentes.

### Fase 2 — Autenticação do Titular
Infraestrutura de auth interna: `ITitularTokenService` (JWT HMAC-SHA256), scheme "Titular" no `Program.cs`, `ICurrentTitular`, auto-cadastro, login (com lockout exponencial) e alteração de senha. Independente do Keycloak/OIDC.

### Fase 3 — Funcionalidades do Titular (paralelizável)
Gestão de dados de contato, consulta de repertório (obras/fonogramas), CRUD de ocorrências e abertura de solicitações de alteração. Todas as 4 tarefas podem correr em paralelo após a Fase 2.

### Fase 4 — Painel do Analista (paralelizável)
Permissões + seed (8 chaves), triagem/resolução de ocorrências e aprovação/rejeição de solicitações. Endpoints usam o scheme Keycloak existente com `RequireCadastroPermission`.

### Fase 5 — Frontend
Infraestrutura do portal (PortalAuthProvider, PortalLayout, refator do `authenticatedFetch`, rotas `/portal/*`), páginas do titular e páginas do analista.

### Fase 6 — Integração e Observabilidade
Testes de integração fim-a-fim (WebApplicationFactory + Testcontainers), métricas Prometheus e sanitização de logs (LGPD).

## Tarefas

- [x] 1.0 Value Objects de Contato e Localização (Email, Telefone, Cep, Uf)
- [x] 2.0 Entidades de Domínio do Portal e State Machines (CredencialTitular, Ocorrencia, SolicitacaoAlteracao) + extensão de Titular + interfaces de repositório + EventTypes
- [x] 3.0 Configurações EF Core e Migration `AddPortalTitular`
- [x] 4.0 Infraestrutura de Autenticação do Titular (ITitularTokenService, scheme "Titular", ICurrentTitular, Program.cs)
- [x] 5.0 Auto-cadastro, Login e Alteração de Senha do Titular (RF-01 a RF-07)
- [x] 6.0 Gestão de Dados de Contato (RF-09 a RF-13)
- [x] 7.0 Consulta de Repertório — Obras e Fonogramas (RF-22 a RF-26)
- [x] 8.0 Ocorrências — CRUD do Titular (RF-27 a RF-32)
- [x] 9.0 Solicitações de Alteração — Lado do Titular (RF-14, RF-15, RF-17, RF-20, RF-21)
- [ ] 10.0 Permissões do Analista + Seed (8 chaves)
- [ ] 11.0 Triagem e Resolução de Ocorrências pelo Analista (RF-33 a RF-39)
- [ ] 12.0 Aprovação/Rejeição de Solicitações pelo Analista (RF-16, RF-18, RF-19)
- [ ] 13.0 Frontend — Infraestrutura do Portal (PortalAuthProvider, PortalLayout, authenticatedFetch, rotas)
- [ ] 14.0 Frontend — Páginas do Titular (auto-cadastro, login, dashboard, contato, repertório, ocorrências, solicitações)
- [ ] 15.0 Frontend — Páginas do Analista (triagem de ocorrências, aprovação de solicitações)
- [ ] 16.0 Testes de Integração Fim-a-Fim + Observabilidade

## Análise de Paralelização

### Lanes de Execução Paralela

| Lane | Tarefas | Descrição |
|------|---------|-----------|
| Lane A (Domínio) | 1.0 → 2.0 → 3.0 | Fundação de domínio e persistência; caminho crítico |
| Lane B (Auth) | 4.0 → 5.0 | Autenticação interna do titular; depende de Lane A |
| Lane C (Features Titular) | 6.0, 7.0, 8.0, 9.0 | 4 tarefas independentes após Auth pronta |
| Lane D (Analista) | 10.0 → (11.0, 12.0) | Permissões first, depois triagem e aprovação em paralelo |
| Lane E (Frontend) | 13.0 → (14.0, 15.0) | Infra first, depois páginas titular e analista em paralelo |
| Lane F (Qualidade) | 16.0 | Testes E2E + observabilidade ao final |

### Caminho Crítico

`1.0 → 2.0 → 3.0 → 4.0 → 5.0 → (6.0|7.0|8.0|9.0) → 11.0/12.0 → 16.0`

O caminho crítico passa pela fundação de domínio (Lane A), auth (Lane B) e ao menos uma feature do titular, seguido dos endpoints de analista e dos testes de integração. O frontend (Lane E) corre em paralelo a partir do momento em que os contratos de API da Fase 2/3 estão estáveis.

### Diagrama de Dependências

```
Fase 1 (Domínio + Persistência)
  1.0 VOs ──▶ 2.0 Entidades ──▶ 3.0 Migration
                                  │
Fase 2 (Auth)                     ▼
  4.0 Auth infra ◀────────── (dep 2.0)
       │
       ▼
  5.0 Auto-cadastro/Login/Senha ◀── (dep 3.0, 4.0)
       │
       ▼
Fase 3 (Features Titular — paralelo)
  ┌──── 6.0 Contato ─────────┐
  │     7.0 Repertório        │
  │     8.0 Ocorrências (tit) │
  └──── 9.0 Solicitações (tit)┘
                   │
Fase 4 (Analista)  ▼
  10.0 Permissões ──▶ ┌─ 11.0 Triagem Ocorrências ◀── (dep 8.0)
                     └─ 12.0 Aprovação Solicitações ◀─ (dep 9.0)

Fase 5 (Frontend — paralelo ao backend a partir de 5.0)
  13.0 Infra Portal ◀── (dep 5.0)
       │
       ▼
  ┌──── 14.0 Páginas Titular ◀── (dep 6-9, 13) ────┐
  └──── 15.0 Páginas Analista ◀─ (dep 11-12, 13) ──┘

Fase 6 (Qualidade)
  16.0 Testes E2E + Observabilidade ◀── (dep 11.0, 12.0)
```

> **Nota:** Os testes unitários e de integração por feature são incluídos como subtarefas dentro de cada tarefa (1.0–12.0). A tarefa 16.0 cobre apenas os testes de integração cross-feature (fluxo completo auto-cadastro → login → contato → obras → ocorrência → resolução) e a observabilidade transversal (métricas Prometheus, scopes de log, sanitização LGPD).

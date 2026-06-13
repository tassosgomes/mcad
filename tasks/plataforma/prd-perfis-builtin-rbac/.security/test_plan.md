# Test Plan — Auditoria de Segurança
## PRD: prd-perfis-builtin-rbac (Framework RBAC + Piloto Distribuição)
## Data: 2026-06-11
## Status: DRY-RUN — Aguardando aprovação

---

## 1. Resumo do Escopo

Escopo derivado de PRD + TechSpec. Ativos críticos: CPF (PII/LGPD), ações irreversíveis de Processo, trilha de auditoria, gestão de papéis, catálogo de seeds.

Stacks auditadas: Java/Spring Boot, .NET/ASP.NET Core, Node.js/Fastify, React/TS, Docker.

---

## 2. Matriz de Casos de Teste (OWASP Top 10 2021)

### A01 — Broken Access Control

| ID | Caso | Trigger | Sub-agent | Ferramenta | Critério de Pass |
|---|---|---|---|---|---|
| SEC-001 | IDOR / path traversal em endpoints de histórico | Endpoints BFF novos detectados | auth-agent | semgrep | `GET /api/distribuicao/processos/{id}/historico` retorna 403 quando caller não tem `distribuicao:default:processo:ver-historico-alteracoes` |
| SEC-002 | Escalada de privilégio via atribuição de papel | Endpoint de atribuição detectado | auth-agent | semgrep | `POST /api/acessos/papeis/atribuir` só aceita chamadas com `acessos:default:papel:atribuir`; tentativa sem permissão → 403 |
| SEC-003 | CORS permissivo ou headers ausentes em APIs | API REST detectada | auth-agent | semgrep + grep | CORS policy não permite `*` em produção; `Access-Control-Allow-Origin` não é `*` |
| SEC-004 | Filtro escopado vazando assignments de outros domínios | Query escopada detectada (BFF /api/acessos/assignments) | auth-agent | semgrep + grep | Gerente de Distribuição não vê assignments de Cadastro; retorna lista vazia ou 403 |
| SEC-005 | Frontend gating burlável (ocultar componente ≠ proteger endpoint) | React SPA detectada | auth-agent | semgrep + grep | Endpoint de histórico retorna 403 mesmo quando chamado diretamente (sem passar pelo UI) |

### A02 — Cryptographic Failures

| ID | Caso | Trigger | Sub-agent | Ferramenta | Critério de Pass |
|---|---|---|---|---|---|
| SEC-006 | Algoritmo de hashing fraco ou chave hardcoded | Não aplicável (crypto via IdP externo) | crypto-agent | semgrep | N/A — skipped: JWT signing é responsabilidade do Logto/Keycloak; não há crypto manual no código |
| SEC-007 | TLS desabilitado ou versão fraca | Docker / HTTP outbound detectado | crypto-agent | semgrep + grep | Nenhuma chamada HTTP outbound usa `http://` para serviços externos em produção |
| SEC-008 | Mascaramento de CPF burlável no backend | Mascaramento server-side detectado | crypto-agent | semgrep | `DocumentoMasking` não retorna CPF completo quando `fullAllowed=false`; teste de integração valida |

### A03 — Injection

| ID | Caso | Trigger | Sub-agent | Ferramenta | Critério de Pass |
|---|---|---|---|---|---|
| SEC-009 | SQL Injection via JPA/Hibernate | Persistência JPA detectada | sast-agent | semgrep | Nenhuma concatenação de string SQL em controllers ou queries; uso de JPQL parametrizado |
| SEC-010 | SQL Injection via EF Core | EF Core detectado | sast-agent | semgrep | Nenhuma raw SQL concatenada; uso de LINQ parametrizado |
| SEC-011 | NoSQL Injection | Não aplicável (sem MongoDB) | sast-agent | semgrep | N/A — skipped: sem Mongoose/pymongo |
| SEC-012 | OS Command Injection | Não aplicável (sem Runtime.exec/subprocess) | sast-agent | semgrep | N/A — skipped: nenhum uso de child_process, subprocess, os/exec, Process.Start detectado |
| SEC-013 | SpEL Injection | Spring Framework detectado | sast-agent | semgrep | `@Value` e SpEL não usam input de usuário; sem `@Query` com SpEL dinâmico |
| SEC-014 | Template Injection | Não aplicável (sem engines de template server-side) | sast-agent | semgrep | N/A — skipped: sem Thymeleaf, JSP, etc. |

### A04 — Insecure Design

| ID | Caso | Trigger | Sub-agent | Ferramenta | Critério de Pass |
|---|---|---|---|---|---|
| SEC-015 | Ausência de rate limiting em endpoints de atribuição de papel | Endpoint público com auth detectado | sast-agent + auth-agent | semgrep | BFF ou ecad-authz aplica rate limiting em POST /v1/users/{id}/roles |
| SEC-016 | Secrets em logs (dados sensíveis em log) | Logging detectado | sast-agent | semgrep | Logs não contêm CPF completo, JWT tokens, ou senhas |
| SEC-017 | Ausência de validação de input em query escopada | Query escopada detectada | sast-agent | semgrep | BFF valida `domain` param contra denylist/allowlist; não passa direto para upstream |

### A05 — Security Misconfiguration

| ID | Caso | Trigger | Sub-agent | Ferramenta | Critério de Pass |
|---|---|---|---|---|---|
| SEC-018 | Headers de segurança ausentes (HSTS, CSP, X-Frame-Options) | API REST / SPA detectada | container-agent | semgrep + grep | Headers de segurança presentes em responses de BFF e frontend container |
| SEC-019 | Actuator/Swagger expostos sem auth | Spring Boot detectado | container-agent | semgrep | `/actuator` e `/swagger-ui` não expostos publicamente sem auth; se presentes, protegidos |
| SEC-020 | Container rodando como root | Dockerfile presente | container-agent | hadolint | Dockerfile não usa `USER root`; existe instrução `USER` não-root |
| SEC-021 | K8s manifests permissivos | K8s manifests ausentes | iac-agent | checkov | N/A — skipped: sem manifests K8s no repositório |
| SEC-022 | .env.example com valores sensíveis de placeholder | Arquivo .env presente | secrets-agent | gitleaks | `.env.example` não contém valores reais de senha, token ou chave |

### A06 — Vulnerable Components

| ID | Caso | Trigger | Sub-agent | Ferramenta | Critério de Pass |
|---|---|---|---|---|---|
| SEC-023 | CVEs em dependências Java (Maven) | pom.xml detectado | sca-agent | trivy | Zero CVE CRITICAL/HIGH sem mitigação aceita em dependências diretas do Distribuicao e Arrecadacao |
| SEC-024 | CVEs em dependências .NET (NuGet) | *.csproj detectado | sca-agent | trivy | Zero CVE CRITICAL/HIGH sem mitigação aceita em dependências do Cadastro e Identificacao |
| SEC-025 | CVEs em dependências Node.js (npm) | package.json detectado | sca-agent | trivy | Zero CVE CRITICAL/HIGH sem mitigação aceita em dependências do BFF, frontend e outros serviços Node |
| SEC-026 | CVEs em imagens Docker | Dockerfile detectado | sca-agent + container-agent | trivy | Zero CVE CRITICAL/HIGH em imagens base dos serviços |

### A07 — Identification & Auth Failures

| ID | Caso | Trigger | Sub-agent | Ferramenta | Critério de Pass |
|---|---|---|---|---|---|
| SEC-027 | JWT `alg=none` aceito | JWT lib detectada | auth-agent | semgrep | Nenhuma validação de JWT aceita `alg=none`; uso de biblioteca padrão (Logto/Keycloak) |
| SEC-028 | Sessão fraca ou brute force sem proteção | Auth detectado | auth-agent | semgrep | Login via Logto/Keycloak; proteção de brute force é responsabilidade do IdP |
| SEC-029 | Permissão `alg=none` ou bypass de authz | ecad-authz detectado | auth-agent | semgrep | BFF não bypassa ecad-authz; nenhuma rota usa `AUTH_ENABLED=false` em produção |

### A08 — Software & Data Integrity Failures

| ID | Caso | Trigger | Sub-agent | Ferramenta | Critério de Pass |
|---|---|---|---|---|---|
| SEC-030 | Deserialização insegura | Uso de ObjectInputStream/pickle não detectado | sca-agent + sast-agent | semgrep | Nenhum uso de `ObjectInputStream`, `pickle`, `BinaryFormatter` detectado |
| SEC-031 | Supply chain — CI/CD sem assinatura | CI/CD detectado | sca-agent | trivy | Pipeline `.github/workflows/ci-cd.yml` usa actions pinadas ou verificadas |
| SEC-032 | Mudanças em seeds não validadas (integridade do catálogo) | seeds JSON detectados | sast-agent | semgrep | `seed-authz.sh` valida JSON antes de enviar; dry-run disponível |

### A09 — Security Logging & Monitoring Failures

| ID | Caso | Trigger | Sub-agent | Ferramenta | Critério de Pass |
|---|---|---|---|---|---|
| SEC-033 | Ausência de log de eventos de segurança (atribuição de papel) | Logging detectado | sast-agent | semgrep | BFF loga com INFO toda atribuição/remoção de papel (TechSpec §Monitoramento) |
| SEC-034 | Dados sensíveis (CPF) em logs | Logging detectado | sast-agent | semgrep | CPF completo não aparece em logs estruturados do BFF ou backends |
| SEC-035 | Ausência de log em 403 de authz | Auth + logging detectado | sast-agent | semgrep | 403 retornado por falta de permissão é logado com `userSubject`, `permission`, `route` |

### A10 — SSRF

| ID | Caso | Trigger | Sub-agent | Ferramenta | Critério de Pass |
|---|---|---|---|---|---|
| SEC-036 | SSRF via proxy de audit (BFF → ecad-auditoria) | HTTP outbound + URL como input | sast-agent | semgrep | BFF não passa URL de ecad-auditoria controlada por usuário; URL é fixa em config |
| SEC-037 | SSRF via chamada ACL Distribuicao → Cadastro | HTTP outbound + URL controlada | sast-agent | semgrep | URL de Cadastro é fixa em config; não derivada de input de usuário |

---

## 3. Casos Skipped (Justificativa)

| OWASP | Caso | Justificativa |
|---|---|---|
| A02 | Crypto manual fraco | JWT signing é externo (Logto/Keycloak); não há crypto manual no código além de mascaramento de string |
| A03 | NoSQL Injection | Sem MongoDB/Mongoose/pymongo |
| A03 | OS Command Injection | Sem uso de Runtime.exec, child_process, subprocess, os/exec, Process.Start |
| A03 | Template Injection | Sem engines de template server-side |
| A05 | K8s manifests permissivos | Sem manifests K8s no repositório |
| A07 | Brute force | Proteção é responsabilidade do IdP (Logto/Keycloak) |
| A08 | Deserialização insegura | Sem ObjectInputStream, pickle, BinaryFormatter |

---

## 4. Sub-agents & Ferramentas

| Sub-agent | Casos | Ferramenta Docker | Imagem |
|---|---|---|---|
| sast-agent | SEC-009, SEC-010, SEC-013, SEC-015, SEC-016, SEC-017, SEC-032, SEC-033, SEC-034, SEC-035, SEC-036, SEC-037 | semgrep | returntocorp/semgrep:latest |
| sca-agent | SEC-023, SEC-024, SEC-025, SEC-026, SEC-030, SEC-031 | trivy | aquasec/trivy:latest |
| secrets-agent | SEC-022 | gitleaks | zricethezav/gitleaks:latest |
| container-agent | SEC-018, SEC-019, SEC-020 | hadolint + trivy | hadolint/hadolint:latest, aquasec/trivy:latest |
| auth-agent | SEC-001, SEC-002, SEC-003, SEC-004, SEC-005, SEC-027, SEC-028, SEC-029 | semgrep | returntocorp/semgrep:latest |
| crypto-agent | SEC-007, SEC-008 | semgrep | returntocorp/semgrep:latest |
| iac-agent | (skipped) | checkov | bridgecrew/checkov:latest |

---

## 5. Aprovação

**Status:** ⏳ PENDENTE

Por favor, revise a matriz acima. Edite (adicione/remova casos) se necessário. Confirme para prosseguir para a Fase 3 (Execução).

---

*Gerado pelo security-audit-workflow v1.0*

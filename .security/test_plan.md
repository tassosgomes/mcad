# Security Test Plan — F03 Gestao de Obras Musicais

**Scope:** services/cadastro-api (.NET 8 ASP.NET Core), F03 endpoints + integracao ISWC + Dockerfile.
**Mode:** auto-approve (usuario solicitou execucao sem pausas).
**Fonte do escopo:** PRD F03 (`tasks/cadastro/done-prd-gestao-obras/prd.md`).

## Matriz de casos OWASP Top 10 (aplicaveis)

| Case ID | OWASP | Foco | Sub-agent | Ferramenta (Docker) | Trigger |
|--------|-------|------|-----------|---------------------|---------|
| SEC-001 | A01 | Authz / IDOR / fallback de perms em endpoints F03 | auth-agent | semgrep `p/owasp-top-ten`, `p/csharp` | Endpoints HTTP detectados |
| SEC-002 | A02 | Crypto / TLS / segredos em config | crypto-agent + secrets-agent | semgrep + gitleaks | Auth + DB conn strings presentes |
| SEC-003 | A03 | SQL/NoSQL/OS Command/Injection geral | sast-agent | semgrep `p/csharp`, `p/owasp-top-ten` | EF Core LINQ + filtros user-controlled |
| SEC-004 | A04 | Design inseguro (rate-limit, validacao, race) | sast-agent | semgrep `r/csharp.lang.security` | API publica, fluxos com unicidade |
| SEC-005 | A05 | Misconfig: CORS, headers, AUTH_ENABLED toggle | sast-agent | semgrep + grep guiado | Program.cs + Dockerfile |
| SEC-006 | A06 | Vulnerabilidades em dependencias NuGet | sca-agent | trivy fs (.NET deps) | Sempre |
| SEC-007 | A07 | JWT / claims / autenticacao | auth-agent | semgrep `p/jwt` + revisao guiada | Lib JWT detectada |
| SEC-008 | A08 | Deserializacao insegura + supply chain | sast-agent + sca-agent | semgrep + trivy | Uso de ReadFromJsonAsync, Polly |
| SEC-009 | A09 | Logging seguro (sem dados sensiveis em log) | sast-agent | semgrep `r/csharp.lang.security.logging` | Logger usage |
| SEC-010 | A10 | SSRF na chamada ISWC (URL controlada por env) | sast-agent + revisao | semgrep + revisao manual | HttpClient + env-driven base URL |
| SEC-011 | A05 | Container Dockerfile hardening | container-agent | hadolint, trivy config | Dockerfile presente |
| SEC-012 | A02/A05 | Secrets em codigo-fonte | secrets-agent | gitleaks | Sempre |

### Casos skipped

| Case ID | OWASP | Justificativa |
|---------|-------|---------------|
| - | NoSQL Injection | Stack 100% PostgreSQL/EF Core — sem driver NoSQL |
| - | LDAP injection | Sem cliente LDAP no codigo |
| - | XXE | Endpoints aceitam apenas JSON; sem XML parser exposto |
| - | Pickle/BinaryFormatter | Sem uso detectado |
| - | IaC Kubernetes/Terraform | Repo nao expoe manifests dedicados nesta feature (Helm/k8s na raiz docker-stack.yml — fora do escopo F03) |

## Execucao

- Ferramentas executam em Docker (imagens oficiais).
- Output canonico: SARIF em `.security/findings/`.
- Falhas de ferramenta nao travam pipeline (NOT_EXECUTED + log).

## Aprovacao

Auto-approve registrado por solicitacao explicita do usuario ("work without stopping for clarifying questions").

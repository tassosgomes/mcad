# Plano de melhoria — CI/CD do mcad

> Status: **Fase 1 implementada** — workflows advisory/shadow ativos e rodando verde.
> Última atualização: 2026-06-17.
> Documenta as decisões, a arquitetura-alvo, as 3 fases de execução e a
> estratégia de migração **shadow pipeline** (zero downtime de entregas).
> Companion ADR: [ADR 0010 — CI/CD Pipeline Strategy](../adr/0010-ci-cd-pipeline-strategy.md).

---

## 0. Status de implementação (tracking)

| Fase | Componente | Status | Detalhe |
|---|---|---|---|
| 1 | `security-scan.yml` (Semgrep/Gitleaks/Hadolint/Trivy) | **DONE** | Advisory, SARIF → Security tab |
| 1 | `commitlint.yml` + husky local | **DONE** | Advisory no CI, hook local ativo |
| 1 | `_service-build.yml` (reusable) | **DONE** | 3 stacks, scan/sign/SBOM no push |
| 1 | `ci-cd-v2.yml` (shadow) | **DONE** | `push-images: false`, path filtering |
| 1 | `.github/renovate.json` | **DONE** | Config criada (instalação do app = manual) |
| 1 | Calibração de falsos positivos | **PENDENTE** | Observar 5-10 merges, suprimir no Security tab |
| 1 | Promoção advisory → blocking | **PENDENTE** | Após calibração, remover `continue-on-error` |
| 1 | Cutover `ci-cd.yml` → dispatch-only | **PENDENTE** | Quando v2 estável por 2+ semanas |
| 2 | `release-please` + tags semver | **DONE** | Config + manifest + workflows criados |
| 3 | Migração Portainer + CD dev + DAST | **PENDENTE** | Iniciar após cutover |

---

## 1. Contexto — diagnóstico da esteira atual

Pipeline atual: [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml) (540 linhas, 7 jobs paralelos).

```
push/PR → [unit tests por serviço] → [Docker build + push :run_number + :latest] → (fim)
```

Stacks cobertas: .NET 8 (cadastro-api, identificacao-api), Java 21/Maven (arrecadacao-api, distribuicao-api), Node 22 (bff, identity-sync-api), React/Vite (frontend).

Deploy atual: **manual**, via Stack Portainer criada colando o texto de [`docker-stack.yml`](../../docker-stack.yml). O `docker-stack.yml` já usa o padrão `${CADASTRO_API_IMAGE:-mcad-cadastro-api:latest}` — portanto a tag é **parametrizável via env var**, o que é a chave para o CD automático.

### Gaps identificados

| Gap | Impacto |
|---|---|
| Zero scanning de segurança (SAST/SCA/secret/container/DAST) | Vulnerabilidades e segredos vazados chegam à produção |
| Tag `:latest` é **mutável** + `${run_number}` não rastreia commit | Rollback não-determinístico; difícil correlacionar imagem ↔ release |
| Sem assinatura de imagem (Cosign/SLSA) nem SBOM | Supply-chain attack sem detecção |
| Jobs duplicados (~540 linhas, 7× boilerplate) | Manutenção cara; divergência entre serviços |
| Sem path filtering (todo PR builda os 7 serviços) | Minutos de CI desperdiçados em PRs de escopo único |
| Secrets no GitHub Actions paralelos ao Infisical | Governança fragmentada; rotação manual |
| Deploy 100% manual | Latência entre merge e dev; erro humano |

---

## 2. Decisões tomadas

| Decisão | Escolha | Justificativa |
|---|---|---|
| **SAST engine** | Semgrep (repo privado) | CodeQL nativo é pago (GHAS) em repo privado; Semgrep free cobre as 4 stacks |
| **DAST** | OWASP ZAP **no servidor Swarm** (não no runner GH) | Economia de minutos faturáveis do GH Actions; servidor já tem Docker |
| **Versionamento** | release-please + Conventional Commits | Bump automático de versão por escopo de commit; changelog auto |
| **Dependência bot** | Renovate + auto-merge patch/minor | Monorepo-friendly; agrupa PRs por ecosystem; cobre Dockerfiles + Actions |
| **Deploy dev** | Auto em todo push main | Único ambiente hoje; feedback loop curto |
| **Portainer** | Migrar Stack manual → **Git-based + webhook** | Habilita deploy automático via commit de `image-tags.env` |
| **Estratégia de implantação** | **Shadow pipeline** + 3 fases | Zero downtime de entregas; rollback trivial |
| **Tolerância a tempo de CI** | +3-5 min, gates em paralelo | Tradeoff aceito pela equipe |

---

## 3. Estado-alvo

```
┌── push to main / PR ────────────────────────────────────────────┐
│  [parallel]                                                      │
│   • Semgrep (SAST)         ┐                                    │
│   • Gitleaks (secret)      │                                    │
│   • Hadolint (Dockerfile)  ├─ Quality Gate ─┐                   │
│   • Trivy fs (SCA)         │                │                   │
│   • Unit tests por serviço ┘                │                   │
│                                              │                   │
│  (só no push to main) Build + Push ─────────┤                   │
│   tags: sha-xxx + main                      │                   │
│                                              │                   │
│  [parallel pós-build]                        │                   │
│   • Trivy image                             │                   │
│   • Syft SBOM                               │                   │
│   • Cosign sign + attest                    │                   │
│                                              │                   │
│  DAST (Webhook Portainer → stack dast) ─────┘                   │
│   • ZAP baseline + OpenAPI scan                                  │
│   • teardown                                                     │
│                                                                  │
│  (main + gate verde)                                             │
│   • update-image-tag (commit image-tags.env)                    │
│   • trigger-deploy-dev (Portainer webhook → Swarm rolling)      │
│   • verify-deploy (healthcheck via Traefik)                     │
│                                                                  │
│  (Conventional Commit dispara release)                           │
│   • release-please → tag vX.Y.Z → GitHub Release                │
│   • release.yml: build com tag semver + sign + attest           │
│                                                                  │
│  Renovate → PRs auto de patch/minor com auto-merge              │
└──────────────────────────────────────────────────────────────────┘
```

### Estratégia de tags final (multi-camada)

```
tassosgomes/mcad-${service}:1.4.2          # release (da tag vX.Y.Z)
tassosgomes/mcad-${service}:1.4            # minor rolling
tassosgomes/mcad-${service}:sha-abc1234    # imutável por commit
tassosgomes/mcad-${service}:main           # branch tracking
# eliminar :latest ao final da Fase 3
```

---

## 4. Estratégia de migração — Shadow Pipeline

**Princípio**: a nova esteira é construída **ao lado** da atual. Ambas rodam em paralelo até a nova provar estabilidade (5-10 merges verdes). Depois, **cutover** num commit único com rollback trivial.

### Análise de impacto por mudança

| Mudança | Quebra pipeline atual? | Observação |
|---|---|---|
| Criar `security-scan.yml`, `commitlint.yml`, `_service-build.yml` | **Não** | Workflows novos independentes |
| `.github/renovate.json` + app Renovate | **Não** | App externo abre PRs |
| `commitlint.yml` como advisory | **Não** | Só trava merge se virar required check |
| **Refatorar `ci-cd.yml` inline** | **SIM** | Por isso usamos `ci-cd-v2.yml` em shadow |
| Mudar tags (`:latest`→`:sha`/`:main`) | **SIM indireto** | Stack Portainer hoje puxa `:latest` default |
| `release-please` + `release.yml` | **Não** | Workflow novo, só ativa em `v*` |
| `image-tags.env` | **Não** | Arquivo novo |
| Migração Stack Portainer manual→Git | **Janela de risco** | Recuperável (Stack antiga fica como fallback) |

### Período de transição — publicação dupla de tags

Durante a Fase 3 (antes do cutover final), o CI publica **ambos** os conjuntos:

```yaml
tags: |
  tassosgomes/mcad-${service}:sha-${{ short_sha }}   # novo
  tassosgomes/mcad-${service}:main                   # novo
  tassosgomes/mcad-${service}:latest                 # legado (mantido temporariamente)
  tassosgomes/mcad-${service}:${{ run_number }}      # legado (mantido temporariamente)
```

Isso garante que se a Stack Portainer **manual** precisar ser re-deployada durante a transição, ela continua funcionando (puxa `:latest`). Somente após a Stack Git-based estar validada (N dias verde) é que removemos `:latest` e `:run_number`.

### Calendário orientativo

```
SEMANA 1 — Adições não-intrusivas (zero risco) ✅ DONE
   ci-cd.yml (atual)              ← intacta, continua required check
   + security-scan.yml            ← criado, paralelo, ADVISORY ✓
   + renovate.json + app          ← config criada ✓ (app = ação manual)
   + commitlint.yml               ← criado, advisory ✓
   + _service-build.yml           ← criado, reusable workflow ✓
   + ci-cd-v2.yml                 ← criado, shadow (push-images: false) ✓

SEMANA 2 — Calibração + observação (EM ANDAMENTO)
   Observar 5-10 merges: ci-cd-v2 verde quando ci-cd (v1) verde?
   Resolver falsos positivos do Semgrep/Trivy no Security tab
   Instalar app Renovate (ação manual no GitHub)

SEMANA 3 — Promover gates advisory → blocking
   security-scan.yml: remover continue-on-error (bloqueante)
   commitlint: vira required check
   Branch protection: exigir security-scan + commitlint + ci-cd-v2
   (ci-cd.yml v1 ainda roda em paralelo como rede de segurança)

SEMANA 4 — Cutover CI (commit único)
   git mv ci-cd.yml ci-cd-legacy.yml.disabled
   ci-cd-v2.yml vira o único CI
   Branch protection aponta para ci-cd-v2 (renomeado ou já ci-cd)

SEMANA 5-6 — Fase 2+3 (versionamento + CD)
   Antes de mudar tags: migrar Portainer manual → Git-based
   Publicar duplo set de tags durante transição
   Validar deploy automático
   Remover :latest e Stack manual legado
```

---

## 5. FASE 1 — Hardening de CI (segurança + refactor + Renovate)

### Gates incluídos (versões finais — implementado)

| Gate | Action/Tool | Versão | Alvo | Output | Modo |
|---|---|---|---|---|---|
| **Secret Scan** | `gitleaks/gitleaks-action` | **@v3** | repo todo | annotations | advisory |
| **SAST** | `semgrep` via `pip install` + `semgrep scan` (rulesets `p/default p/owasp-top-ten p/csharp p/java p/javascript p/react p/nodejs p/dockerfile p/sql-injection p/security-audit`) | latest | todas | SARIF | advisory |
| **Lint Dockerfile** | `hadolint/hadolint-action` | **@v3.1.0** | 7 Dockerfiles | SARIF | advisory |
| **SCA manifestos** | `aquasecurity/trivy-action` | **@v0.36.0** | repo todo (`trivy fs`) | SARIF | advisory |
| **Container Scan** | `aquasecurity/trivy-action` | **@v0.36.0** | imagem recém-built (`trivy image`) | SARIF | advisory |
| **SBOM** | `anchore/sbom-action` | **@v0** | 7 imagens (CycloneDX) | artifact | ativo no push |
| **Sign + Attest** | `sigstore/cosign-installer@v3` (keyless) + `actions/attest-build-provenance@v1` (SLSA) | — | 7 imagens | assinatura | ativo no push |
| **Renovate** | app externo + `.github/renovate.json` | — | nuget/maven/npm/docker/actions | PRs auto | auto-merge patch/minor |
| **commitlint** | `wagoid/commitlint-github-action@v6` + husky@9 local | — | mensagens de commit | check | advisory |
| **SARIF upload** | `github/codeql-action/upload-sarif` | **@v4** | — | Security tab | — |

### Arquivos criados (implementado)

| Arquivo | Status |
|---|---|
| `.github/workflows/_service-build.yml` | **criado** — reusable workflow com `workflow_call`, 3 stacks |
| `.github/workflows/ci-cd-v2.yml` | **criado** — chama `_service-build` por serviço, `push-images: false`, path filtering |
| `.github/workflows/security-scan.yml` | **criado** — Semgrep + Gitleaks + Hadolint + Trivy fs (advisory) |
| `.github/workflows/commitlint.yml` | **criado** — `wagoid/commitlint-github-action@v6` (advisory) |
| `.github/renovate.json` | **criado** — auto-merge patch/minor + grupos docker/actions/nuget/maven/npm |
| `commitlint.config.js` (raiz) | **criado** — `extends: ['@commitlint/config-conventional']` + tipo extra `security` |
| `.husky/commit-msg` | **criado** — hook husky@9 (executável) |
| `package.json` (raiz) | **criado** — devDeps commitlint@19 + husky@9 |
| `.github/workflows/ci-cd.yml` | **intacto** — pipeline atual permanece 100% funcional |

### `release-please` config (referência, implementado na Fase 2)

`release-please-config.json` (raiz):
```jsonc
{
  "bootstrap-sha": "<sha-inicial>",
  "separate-pull-requests": true,
  "packages": {
    "services/cadastro-api":      { "component": "cadastro-api",      "release-type": "dotnet" },
    "services/identificacao-api": { "component": "identificacao-api", "release-type": "dotnet" },
    "services/arrecadacao-api":   { "component": "arrecadacao-api",   "release-type": "maven"  },
    "services/distribuicao-api":  { "component": "distribuicao-api",  "release-type": "maven"  },
    "services/bff":               { "component": "bff",               "release-type": "node"   },
    "services/identity-sync-api": { "component": "identity-sync-api", "release-type": "node"   },
    "frontend":                   { "component": "frontend",          "release-type": "node"   }
  }
}
```

### Renovate config (implementado)

Ver [`.github/renovate.json`](../../.github/renovate.json) — resumo das regras:
- Auto-merge patch/minor após CI verde (squash)
- Major exige review humana
- Grupos: docker base images, github actions, nuget, maven, npm
- Vulnerability alerts auto-mergeados com label `security`
- Schedule: earlyMondays

### Critérios de aceite — Fase 1

- [x] `security-scan.yml` publica SARIF no GitHub Security tab
- [x] `ci-cd-v2.yml` roda em paralelo com `ci-cd.yml` (sem push de imagens)
- [x] commitlint valida Conventional Commits local (husky) + CI (advisory)
- [x] Renovate config criada (`.github/renovate.json`)
- [ ] Renovate app instalado + abrindo PRs (ação manual)
- [ ] `ci-cd-v2.yml` verde em 5+ merges sem divergência vs `ci-cd.yml`
- [ ] Semgrep/Trivy/Gitleaks calibrados (falsos positivos suprimidos)
- [ ] Gates promovidos de advisory → blocking após calibração
- [ ] Cutover: `ci-cd.yml` → `workflow_dispatch: only`; `ci-cd-v2.yml` vira o único CI required

### Ajustes durante a implementação (lições aprendidas)

Problemas encontrados e resolvidos durante o deploy da Fase 1:

| Problema | Causa | Solução aplicada |
|---|---|---|
| `id-token/attestations: none` no reusable workflow | Caller (`ci-cd-v2.yml`) não declarava as permissions que o `_service-build.yml` herda | Adicionado `permissions: id-token: write, attestations: write` no top-level do caller |
| `Path does not exist: trivy-fs.sarif` | Scan advisory com `continue-on-error` não produzia arquivo quando não havia findings | Fallback de SARIF vazio (JSON mínimo) antes do upload |
| `codeql-action/upload-sarif@v3` deprecation warning | v3 deprecado em dez/2026 | Atualizado para `@v4` |
| `trivy-action@0.28.0` → `setup-trivy@v0.2.1` inexistente | Tag sem prefixo `v` + versão antiga do action dependia de setup-trivy não-publicado | Pin para `trivy-action@v0.36.0` (tag `v` obrigatória; v0.36.0 referencia setup-trivy@v0.3.x) |
| `trivy-action@v0.68.2` não resolvido | `v0.68.2` é a versão do trivy CLI, não do action (latest do action = v0.36.0) | Corrigido para `@v0.36.0` |
| Node.js 20 deprecated warnings (checkout/upload-artifact/gitleaks) | Actions ainda em runtime Node 20 | Bump: `checkout@v4→v6`, `upload-artifact@v4→v7`, `gitleaks-action@v2→v3` |
| `hashFiles()` com `${{ }}` em `if:` sempre true | Expressões GitHub Actions não suportam interpolação `${{ }}` dentro de funções | Usado padrão fallback de SARIF vazio + `format()` para caminhos dinâmicos |

---

## 6. FASE 2 — Versionamento Semântico

### Arquivos criados (implementado)

| Arquivo | Status |
|---|---|
| `release-please-config.json` (raiz) | **criado** — monorepo manifest, 7 packages, `skip-version-file`, `include-component-in-tag` |
| `.release-please-manifest.json` (raiz) | **criado** — versão inicial `0.1.0` para todos os serviços |
| `.github/workflows/release-please.yml` | **criado** — `googleapis/release-please-action@v4`, mantém Release PRs por serviço |
| `.github/workflows/release.yml` | **criado** — `on: push: tags`, parse da tag → chama `_service-build.yml` com `push-images: true` + `release-version` |
| `_service-build.yml` (modificado) | **atualizado** — novo input `release-version` + step "Prepare image tags" que adiciona `:vX.Y.Z` e `:vX.Y` |
| `.github/workflows/ci-cd.yml` | **intacto** — pipeline atual permanece funcional |

### Fluxo de versionamento

```
feat(cadastro-api): nova funcionalidade      ← Conventional Commit no main
                    ↓
release-please.yml cria/atualiza Release PR  ← "chore(main): Release cadastro-api v0.2.0"
                    ↓
 humano mergeia o Release PR
                    ↓
release-please cria tag "cadastro-api-v0.2.0"
                    ↓
release.yml dispara (tag push)
  → parse-tag: component=cadastro-api, version=0.2.0
  → _service-build.yml: push-images=true, release-version=0.2.0
  → imagem publicada com tags:
      mcad-cadastro-api:sha-abc1234
      mcad-cadastro-api:main
      mcad-cadastro-api:0.2.0
      mcad-cadastro-api:0.2
  → Trivy scan + Cosign sign + SBOM + SLSA attest
```

### Estratégia de tags — período de transição (dupla publicação)

Durante a Fase 3, antes de remover `:latest`:
```yaml
# Publicado pelo ci-cd.yml (atual, legado):
tags: |
  tassosgomes/mcad-${service}:latest
  tassosgomes/mcad-${service}:${{ run_number }}

# Publicado pelo ci-cd-v2.yml (pós-cutover, push to main):
tags: |
  tassosgomes/mcad-${service}:sha-${{ short_sha }}
  tassosgomes/mcad-${service}:main

# Publicado pelo release.yml (tag push):
tags: |
  tassosgomes/mcad-${service}:sha-${{ short_sha }}
  tassosgomes/mcad-${service}:main
  tassosgomes/mcad-${service}:0.2.0
  tassosgomes/mcad-${service}:0.2
```

### Critérios de aceite — Fase 2

- [x] `release-please-config.json` + manifest criados (7 serviços)
- [x] `release-please.yml` cria Release PRs por serviço a partir de Conventional Commits
- [x] `release.yml` builda e publica imagem com tag semver + assina (Cosign) + SBOM
- [x] `_service-build.yml` suporta `release-version` para tags `:vX.Y.Z` + `:vX.Y`
- [ ] Commit `feat(cadastro-api):` no main gera Release PR (validar no primeiro PR real)
- [ ] Merge do Release PR cria tag `cadastro-api-vX.Y.Z` + GitHub Release
- [ ] Período de transição mantém `:latest` funcional (via `ci-cd.yml` atual)

---

## 7. FASE 3 — CD Automático p/ Dev + DAST

### 7.1 — Migração da Stack Portainer (Manual → Git-based)

**Passos manuais no Portainer (uma vez)**:

1. Em **Stacks → New Stack → Git repository**:
   - Repository URL: `github.com/<owner>/mcad`
   - Branch: `main`
   - Compose path: `docker-stack.yml`
   - **Environment variables**: carregar `image-tags.env` (mesmas vars já esperadas pelo `docker-stack.yml`: `CADASTRO_API_IMAGE`, `IDENTIFICACAO_API_IMAGE`, etc.)
2. **Automatic updates**: habilitar **Webhook** (gera URL `https://portainer.../api/stacks/webhooks/<uuid>`)
3. Armazenar URL do webhook como `PORTAINER_WEBHOOK_URL_DEV` nos secrets do GitHub Actions (preferencialmente via Infisical).
4. Validar deploy manual na nova Stack (botão "Update the stack").
5. Mantenha a Stack manual antiga ativa como **fallback** durante N dias.
6. Após confirmação, desativar/remover Stack manual antiga.

### 7.2 — Arquivos a criar/modificar

| Arquivo | Ação |
|---|---|
| `image-tags.env` (raiz) | criar (fonte da verdade das tags deployadas) |
| `docker-compose.dast.yml` (raiz) | criar (stack DAST efêmera em rede `dast-net` isolada) |
| `.github/workflows/deploy-dev.yml` | criar (`update-image-tag` + `trigger-deploy-dev` + `verify-deploy`) |
| `.github/workflows/dast.yml` | criar (ZAP baseline + API scan via webhook Portainer) |
| `docker-stack.yml` | **sem mudança estrutural** (já parametrizado) |

### 7.3 — `image-tags.env` (atualizado pelo CI após Quality Gate verde)

```env
# Fonte da verdade — atualizado automaticamente pelo workflow deploy-dev.yml
CADASTRO_API_IMAGE=tassosgomes/mcad-cadastro-api:sha-abc1234
IDENTIFICACAO_API_IMAGE=tassosgomes/mcad-identificacao-api:sha-def4567
ARRECADACAO_API_IMAGE=tassosgomes/mcad-arrecadacao-api:sha-789abcd
DISTRIBUICAO_API_IMAGE=tassosgomes/mcad-distribuicao-api:sha-012ef34
BFF_IMAGE=tassosgomes/mcad-bff:sha-456cd78
IDENTITY_SYNC_API_IMAGE=tassosgomes/mcad-identity-sync-api:sha-89de901
FRONTEND_IMAGE=tassosgomes/mcad-frontend:sha-234ab56
```

### 7.4 — Job `deploy-dev.yml` (esboço)

```yaml
name: deploy-dev
on:
  workflow_run:
    workflows: ["CI/CD"]   # ou "ci-cd-v2" durante transição
    types: [completed]
    branches: [main]

jobs:
  update-image-tags:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Atualizar image-tags.env com novo SHA (só serviços alterados)
        run: |  # via dorny/paths-filter ou diff do commit
          ...
      - uses: stefanzweifel/git-auto-commit-action@v5
        with:
          commit_message: "chore(deploy): bump image tags [skip ci]"

  trigger-portainer:
    needs: update-image-tags
    runs-on: ubuntu-latest
    steps:
      - name: Chamar webhook Portainer
        run: curl -sX POST -fsSL "$PORTAINER_WEBHOOK_URL_DEV"

  verify-deploy:
    needs: trigger-portainer
    runs-on: ubuntu-latest
    steps:
      - name: Aguardar + healthcheck via Traefik
        run: |
          for url in \
            https://mcad-cadastro.tasso.dev.br/health/live \
            https://mcad-identificacao.tasso.dev.br/health/live \
            https://mcad-arrecadacao.tasso.dev.br/health/live \
            https://mcad.tasso.dev.br ; do
            retry 30 curl -fsS "$url" >/dev/null
          done
```

### 7.5 — DAST no servidor Swarm

**Fluxo**:
1. CI publica imagem-alvo (`:sha-xxx`) no Docker Hub (já feito no CI).
2. Job `dast` chama webhook Portainer `DAST_STACK_WEBHOOK` passando tag-alvo.
3. Portainer sobe `docker-compose.dast.yml` em rede overlay `dast-net` isolada (sem expor Traefik público).
4. CI executa via SSH (`appleboy/ssh-action`) no servidor Swarm:
   ```bash
   docker run --rm --network dast-net \
     software/security/dast:2.14 \
     -t http://mcad-cadastro-api:5001 \
     -openapi /contracts/cadastro/api-contract.yaml \
     -J zap-report.json -r zap-report.html
   ```
5. CI baixa `zap-report.json` via SCP, publica como artifact + SARIF no Security tab.
6. Webhook teardown ou `docker stack rm mcad-dast-cadastro`.

**Agendado** (cron semanal): ZAP **Full Scan** contra o ambiente dev público (`https://mcad-cadastro.tasso.dev.br`) para cobertura de controllers não documentados.

### Critérios de aceite — Fase 3

- [ ] Stack Portainer é Git-based + webhook configurado
- [ ] Push main com gate verde → `image-tags.env` atualizado → webhook Portainer → Swarm rolling update automático
- [ ] Healthcheck de cada serviço verde em < 5 min pós-deploy
- [ ] Rollback funcional: reverter commit do `image-tags.env` → Portainer redeploya tag anterior
- [ ] DAST executa no servidor (não no runner GH), gera SARIF no Security tab
- [ ] Stack DAST sobe/desce via webhook sem intervenção manual
- [ ] Publicação de `:latest` removida (após Stack Git-based validada)
- [ ] Stack Portainer manual legado desativada

---

## 8. Ordem de execução segura (matriz de risco)

| # | Ação | Risco | Reverte como? |
|---|---|---|---|
| 1 | Adicionar workflows novos (security-scan, commitlint, renovate, _service-build) | Zero | `git rm` |
| 2 | Criar `ci-cd-v2.yml` em shadow (paralelo, não-required) | Zero | `git rm` |
| 3 | Promover gates: advisory → blocking (5-10 merges depois) | Baixo | Reverter `--exit-code 1` |
| 4 | Branch protection: exigir ci-cd-v2 + security-scan + commitlint | Médio | Desabilitar checks no GitHub |
| 5 | **Cutover CI**: `ci-cd.yml` → `workflow_dispatch: only` | Médio | `git revert` restaura automático |
| 6 | Criar Stack Portainer Git-based ao lado da manual | Baixo | Não usar a nova Stack |
| 7 | Publicar duplo set de tags (`:sha`+`:main` E `:latest`+`:run_number`) | Baixo | Manter `:latest` |
| 8 | Migrar deploy p/ Stack nova + webhook | Médio | Reapontar webhook p/ Stack antiga |
| 9 | Remover `:latest` + Stack manual legado | Baixo | Restaura tags |
| 10 | Adicionar release-please + DAST | Zero (aditivo) | — |

---

## 9. Pré-requisitos / Secrets

### GitHub Actions secrets (preferencialmente via Infisical)

- `PORTAINER_WEBHOOK_URL_DEV` — webhook da stack dev
- `DAST_STACK_WEBHOOK` — webhook da stack DAST (por serviço, ou genérico parametrizado)
- `SWARM_SSH_HOST` / `SWARM_SSH_KEY` — SSH action para rodar ZAP no servidor (alternativa ao Portainer)
- Manter: `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `GH_PACKAGES_READ_TOKEN`

### Portainer (configuração manual única)

- Criar nova Stack Git-based apontando p/ `docker-stack.yml` + `image-tags.env`
- Habilitar webhook e copiar URL para GitHub secret
- Manter Stack manual antiga como fallback (remover após validação)

---

## 10. Procedimentos de rollback

### Rollback de CI (se `ci-cd-v2` apresentar problema após cutover)

```bash
# Reabilitar pipeline legada
git revert <sha-do-commit-cutover>
git push origin main
# ci-cd.yml volta a rodar em push/PR automaticamente
```

Alternativamente, disparar manualmente:
```bash
gh workflow run ci-cd.yml --ref main
```

### Rollback de deploy (dev em estado inconsistente)

```bash
# Reverter commit que bumpou image-tags.env
git revert <sha-do-bump>
git push origin main
# deploy-dev.yml re-executa → webhook Portainer → redeploy com tag anterior
```

Ou editar `image-tags.env` manualmente apontando para SHA anterior conhecido-bom.

### Rollback de Stack Portainer

Se a nova Stack Git-based tiver problema:
1. No Portainer, desativar webhook da Stack nova.
2. Reativar Stack manual antiga (ainda presente como fallback durante transição).
3. Re-deployar manualmente com tag `:latest` conhecida-boa.

---

## 11. Referências

- Pipeline atual: [`.github/workflows/ci-cd.yml`](../../.github/workflows/ci-cd.yml)
- Stack Swarm: [`docker-stack.yml`](../../docker-stack.yml)
- ADR companion: [ADR 0010 — CI/CD Pipeline Strategy](../adr/0010-ci-cd-pipeline-strategy.md) (a criar)
- Skill de auditoria de segurança local: [`.claude/skills/security-audit-workflow`](../../.claude/skills/security-audit-workflow)
- Documentação de referencia: 
  - Semgrep: https://semgrep.dev/docs
  - release-please: https://github.com/googleapis/release-please
  - Renovate: https://docs.renovatebot.com
  - Cosign/SLSA: https://docs.sigstore.dev
  - OWASP ZAP: https://www.zaproxy.org/docs/docker

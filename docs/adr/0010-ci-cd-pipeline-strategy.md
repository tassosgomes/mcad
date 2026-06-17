# ADR 0010 — Estratégia de Pipeline CI/CD (Shadow Pipeline + Gates de Segurança + CD via Portainer)

- **Status:** Accepted
- **Data:** 2026-06-16
- **Autores / decision-makers:** Equipe MCAD
- **Tags:** ci-cd, segurança, devops, release-please, renovate, portainer, docker-swarm
- **Plano detalhado:** [`docs/ops/ci-cd-improvement-plan.md`](../ops/ci-cd-improvement-plan.md)

---

## Context

A esteira atual (`.github/workflows/ci-cd.yml`, 540 linhas, 7 jobs paralelos) **para no build + push de imagens** para o Docker Hub com tags `${run_number}` + `:latest`. O deploy para o único ambiente (dev) é **manual**, feito colando o `docker-stack.yml` numa Stack Portainer.

Gaps identificados:

1. **Zero scanning de segurança** (SAST/SCA/secret/container/DAST) — vulnerabilidades e segredos vazados chegam à produção.
2. **Tags não-rastreáveis** — `:latest` é mutável; `${run_number}` não correlaciona com commit/release.
3. **Sem assinatura nem SBOM** — supply-chain attack sem detecção.
4. **Jobs duplicados** (~540 linhas, 7× boilerplate) — manutenção cara e sujeita a divergência entre serviços.
5. **Sem path filtering** — todo PR builda os 7 serviços mesmo quando só um mudou.
6. **Deploy 100% manual** — latência entre merge e dev; erro humano.

O `docker-stack.yml` já usa o padrão `${CADASTRO_API_IMAGE:-mcad-cadastro-api:latest}` — portanto **a tag é parametrizável via env var**, o que é a chave para o CD automático. Stack Portainer é **manual** hoje (texto colado na UI).

Repositório é **privado**, sem GitHub Advanced Security (GHAS).

## Decision

Adotar **3 decisões estruturais** executadas em **3 fases sequenciais** via **shadow pipeline** (zero downtime):

### 1. Gates de segurança shift-left (Fase 1)

- **SAST**: **Semgrep** (repo privado — CodeQL nativo exigiria GHAS pago) com rulesets `p/owasp`, `p/csharp`, `p/java`, `p/react`, `p/nodejs`, `p/security-audit`, `p/dockerfile`.
- **Secret scan**: **Gitleaks** sobre o repo inteiro (complementa o Infisical que gerencia segredos em runtime).
- **SCA**: **Trivy fs** (`--scanners vuln`) sobre cada `services/*` e `trivy image` sobre a imagem construída.
- **Lint de Dockerfile**: **Hadolint** nos 7 Dockerfiles.
- **SBOM**: **Syft** (CycloneDX) publicado como artifact.
- **Assinatura + Provenance**: **Cosign keyless** (Fulcio OIDC GitHub) + `actions/attest-build-provenance` (SLSA L3).
- **Dependência bot**: **Renovate** com auto-merge de patch/minor (cobre nuget, maven, npm, **Dockerfiles** e **GitHub Actions**).
- **commitlint**: validar **Conventional Commits** (pré-requisito do release-please).
- **Quality gate consolidado**: job final que agrega SARIFs e bloqueia em `CRITICAL`.

Gates iniciam como **advisory** (não-bloqueantes) durante a calibração e são promovidos a **blocking** após 5-10 merges sem falsos positivos.

### 2. Versionamento semântico automático (Fase 2)

- **release-please** (Google) em modo **monorepo manifest** — um release por serviço (cadastro-api, identificacao-api, arrecadacao-api, distribuicao-api, bff, identity-sync-api, frontend).
- **Estratégia de tags multi-camada**:
  - `:sha-<short>` — imutável por commit (sempre)
  - `:main` — branch tracking (elimina `:latest`)
  - `:vX.Y.Z` + `:vX.Y` — release (gerada pelo workflow `release.yml` em tag git)
- Durante a transição, **dupla publicação** (`:sha` + `:main` + `:latest` legado) até a Stack Portainer Git-based ser validada.

### 3. CD automático para dev + DAST no servidor (Fase 3)

- **Migração da Stack Portainer manual → Git-based + webhook** apontando para `docker-stack.yml` + `image-tags.env` versionado.
- **`image-tags.env`** na raiz do repo — fonte da verdade das tags deployadas. CI atualiza este arquivo via `git-auto-commit-action` após Quality Gate verde.
- **Trigger de deploy**: job `deploy-dev.yml` chama webhook Portainer → Swarm rolling update (`--update-delay 10s --update-parallelism 1`).
- **Smoke test pós-deploy**: healthchecks via Traefik (`/health/live`).
- **DAST**: **OWASP ZAP** rodando **no servidor Swarm** (não no runner GH Actions — economia de minutos faturáveis). Stack DAST efêmera em rede overlay `dast-net` isolada, sobe/desce via webhook. Importa `api-contract.yaml` do serviço-alvo para fuzz endpoints. Cron semanal de ZAP Full Scan contra o dev público.

### 4. Shadow pipeline como estratégia de migração

A nova esteira é construída **ao lado** da atual. Ambas rodam em paralelo até a nova prover 5-10 merges verdes sem divergência. Depois, **cutover** num commit único (`ci-cd.yml` → `workflow_dispatch: only`; `ci-cd-v2.yml` vira o único CI required). Rollback trivial via `git revert`.

## Alternativas Consideradas

### Alternativa A: GitHub Advanced Security (CodeQL + Dependabot premium)

- **Descrição:** Usar CodeQL nativo + Dependabot nativo premium.
- **Prós:** integração zero-config com o GitHub; regras oficiais mantidas.
- **Contras:** repo privado exige **GHAS pago** ($$$ por committer).
- **Por que rejeitada:** custo não justifica; Semgrep free cobre as 4 stacks com regras OWASP equivalentes.

### Alternativa B: DAST no runner do GitHub Actions (compose efêmero)

- **Descrição:** Subir `services:` do GH Actions com Postgres + RabbitMQ + serviço-alvo e rodar ZAP no próprio runner.
- **Prós:** sem dependência de servidor; isolamento total por run.
- **Contras:** consome **minutos faturáveis** do GH Actions; setup complexo para 4 stacks diferentes.
- **Por que rejeitada:** servidor Swarm já disponível e ocioso; rodar DAST lá é mais barato e mais realista.

### Alternativa C: semantic-release em vez de release-please

- **Descrição:** semantic-release (Node.js) para bump + release.
- **Prós:** mais configurável; ecossistema de plugins.
- **Contras:** otimizado para monorepo Node; suporte menos maduro para .NET/Maven; release-please é nativo do Google e bem adaptado a monorepos multi-stack.
- **Por que rejeitada:** release-please tem melhor suporte out-of-the-box para os 4 stacks do mcad.

### Alternativa D: Dependabot nativo em vez de Renovate

- **Descrição:** Dependabot nativo do GitHub.
- **Prós:** zero configuração; nativo.
- **Contras:** um PR por lib (ruim em monorepo); agrupamento limitado; não cobre Dockerfiles e GitHub Actions com mesma fluidez.
- **Por que rejeitada:** Renovate é mais inteligente para monorepo (agrupa por ecosystem, auto-merge granular).

### Alternativa E: Deploy via SSH direto (sem Portainer)

- **Descrição:** CI faz SSH no servidor e roda `docker stack deploy` direto.
- **Prós:** menos camadas; controle total.
- **Contras:** expõe SSH do servidor ao GitHub; perde a UI de observabilidade do Portainer; quebra o fluxo operacional atual.
- **Por que rejeitada:** webhook Portainer é HTTPS outbound, mais seguro e preserva a operação existente.

### Alternativa F: Refatorar `ci-cd.yml` inline (sem shadow)

- **Descrição:** Substituir diretamente o conteúdo de `ci-cd.yml` pela nova versão.
- **Prós:** um arquivo só; sem período de transição.
- **Contras:** qualquer bug na refatoração quebra entregas em produção imediatamente; sem rollback trivial além de `git revert` (que voltaria TODAS as mudanças).
- **Por que rejeitada:** shadow pipeline dá janela de observação e rollback granular.

## Consequências

### Positivas

- **Segurança**: SAST + SCA + secret + container scan + DAST cobrem OWASP Top 10 em camadas; SARIF centralizado no GitHub Security tab.
- **Rastreabilidade**: cada commit tem imagem `:sha-xxx` imutável; cada release tem `:vX.Y.Z` com changelog.
- **Supply-chain**: assinatura Cosign + SBOM CycloneDX + SLSA provenance.
- **Produtividade**: Renovate reduz toil de bump de deps; path filtering reduz minutos de CI em PRs.
- **Lead time dev**: deploy automático em push main (Portainer webhook + Swarm rolling).
- **Manutenibilidade**: reusable workflow reduz ~540 → ~150 linhas.
- **Zero downtime de entregas**: shadow pipeline preserva a esteira legada até cutover explícito.

### Negativas

- **Complexidade temporária**: duas esteiras rodando em paralelo durante ~3-4 semanas (janela de shadow).
- **Toil de calibração**: Semgrep/Trivy iniciam com falsos positivos; exige supressões (`// nosemgrep`, `.trivyignore`) até estabilizar.
- **Dependência do Portainer**: webhook Portainer fica como SPOF do CD. Mitigação: fallback via polling Git automático do Portainer.
- **Disciplina de commit**: Conventional Commits passa a ser obrigatório (`feat:`, `fix:`, etc.) — curva de aprendizado curta mas real.

### Riscos

- **Risco de webhook Portainer indisponível**: deploy dev silenciosamente não acontece. **Mitigação**: job `verify-deploy` faz healthcheck pós-trigger; alerta no Uptime-Kuma se diff entre `image-tags.env` (repo) e imagem rodante (Swarm) > 30 min.
- **Risco de Renovate auto-merge introduzir breaking change**: **Mitigação**: auto-merge só em patch/minor com CI verde; major exige review humana.
- **Risco de DAST gerar falso positivo que bloqueia CI**: **Mitigação**: DAST inicia como advisory; vira blocking só após calibração.
- **Risco de `image-tags.env` drift**: se commit falha中途, tag no repo não reflete a imagem deployada. **Mitigação**: `deploy-dev.yml` usa `workflow_run` (só dispara após CI verde) e `git-auto-commit-action` com `[skip ci]` para evitar loop.

## Notas de Implementação

- Ordem de execução detalhada e matriz de risco em [`docs/ops/ci-cd-improvement-plan.md` § 8](../ops/ci-cd-improvement-plan.md).
- Pré-requisitos de secrets em [`docs/ops/ci-cd-improvement-plan.md` § 9](../ops/ci-cd-improvement-plan.md).
- Procedimentos de rollback (CI, deploy, Portainer) em [`docs/ops/ci-cd-improvement-plan.md` § 10](../ops/ci-cd-improvement-plan.md).
- Skill de auditoria de segurança local (`.claude/skills/security-audit-workflow`) pode ser usada como gate adicional off-CI.

## Referências

- Pipeline atual: `.github/workflows/ci-cd.yml`
- Stack Swarm: `docker-stack.yml`
- Plano detalhado: `docs/ops/ci-cd-improvement-plan.md`
- Skill security-audit-workflow: `.claude/skills/security-audit-workflow/SKILL.md`
- Documentação externa: Semgrep (https://semgrep.dev/docs), release-please (https://github.com/googleapis/release-please), Renovate (https://docs.renovatebot.com), Cosign/SLSA (https://docs.sigstore.dev), OWASP ZAP (https://www.zaproxy.org/docs/docker)

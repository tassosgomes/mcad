# Próximos passos — Migração ecad-authz

> **STATUS: ✅ CONCLUÍDO em 2026-05-15.** Toda a checklist deste documento foi executada.
> Veja `relatorio-final.md` para o estado consolidado e residuais.
> Última atualização: 2026-05-15 (madrugada). Sessão interrompida com a
> branch `main` 6 commits à frente de `origin/main` e a aplicação parcialmente
> funcional em produção. Este documento registra o que falta para fechar a
> migração e quem faz o quê.
>
> Documentos relacionados:
> - `docs/migracao-authz/relatorio-final.md` — onde a migração ficou.
> - `docs/migracao-authz/analise-estado-atual.md` — análise consolidada.
> - `docs/adr/0002-permission-naming-convention.md` — padrão 4-segmentos.
> - `docs/migracao-authz/guia-operacional.md` — operação do seed.

---

## 1. Onde paramos

### Estado de produção (https://mcad.tasso.dev.br)

| Componente | Estado | Observações |
|---|---|---|
| Frontend (`mcad-frontend`) | ✅ deployado com fixes | bundle `index-D4IbNShN.js` é o atual; ainda precisa redeploy depois do commit `5442a2e` |
| BFF (`mcad-bff`) | ⚠️ deployado mas precisa rebuild | commits 7228010, 87fcaa4, b86b2d4, 654347d ainda não no remoto |
| ecad-authz (`mcad-authz`) | ✅ no ar (`/v1/health` UP) | mas com catálogo em formato 3-segmentos (legado) |
| Logto (IdP) | ✅ funcionando | usuários `tsgomes`, `t3crjdamuir4` autenticam OK |

### Commits da sessão (já no `origin/main`)

```
5442a2e fix(authz): habilitar acesso ao modulo /autorizacao via authz:admin:*
654347d fix(bff): normalizar permissoes 3-seg do ecad-authz para 4-seg
c17b082 fix(bff): configurar AUTHZ_BASE_URL no swarm
7228010 fix(authz): apontar fetch de /api/me/permissions para o host do BFF
87fcaa4 fix(authz): quebrar loop infinito de redirect apos login
bd99313 chore(authz): consumir SDKs publicados
0eb70bb fix(ci): corrigir build das pipes authz
455d5cb feat(authz): migrar mcad para autorizacao fina centralizada via ecad-authz
```

A imagem do `mcad-bff` precisa ser **rebuildada** para incluir os commits
`7228010`, `c17b082`, `654347d` e o frontend precisa rebuild para
`5442a2e`. Status do redeploy: verificar amanhã antes de testar.

### Histórico do que rolou (resumo)

1. Migração para 4-segmentos finalizada e commitada (`455d5cb` original, depois rebased para `bd99313`).
2. Tela após login entrava em loop (Chrome/Firefox bloqueava `history.pushState`).
   Fix: `RequirePermission` deixa de redirecionar para `/` por default; `HomeRedirect` virou permission-based. (`87fcaa4`)
3. Após o redeploy, `/api/me/permissions` voltava `text/html` (SPA fallback) porque o BFF está em `mcad-bff.tasso.dev.br` e o front chamava path relativo.
   Fix: front deriva origem do BFF via `runtimeConfig.authzApiBaseUrl`. (`7228010`)
4. BFF respondia 503 (`AUTHZ_BASE_URL` não configurada em swarm).
   Fix: variáveis `AUTHZ_BASE_URL/AUTHZ_TIMEOUT_MS/ME_CACHE_TTL_SECONDS` no `docker-stack.yml`. (`b86b2d4`)
5. ecad-authz devolveu permissões em **3 segmentos** (legado); frontend só reconhece 4. Usuários caíam em "Acesso negado".
   Fix temporário: BFF normaliza 3→4 segmentos antes de devolver ao front. (`654347d`)
6. Usuário com só `authz:admin:*` não conseguia acessar nem o módulo de Autorização: `/autorizacao/*` e o Sidebar estavam gateados por perms de cadastro/identificacao/arrecadacao (TODO esquecido).
   Fix: `AUTHZ_ADMIN_PERMISSIONS` + fallback no `HomeRedirect`. (`5442a2e`)

---

## 2. O que falta — checklist de encerramento

### 2.1 Re-seedar o ecad-authz com chaves 4-segmentos
**Status:** pendente. **Bloqueante para limpar o shim do BFF.**

O catálogo do ecad-authz em produção ainda tem `cadastro:obra:listar` (3 segmentos), e por isso o BFF está com o normalizer. Re-seedar resolve.

**O que o seed faz** (idempotente, `POST /v1/permission-catalog/register`):
- Registra 41 permissões `cadastro:default:*`
- Registra 20 permissões `identificacao:default:*`
- Registra 17 permissões `arrecadacao:default:*`
- Cria 6 papéis: `{cadastro,identificacao,arrecadacao}.default.{consultor,analista}`
- Atribui papéis aos usuários de teste `consultor.dev`, `analista.dev`

**O que o seed NÃO faz:**
- Não cria usuários (eles devem existir no ecad-authz, sincronizados do Logto)
- Não reatribui usuários reais (tsgomes, t3crjdamuir4, etc.)
- Não remove/depreca as permissões legadas em 3-segmentos

### 2.2 Reatribuir usuários reais aos novos papéis
**Status:** pendente. **Bloqueante para os usuários reais voltarem a ter acesso normal.**

Usuários como `tsgomes` hoje têm permissões 3-seg assignadas individualmente no ecad-authz. Precisam:
1. Remover assignments antigos.
2. Atribuir o novo papel (`cadastro.default.analista`, etc.).

Pode ser via API ou pela admin UI em `https://mcad.tasso.dev.br/autorizacao/papeis`.

### 2.3 (Opcional) Depreciar permissões 3-segmentos antigas
**Status:** pendente. **Não bloqueia nada.**

`PATCH /v1/permissions/{id}/deprecate` em cada permissão legada para sinalizar que não devem mais ser usadas. Mantém o catálogo limpo.

### 2.4 Remover o normalizer do BFF
**Status:** pendente. **Bloqueado por 2.1 + 2.2.**

Depois que todos os usuários receberem permissões 4-seg do ecad-authz, o `normalizePermissionKey` em `services/bff/src/meRoutes.ts` vira no-op. Pode deletar (junto com o teste correspondente em `server.test.ts`) e remover o comentário/TODO.

### 2.5 (Futuro, não escopo desta migração) Distribuição
**Status:** dependente do serviço existir. **Fora do escopo de encerramento desta atividade.**

Quando `distribuicao-api` for criada:
- `DistribuicaoPermissions.cs` no padrão 4-seg
- `RequirePermission` nos endpoints
- `seeds/mcad/distribuicao.permissions.json`
- Substituir `hasRole('analista-distribuicao')` em `frontend/src/features/distribuicao/processos/pages/ProcessoCalculoPage.tsx` (TODO Fase F já marcado)
- Remover `hasRole` deprecated em `frontend/src/shared/auth/AuthContext.tsx`

---

## 3. Divisão de tarefas

### O que **Claude** pode fazer

| Item | Como | Pré-condição |
|---|---|---|
| Push dos 6 commits para `origin/main` | `git push origin main` | Você autorizar explicitamente |
| Dry-run do seed | `./scripts/seed-authz.sh --dry-run` | `.env` com `AUTHZ_BASE_URL` e `AUTHZ_ADMIN_TOKEN` |
| Aplicar o seed (item 2.1) | `./scripts/seed-authz.sh` | Você autorizar; `.env` configurado |
| Validar via curl que as 4-seg foram registradas | `curl https://mcad-authz.tasso.dev.br/v1/permissions?domain=cadastro` | seed aplicado |
| Reatribuir usuário X ao papel Y (item 2.2) | `POST/DELETE /v1/users/{id}/roles` via curl | Você me dizer: "tsgomes vira `cadastro.default.analista`" |
| Depreciar 3-seg antigos (item 2.3) | `PATCH /v1/permissions/{id}/deprecate` em lote | seed aplicado e usuários migrados |
| Remover normalizer do BFF (item 2.4) | Edit em `meRoutes.ts` + `server.test.ts` + commit | Itens 2.1 e 2.2 finalizados; ambiente confirmado 100% 4-seg |
| Testar via Playwright com `tsgomes` e `t3crjdamuir4` | `playwright-cli` com `https://mcad.tasso.dev.br` | redeploy concluído |
| Documentar tudo no `relatorio-final.md` | escrever direto no arquivo | item executado |

### O que **Tasso** precisa fazer

| Item | Por quê |
|---|---|
| `git push origin main` (ou autorizar Claude a fazer) | Política: não faço push sem ok explícito |
| Garantir `AUTHZ_ADMIN_TOKEN` no `.env` ou env var da sessão | Token administrativo é credencial sensível; preciso de você na cabine |
| Decidir quem (Logto sub) recebe qual papel mcad | Decisão de produto/negócio, não mecânica. Ex.: `tsgomes` → `cadastro.default.analista` mais `authz.default.admin`? |
| Redeploy do BFF e Frontend depois dos commits subirem | CI / Portainer / `docker stack deploy` |
| Aprovar exclusão do normalizer (item 2.4) | Depende de você confirmar que todos os usuários estão em 4-seg |

---

## 4. Como retomar amanhã

1. **Eu leio este arquivo** (`docs/migracao-authz/proximos-passos.md`) para reconstruir contexto.
2. **Você confirma:** "ok, vamos começar — pode rodar o dry-run do seed" (ou similar).
3. **Eu rodo** `./scripts/seed-authz.sh --dry-run` e te mostro o que ele vai fazer.
4. **Você aprova** e eu rodo o seed real (item 2.1).
5. **Você me passa** o mapeamento usuário → papel para os usuários reais.
6. **Eu reatribuo** via API (item 2.2) e valido com Playwright.
7. **Eu removo** o normalizer do BFF (item 2.4) e commit.
8. **Você redeploya** o BFF; eu valido fim-a-fim.
9. **Eu fecho** o `relatorio-final.md` marcando a migração 100% concluída.

Estimativa: 30–45 min, contando os redeploys.

---

## 5. Cenário-base (para validação rápida amanhã)

Após o item 2.1 + 2.2 + 2.4 estarem prontos, devemos ver:

### Usuário `tsgomes` (ex-`cadastro.obras.analista` no Logto)
- Login → `/cadastro/associacoes`
- Sidebar: **Cadastro**, **Copiloto** (e Auditoria se reatribuído com perms de histórico)
- Permissões retornadas por `/api/me/permissions`: lista 4-seg vinda direto do ecad-authz (normalizer no-op ou removido)

### Usuário `t3crjdamuir4` (admin de authz)
- Login → `/autorizacao/papeis` (via `HomeRedirect.DOMAIN_LANDING` fallback)
- Sidebar: **Autorização**, **Auditoria** (via `authz:admin:audit:visualizar`)
- Demais grupos ocultos

### Logs do BFF
- Sem ECONNREFUSED, sem 503 em `/api/me/*`
- 200 com payload JSON contendo array de permissões 4-seg

---

## 6. Riscos conhecidos

| Risco | Mitigação |
|---|---|
| Seed encontrar usuários que não existem no ecad-authz | Script já trata: faz `GET /v1/users?q=email`; se não achar, loga `⚠️` e pula. |
| Papéis duplicados (se já existir `cadastro.default.consultor` com mesma key) | `POST /v1/roles` é idempotente por chave; se existir, retorna o existente e o script segue. Vale confirmar isso lendo o `seed-authz.sh` antes. |
| Usuários reais perderem acesso temporariamente durante 2.2 | Fazer as reatribuições sem remover o papel antigo até o novo estar atribuído. |
| Normalizer removido cedo demais → algum usuário com 3-seg fica sem acesso | Antes de remover, listar `GET /v1/permissions?status=ACTIVE` e confirmar zero permissões 3-seg ativas. |
| Token admin (`AUTHZ_ADMIN_TOKEN`) expirar | Gerar novo antes do dry-run. |

---

## 7. Comandos úteis (cheat-sheet)

```bash
# Estado da branch
git log --oneline origin/main..HEAD

# Health da plataforma
curl -s https://mcad-authz.tasso.dev.br/v1/health | jq

# Listar permissões registradas (após o seed)
curl -sH "Authorization: Bearer $AUTHZ_ADMIN_TOKEN" \
  "https://mcad-authz.tasso.dev.br/v1/permissions?domain=cadastro&size=200" | jq '.content | length'

# Achar usuário pelo email
curl -sH "Authorization: Bearer $AUTHZ_ADMIN_TOKEN" \
  "https://mcad-authz.tasso.dev.br/v1/users?q=tasso.gomes@tasso.dev.br" | jq

# Ver papéis atribuídos a um usuário
curl -sH "Authorization: Bearer $AUTHZ_ADMIN_TOKEN" \
  "https://mcad-authz.tasso.dev.br/v1/users/{userId}/roles" | jq

# Dry-run do seed
./scripts/seed-authz.sh --dry-run

# Aplicar só catálogos (sem mexer em papéis/atribuições)
./scripts/seed-authz.sh --skip-roles --skip-assignments

# Forçar revalidação do cache do BFF (não tem endpoint; basta esperar TTL ou redeploy)
```

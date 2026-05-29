---
status: completed
parallelizable: false
blocked_by: [6.0, 7.0]
---

<task_context>
<domain>engine/docs/finalization</domain>
<type>documentation</type>
<scope>configuration</scope>
<complexity>low</complexity>
<dependencies>none</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 8.0: Atualizar documentação (ADR README, relatorio-final.md) e specs E2E opcionais

## Relacionada às User Stories

- [US-07] Desenvolvedor mcad (framework replicável documentado) — cobertura direta

## Visão Geral

Encerramento da entrega: atualizar o índice de ADRs com as 4 novas entradas (0006-0009), adicionar nota no `relatorio-final.md` da migração authz indicando que o catálogo built-in foi formalizado, e — se a infraestrutura E2E do `finalizar-integracao-authz` estiver em vigor — adicionar specs Playwright para os fluxos críticos do Gerente e Gestor de Acessos.

## Requisitos

- `docs/adr/README.md` lista as 4 novas ADRs com link e resumo de 1 linha.
- `docs/migracao-authz/relatorio-final.md` ganha uma seção "Catálogo built-in formalizado em 2026-MM-DD" com link para o PRD.
- (Opcional) Specs Playwright em `tooling/e2e/tests/` se a tooling existir nesta versão da codebase.
- Confirmar que ADRs 0006-0009 estão com status `Accepted`.

## Arquivos Envolvidos

- **Modificar:**
  - `docs/adr/README.md`
  - `docs/migracao-authz/relatorio-final.md`
- **Criar (opcional, condicional):**
  - `tooling/e2e/tests/11-gerente-historico.spec.ts`
  - `tooling/e2e/tests/12-gestor-acessos.spec.ts`
- **Referência:**
  - `tasks/plataforma/prd-perfis-builtin-rbac/prd.md`
  - `tasks/plataforma/prd-perfis-builtin-rbac/techspec.md`
  - `docs/adr/0006-perfis-built-in-rbac.md` (e 0007, 0008, 0009)
  - `tooling/e2e/tests/` (modelo de specs Playwright, se existirem)
- **Skills para consultar:**
  - `[stack]-production-readiness` — checklist de docs antes de declarar entrega

## Subtarefas

- [ ] 8.1 Atualizar `docs/adr/README.md` com 4 novas entradas
- [ ] 8.2 Atualizar `docs/migracao-authz/relatorio-final.md` com seção "Catálogo built-in (2026-05-MM)"
- [ ] 8.3 Verificar se `tooling/e2e/` existe e tem `playwright.config.ts`; se sim, adicionar specs (8.4-8.5); se não, registrar follow-up como Questão em Aberto
- [ ] 8.4 [Condicional] Spec `11-gerente-historico.spec.ts`: `gerente.dev` abre processo, vê aba Histórico, valida pelo menos 1 evento; `analista.dev` não vê a aba
- [ ] 8.5 [Condicional] Spec `12-gestor-acessos.spec.ts`: `gestor-acessos.dev` atribui novo papel a `consultor.dev`, lista mostra a atribuição, remove em seguida
- [ ] 8.6 Confirmar status `Accepted` em todos os 4 ADRs (0006-0009)
- [ ] 8.7 Validação final: rodar todos os testes de cada serviço/módulo afetado e garantir verde

## Sequenciamento

- Bloqueado por: 6.0 (frontend Acessos) e 7.0 (frontend Histórico) — ambos precisam estar funcionais para E2E e para o relatório indicar "entregue"
- Desbloqueia: nada (encerramento)
- Paralelizável: Não (dependente de tudo)

## Rastreabilidade

- Esta tarefa cobre: RF-08 (governança documentada), US-07 (framework documentado para replicação)
- Evidência esperada: índice de ADR atualizado, relatório com seção; opcionalmente specs E2E verdes

## Detalhes de Implementação

### `docs/adr/README.md` — entradas a adicionar

```markdown
- [ADR 0006 — Catálogo Canônico de Perfis Built-in (Framework RBAC)](0006-perfis-built-in-rbac.md)
  - Estrutura de 4 níveis por domínio com Gerente/Analista segregados; taxonomia de 5 categorias incluindo Trilha de Auditoria.
- [ADR 0007 — Domínio Transversal `acessos` Segregado](0007-dominio-acessos-segregado.md)
  - Perfis Gestor de Acessos e Consultor de Acessos separados do super-admin de plataforma.
- [ADR 0008 — BFF como Gateway de Operações Cross-cutting](0008-bff-gateway-cross-cutting.md)
  - Filtro escopado de assignments + proxy de timeline de auditoria centralizados no BFF.
- [ADR 0009 — Mascaramento Server-Side de CPF via Permission-Aware Mapper](0009-cpf-masking-permission-aware-mapper.md)
  - `ICurrentUserPermissions` + `DocumentoMasking` em Cadastro; carve-out controlado em Cadastro.
```

### `docs/migracao-authz/relatorio-final.md` — seção a adicionar

```markdown
## Catálogo built-in formalizado (2026-05-MM)

Após a estabilização da migração para `ecad-authz` (concluída em 2026-05-15), o catálogo de perfis built-in foi formalizado:

- Framework canônico documentado nos ADRs 0006-0009.
- PRD em `tasks/plataforma/prd-perfis-builtin-rbac/prd.md`.
- TechSpec em `tasks/plataforma/prd-perfis-builtin-rbac/techspec.md`.
- Estrutura de 4 níveis por domínio de negócio (Consultor, Operador, Gerente, Analista) + novo domínio transversal `acessos` (Gestor e Consultor).
- Piloto em Distribuição entregue; mascaramento server-side de CPF em Cadastro implementado como carve-out controlado.
- Próximos passos: aplicar o framework em Cadastro, Identificação e Arrecadação (PRDs próprios).
```

### Spec opcional `11-gerente-historico.spec.ts` (esqueleto)

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from '../utils/loginAs';

test.describe('Histórico de Alterações — Gerente', () => {
  test('gerente vê aba histórico com eventos', async ({ page }) => {
    await loginAs(page, 'gerente.dev');
    await page.goto('/distribuicao/processos');
    await page.getByRole('link', { name: /^[A-Z]+ — \d{4}-\d{2}$/ }).first().click();
    await expect(page.getByRole('tab', { name: /histórico/i })).toBeVisible();
    await page.getByRole('tab', { name: /histórico/i }).click();
    await expect(page.locator('[data-event-type]').first()).toBeVisible({ timeout: 5_000 });
  });

  test('analista não vê aba histórico', async ({ page }) => {
    await loginAs(page, 'analista.dev');
    await page.goto('/distribuicao/processos');
    await page.getByRole('link', { name: /^[A-Z]+ — \d{4}-\d{2}$/ }).first().click();
    await expect(page.getByRole('tab', { name: /histórico/i })).not.toBeVisible();
  });
});
```

**Convenções da stack (das skills consultadas):**

- Markdown em pt-BR conforme padrão do projeto
- Specs Playwright seguindo o modelo de `ecad-authz/tooling/e2e/tests/` (Auditoria/Authz já têm padrão)
- Datar entradas com formato `YYYY-MM-DD`

## Critérios de Sucesso (Verificáveis)

- [ ] `grep -c "0006-perfis-built-in-rbac" docs/adr/README.md` retorna ≥ 1
- [ ] `grep -c "Catálogo built-in formalizado" docs/migracao-authz/relatorio-final.md` retorna ≥ 1
- [ ] `grep "Status:.*Accepted" docs/adr/0006-perfis-built-in-rbac.md` retorna match (idem 0007, 0008, 0009)
- [ ] [Condicional] Specs E2E rodam: `cd tooling/e2e && pnpm playwright test 11-gerente-historico 12-gestor-acessos` verdes
- [ ] Suíte completa do mcad verde:
  - `cd services/cadastro-api && dotnet test`
  - `cd services/distribuicao-api && mvn test`
  - `cd services/bff && npm test`
  - `cd frontend && npm test`
- [ ] PR de fechamento referencia todas as 9 tarefas e os 4 ADRs

---
status: pending
parallelizable: false
blocked_by: ["8.0"]
---

<task_context>
<domain>testing/a11y</domain>
<type>testing</type>
<scope>configuration</scope>
<complexity>low</complexity>
<dependencies>playwright</dependencies>
<unblocks>""</unblocks>
</task_context>

# Tarefa 9.0: A11y baseline — 4 telas críticas com `axe-playwright`

## Relacionada às User Stories

- US-05 — A11y baseline zero violações bloqueantes (cobertura direta)

## Visão Geral

Adicionar varredura `axe-playwright` em 4 telas críticas, reaproveitando o setup Playwright criado na Task 8.0. Tag `@a11y` permite rodar isolado (`pnpm e2e -- --grep @a11y`). Zero violações bloqueantes é critério obrigatório.

## Requisitos

- 4 specs separados (uma por tela)
- Tag `@a11y` no `test.describe` ou `test()` para rodar isolado
- Configuração `axe-playwright` com regras WCAG 2.1 AA
- 0 violações com `impact: 'critical'` ou `impact: 'serious'`
- Relatório de violações `minor`/`moderate` permitido (não falha o build) — capturar como artifact para revisão posterior

## Arquivos Envolvidos

- **Criar:**
  - `mcad/tooling/e2e/tests/a11y/login.a11y.spec.ts` (CT-A11Y-01)
  - `mcad/tooling/e2e/tests/a11y/cadastro-obras.a11y.spec.ts` (CT-A11Y-02)
  - `mcad/tooling/e2e/tests/a11y/autorizacao-papeis.a11y.spec.ts` (CT-A11Y-03)
  - `mcad/tooling/e2e/tests/a11y/auditoria.a11y.spec.ts` (CT-A11Y-04)
  - `mcad/tooling/e2e/utils/a11y.ts` (helper reutilizável que executa axe e filtra violações por impact)
- **Modificar:**
  - `mcad/tooling/e2e/package.json` — adicionar dependência `@axe-core/playwright`
  - `mcad/tooling/e2e/playwright.config.ts` — projeto `a11y` opcional para rodar isolado
- **Referência (modelo):**
  - `ecad-authz/frontend/apps/admin/tests/roles-accessibility.spec.ts`
  - `ecad-authz/tooling/e2e/utils/a11y.ts`
- **Skills para consultar durante implementação:**
  - `react-testing` — Playwright + axe

## Subtarefas

- [ ] 9.1 Instalar `@axe-core/playwright` no workspace E2E
- [ ] 9.2 Criar helper `utils/a11y.ts`: roda `AxeBuilder` com regras WCAG 2.1 AA; filtra violações por impact; gera relatório legível
- [ ] 9.3 Implementar 4 specs (cada usa `loginAs` para chegar na tela autenticada quando necessário)
- [ ] 9.4 Documentar no README do E2E como rodar só a11y e como interpretar o relatório

## Sequenciamento

- Bloqueado por: 8.0 (depende do compose + utils Playwright)
- Desbloqueia: Nenhum
- Paralelizável: Não (depende de 8.0)

## Rastreabilidade

- Cobre: US-05
- Evidência: 4 specs a11y verdes; relatório de violações `minor`/`moderate` publicado

## Detalhes de Implementação

```ts
// utils/a11y.ts
import { Page, expect } from '@playwright/test';
import { AxeBuilder } from '@axe-core/playwright';

export async function expectNoBlockingA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  const blocking = results.violations.filter(v =>
    v.impact === 'critical' || v.impact === 'serious'
  );
  if (blocking.length > 0) {
    console.log('Blocking a11y violations:', JSON.stringify(blocking, null, 2));
  }
  expect(blocking).toHaveLength(0);
}
```

```ts
// tests/a11y/cadastro-obras.a11y.spec.ts
import { test } from '@playwright/test';
import { loginAs } from '../../utils/loginAs';
import { expectNoBlockingA11yViolations } from '../../utils/a11y';

test.describe('@a11y Cadastro Obras', () => {
  test('CT-A11Y-02: tela de Obras sem violações bloqueantes', async ({ page }) => {
    await loginAs(page, 'analista_cadastro.dev');
    await page.goto('/cadastro/obras');
    await page.waitForSelector('table');
    await expectNoBlockingA11yViolations(page);
  });
});
```

**Convenções da stack:**
- Tag `@a11y` em `test.describe` para filtragem
- Considerar pular se o login Logto não estiver acessível (`test.skip` com motivo claro)

## Critérios de Sucesso (Verificáveis)

- [ ] `cd mcad && pnpm --filter @mcad/e2e e2e -- --grep @a11y` retorna 4/4 verdes em ≤ 1 min
- [ ] 0 violações `critical`/`serious` nas 4 telas
- [ ] Relatório de violações `minor`/`moderate` salvo em `tooling/e2e/playwright-report/a11y-report.json` (não bloqueia, mas documentado)
- [ ] README do E2E atualizado com instruções

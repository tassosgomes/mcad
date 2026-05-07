# Invocation Prompt - `cy-sequential-mission`

Use the `cy-sequential-mission` skill for this run.

Execute a sequential mission for the PRD below, processing the task files in the exact order provided.

## Inputs

- PRD directory: `<PRD_DIR>`
- PRD file: `<PRD_DIR>/prd.md`
- Tech spec file: `<PRD_DIR>/techspec.md`
- API contract markdown: `<PRD_DIR>/api-contract.md`
- API contract OpenAPI: `<PRD_DIR>/api-contract.yaml`
- Ordered task files:
  - `<TASK_FILE_1>`
  - `<TASK_FILE_2>`
  - `<TASK_FILE_3>`
- Master task tracker: `<PRD_DIR>/_tasks.md`
- Auto-commit: `enabled|disabled`

## Optional Inputs

- Repository guidance files:
  - `CLAUDE.md`
- Workflow memory directory: `<MEMORY_DIR>`
- Shared workflow memory: `<MEMORY_DIR>/MEMORY.md`
- Current task memory: `<MEMORY_DIR>/task-current.md`

## Execution Rules

1. Execute Fase 0 once for the mission:
   - detect active stack from the task scope
   - resolve and read the relevant stack skills
   - extract architecture rules, folder conventions, and verification commands

2. Execute Fase 1 before editing code:
   - read `prd.md`, `techspec.md`, `api-contract.md`, and `api-contract.yaml`
   - validate consistency between tech spec and OpenAPI contract
   - stop and report if there is any contract divergence
   - map affected layers, modules, interfaces, created files, and modified files for each task
   - detect cross-task conflicts before starting task 1

3. Execute Fase 2 for each task in order:
   - print an Implementation Plan before code changes
   - keep scope limited to the current task
   - update tracking only after implementation and fresh verification
   - if workflow memory paths were provided, use them before editing and before closeout

4. Validate each task in this strict order:
   - build/syntax
   - lint/static quality
   - domain/core unit tests
   - module-scoped tests
   - full regression for the affected stack
   - on failure, self-heal and restart validation from the first step
   - stop after 3 failed retry cycles for the same stage

5. Do not move to the next task if:
   - current task has failing checks
   - current task has unresolved contract drift
   - current task has unresolved architectural violations

6. Execute Fase 3 after the last task:
   - run final verification for every touched stack
   - update `qa_report.md` using the skill template
   - summarize commits, verification evidence, regressions, contract conflicts, and review notes

## Output Expectations

- Show the mission-level stack/rule resolution.
- Show one Implementation Plan per task before edits.
- Show verification evidence for each task and for the final QA pass.
- If blocked, stop immediately and report the exact blocking reason.

## Example

Use the `cy-sequential-mission` skill for this run.

Execute a sequential mission for:

- PRD directory: `tasks/cadastro/prd-gestao-obras`
- PRD file: `tasks/cadastro/prd-gestao-obras/prd.md`
- Tech spec file: `tasks/cadastro/prd-gestao-obras/techspec.md`
- API contract markdown: `tasks/cadastro/prd-gestao-obras/api-contract.md`
- API contract OpenAPI: `tasks/cadastro/prd-gestao-obras/api-contract.yaml`
- Ordered task files:
  - `tasks/cadastro/prd-gestao-obras/tasks/01_alguma_task.md`
  - `tasks/cadastro/prd-gestao-obras/tasks/02_outra_task.md`
- Master task tracker: `tasks/cadastro/prd-gestao-obras/_tasks.md`
- Auto-commit: `disabled`

Follow the skill exactly. Stop on contract divergence or unresolved per-task verification failure.
